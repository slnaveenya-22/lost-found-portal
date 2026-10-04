import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Button from "../components/Button";
import StatusPill from "../components/StatusPill";
import TypeBadge from "../components/TypeBadge";
import ItemCard from "../components/ItemCard";
import EmptyState from "../components/EmptyState";

const STATUS_OPTIONS = ["Posted", "Matched", "Verified", "Returned", "Removed"];

export default function ItemDetail() {
  const { type, reportId } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const isGuest = !user;
  const isOwner = user && item && Number(item.user_id) === Number(user.id);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function fetchItem() {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(
          `http://localhost:5000/api/items/detail/${type}/${reportId}`,
          { signal: controller.signal }
        );
        if (cancelled) return;
        const data = res.data.item || res.data;
        setItem(data);

        try {
          const simRes = await axios.get(
            "http://localhost:5000/api/matches/suggestions",
            {
              params: { type, report_id: reportId },
              signal: controller.signal,
            }
          );
          if (!cancelled) {
            setSimilar(simRes.data.items || simRes.data || []);
          }
        } catch {
          /* not built yet — fine */
        }
      } catch (err) {
        if (axios.isCancel(err) || cancelled) return;
        if (err.response?.status === 404) {
          setError("not-found");
        } else {
          setError(
            err.response?.data?.error || "Couldn't load this item."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchItem();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [type, reportId]);

  const handleStatusChange = async (newStatus) => {
    if (!newStatus || newStatus === item.status) return;
    setStatusUpdating(true);
    try {
      await axios.patch(
        `http://localhost:5000/api/items/${type}/${reportId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setItem({ ...item, status: newStatus });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) return <DetailSkeleton />;

  if (error === "not-found") {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon="🔎"
          title="Item not found"
          message={`We couldn't find a ${type} item with ID ${reportId}. It may have been removed.`}
          action={
            <Button
              variant="primary"
              onClick={() => navigate(`/browse/${type}`)}
            >
              Back to {type === "lost" ? "Lost" : "Found"} Items
            </Button>
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={() => navigate(`/browse/${type}`)}
        >
          Back to browse
        </Button>
      </div>
    );
  }

  if (!item) return null;

  const imageUrl = item.image_url
    ? `http://localhost:5000${item.image_url}`
    : null;

  return (
    <div className="max-w-7xl mx-auto">
      <nav className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <Link to={`/browse/${type}`} className="hover:text-brand-accent">
          {type === "lost" ? "Lost Items" : "Found Items"}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium truncate">
          {item.item_name}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="relative aspect-video bg-slate-100">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item.item_name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl text-slate-300">
                  📦
                </div>
              )}
              <div className="absolute top-3 left-3">
                <TypeBadge type={type} />
              </div>
              <div className="absolute top-3 right-3">
                <StatusPill status={item.status} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {item.item_name}
            </h1>
            <p className="mt-1 text-sm text-slate-500 font-mono">
              Report ID: {item.report_id}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
              <MetaRow icon="🏷" label="Category" value={item.category} />
              <MetaRow icon="🎨" label="Color" value={item.color} />
              <MetaRow icon="🏭" label="Brand" value={item.brand} />
              <MetaRow
                icon="📍"
                label={type === "lost" ? "Lost at" : "Found at"}
                value={item.location}
              />
              <MetaRow
                icon="🕒"
                label={type === "lost" ? "Lost on" : "Found on"}
                value={formatDate(item.date_time)}
              />
              <MetaRow
                icon="📅"
                label="Reported"
                value={formatDate(item.created_at)}
              />
            </dl>
          </div>

          {item.description && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-2">
                Description
              </h2>
              <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed break-words">
                {item.description}
              </p>
            </div>
          )}

          {isOwner && type === "found" && item.private_verification_detail && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔒</span>
                <div>
                  <h2 className="text-sm font-semibold text-amber-900">
                    Private verification detail
                  </h2>
                  <p className="mt-1 text-xs text-amber-800">
                    Only you (the reporter) can see this. Use it to confirm
                    someone claiming this item is the real owner.
                  </p>
                  <p className="mt-3 text-sm text-amber-900 whitespace-pre-line font-medium">
                    {item.private_verification_detail}
                  </p>
                </div>
              </div>
            </div>
          )}

          {similar.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Similar {type === "lost" ? "found" : "lost"} items
                </h2>
                <span className="text-xs text-slate-400">Suggestions</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {similar.slice(0, 4).map((s) => (
                  <ItemCard
                    key={s.report_id}
                    item={{ ...s, type: type === "lost" ? "found" : "lost" }}
                    onClick={() =>
                      navigate(
                        `/items/${type === "lost" ? "found" : "lost"}/${s.report_id}`
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:col-span-1 mt-6 lg:mt-0">
          <div className="lg:sticky lg:top-4 space-y-4">
            <ActionPanel
              type={type}
              item={item}
              isGuest={isGuest}
              isOwner={isOwner}
              isAdmin={isAdmin}
              statusUpdating={statusUpdating}
              onStatusChange={handleStatusChange}
              navigate={navigate}
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-700">Safety tip:</strong> Meet
                in a public campus location when returning or claiming an item.
                Never share personal financial details.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetaRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
        <span>{icon}</span>
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800 break-words">
        {value}
      </dd>
    </div>
  );
}

function ActionPanel({
  type,
  item,
  isGuest,
  isOwner,
  isAdmin,
  statusUpdating,
  onStatusChange,
  navigate,
}) {
  if (isGuest) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-900">
          {type === "found" ? "Think this is yours?" : "Did you find this?"}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Log in to raise a claim or contact the reporter.
        </p>
        <Button
          variant="accent"
          className="w-full mt-4"
          onClick={() => navigate("/login")}
        >
          Log in to continue
        </Button>
        <Button
          variant="secondary"
          className="w-full mt-2"
          onClick={() => navigate("/register")}
        >
          Create an account
        </Button>
      </div>
    );
  }

  if (isOwner) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-900">
          Your report
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          You reported this item.
        </p>
        <Button variant="primary" className="w-full mt-4">
          ✏️ Edit listing
        </Button>
        <Button variant="secondary" className="w-full mt-2">
          🗑 Mark as removed
        </Button>
        {type === "found" && (
          <Button variant="ghost" className="w-full mt-2">
            📋 View claims
          </Button>
        )}
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-900">
          Admin actions
        </h3>
        <p className="mt-1 text-xs text-slate-500 mb-4">
          Update the item's status.
        </p>
        <select
          value={item.status}
          disabled={statusUpdating}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {statusUpdating && (
          <p className="mt-2 text-xs text-slate-400">Updating…</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-slate-900">
        {type === "found" ? "Think this is yours?" : "Did you find this?"}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        {type === "found"
          ? "Raise a claim and provide proof of ownership. The reporter will review it."
          : "Contact the reporter to let them know you found it."}
      </p>
      <Button variant="accent" className="w-full mt-4">
        {type === "found" ? "🔓 Raise a claim" : "📨 Contact reporter"}
      </Button>
      <Button variant="secondary" className="w-full mt-2">
        💬 Send message
      </Button>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto animate-pulse">
      <div className="h-4 w-48 bg-slate-200 rounded mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video bg-slate-200 rounded-xl" />
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="h-7 w-2/3 bg-slate-200 rounded" />
            <div className="h-4 w-40 bg-slate-100 rounded" />
            <div className="grid grid-cols-2 gap-4 pt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-10 w-full bg-slate-200 rounded-lg mt-4" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}