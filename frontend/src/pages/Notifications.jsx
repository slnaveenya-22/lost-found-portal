import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Matches", value: "Match" },
  { label: "Claims", value: "Claim" },
];

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  // ── Redirect guests ─────────────────────────────────────────
  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  // ── Fetch notifications ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const controller = new AbortController();

    async function fetchNotifications() {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(
          "http://localhost:5000/api/notifications",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            signal: controller.signal,
          }
        );
        if (!cancelled) {
          setNotifications(res.data.items || res.data.notifications || []);
        }
      } catch (err) {
        if (axios.isCancel(err) || cancelled) return;
        // Endpoint doesn't exist yet → treat as empty, not an error
        if (err.response?.status === 404) {
          setNotifications([]);
        } else {
          setError(
            err.response?.data?.error || "Couldn't load notifications."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNotifications();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user]);

  // ── Derived: filter + unread count ──────────────────────────
  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.is_read);
    // Match / Claim prefix filters
    return notifications.filter((n) => n.type?.startsWith(filter));
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Actions ─────────────────────────────────────────────────
  const markAsRead = async (id) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.is_read) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    try {
      await axios.patch(
        `http://localhost:5000/api/notifications/${id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch {
      // Roll back on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);

    const snapshot = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await axios.patch(
        "http://localhost:5000/api/notifications/read-all",
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch {
      setNotifications(snapshot);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleOpen = (n) => {
    markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
              : "You're all caught up."}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={markAllAsRead}
            disabled={markingAll}
          >
            {markingAll ? "Marking…" : "✓ Mark all as read"}
          </Button>
        )}
      </div>

      {/* ── Filter tabs ────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${
                  active
                    ? "bg-brand-primary text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              {f.label}
              {f.value === "unread" && unreadCount > 0 && (
                <span
                  className={`ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px]
                    rounded-full text-[10px] font-semibold px-1
                    ${active ? "bg-white/20 text-white" : "bg-brand-accent text-white"}`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      {/* ── List ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading && <ListSkeleton />}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={filter === "unread" ? "✨" : "🔔"}
            title={
              filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"
            }
            message={
              filter === "unread"
                ? "You've read everything. Nice work."
                : "When someone claims your item, or a match is found, you'll see it here."
            }
            action={
              filter !== "all" ? (
                <Button variant="secondary" size="sm" onClick={() => setFilter("all")}>
                  View all
                </Button>
              ) : (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => navigate("/report-lost")}
                >
                  Report an item
                </Button>
              )
            }
          />
        )}

        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {filtered.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onOpen={() => handleOpen(n)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ── Footer note ────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Notifications older than 30 days are removed automatically.
        </p>
      )}
    </div>
  );
}

/* ═══════════════ Sub-components ═══════════════ */

function NotificationRow({ notification, onOpen }) {
  const { type, message, is_read, created_at } = notification;
  const meta = notificationMeta(type);

  return (
    <li>
      <button
        onClick={onOpen}
        className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-colors
          hover:bg-slate-50
          ${!is_read ? "bg-brand-accent-soft/40" : ""}`}
      >
        {/* Icon */}
        <span
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0
            ${meta.tone}`}
        >
          {meta.icon}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p
              className={`text-sm leading-snug ${
                is_read ? "text-slate-600" : "text-slate-900 font-medium"
              }`}
            >
              {message || meta.fallback}
            </p>

            {!is_read && (
              <span
                className="w-2 h-2 rounded-full bg-brand-accent shrink-0 mt-1.5"
                aria-label="Unread"
              />
            )}
          </div>

          <div className="mt-1 flex items-center gap-3">
            <span className="text-xs text-slate-400 capitalize">
              {meta.label}
            </span>
            {created_at && (
              <>
                <span className="text-slate-200">·</span>
                <span className="text-xs text-slate-400">
                  {timeAgo(created_at)}
                </span>
              </>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

function notificationMeta(type) {
  const t = type || "";
  if (t.startsWith("Match"))
    return {
      icon: "🎯",
      label: "Match",
      tone: "bg-indigo-100 text-indigo-600",
      fallback: "A possible match was found for one of your items.",
    };
  if (t === "ClaimSubmitted")
    return {
      icon: "📨",
      label: "Claim submitted",
      tone: "bg-amber-100 text-amber-600",
      fallback: "Someone raised a claim on your found item.",
    };
  if (t === "ClaimApproved")
    return {
      icon: "✅",
      label: "Claim approved",
      tone: "bg-emerald-100 text-emerald-600",
      fallback: "Your claim was approved.",
    };
  if (t === "ClaimRejected")
    return {
      icon: "❌",
      label: "Claim rejected",
      tone: "bg-red-100 text-red-600",
      fallback: "Your claim was rejected.",
    };
  if (t === "ItemReturned")
    return {
      icon: "🎉",
      label: "Returned",
      tone: "bg-emerald-100 text-emerald-600",
      fallback: "An item was marked as returned.",
    };
  return {
    icon: "🔔",
    label: "Notification",
    tone: "bg-slate-100 text-slate-600",
    fallback: "You have a new notification.",
  };
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 px-5 py-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3.5 w-3/4 bg-slate-200 rounded" />
            <div className="h-3 w-1/4 bg-slate-100 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ═══════════════ Utilities ═══════════════ */

function timeAgo(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}