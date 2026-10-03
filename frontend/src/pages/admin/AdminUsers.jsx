import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";

const ROLE_OPTIONS = ["student", "staff", "admin"];

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const me = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!me) return navigate("/login", { replace: true });
    if (me.role !== "admin") return navigate("/browse/lost", { replace: true });
  }, [me, navigate]);

  useEffect(() => {
    if (!me || me.role !== "admin") return;
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (keyword.trim()) params.q = keyword.trim();
        if (roleFilter !== "all") params.role = roleFilter;

        const res = await axios.get("http://localhost:5000/api/admin/users", {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          signal: controller.signal,
        });
        if (!cancelled) setUsers(res.data.items || res.data.users || []);
      } catch (err) {
        if (axios.isCancel(err) || cancelled) return;
        if (err.response?.status === 404) setUsers([]);
        else setError(err.response?.data?.error || "Couldn't load users.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const t = setTimeout(load, 250);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
    };
  }, [me, keyword, roleFilter]);

  const changeRole = async (user, role) => {
    if (role === user.role) return;
    if (
      !window.confirm(
        `Change ${user.name}'s role from "${user.role}" to "${role}"?`
      )
    )
      return;

    setBusyId(user.id);
    const snapshot = users;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role } : u))
    );

    try {
      await axios.patch(
        `http://localhost:5000/api/admin/users/${user.id}/role`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (err) {
      setUsers(snapshot);
      alert(err.response?.data?.error || "Failed to change role.");
    } finally {
      setBusyId(null);
    }
  };

  if (!me || me.role !== "admin") return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Users
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage roles and permissions.
        </p>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search name or email…"
          className="w-full sm:max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
        />
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
          {["all", ...ROLE_OPTIONS].map((r) => {
            const active = roleFilter === r;
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors
                  ${
                    active
                      ? "bg-brand-primary text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading && <TableSkeleton />}

        {!loading && users.length === 0 && (
          <EmptyState
            icon="👥"
            title="No users found"
            message="Try a different search or role filter."
          />
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === me.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center font-semibold text-sm">
                            {u.name?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {u.name}{" "}
                              {isSelf && (
                                <span className="text-xs text-slate-400 font-normal">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={u.role}
                          disabled={isSelf || busyId === u.id}
                          onChange={(e) => changeRole(u, e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs
                            focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent
                            disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            isSelf
                              ? "You can't change your own role"
                              : "Change role"
                          }
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    admin: "bg-brand-accent-soft text-brand-primary border-brand-accent/30",
    staff: "bg-indigo-50 text-indigo-700 border-indigo-200",
    student: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border capitalize
        ${styles[role] || styles.student}`}
    >
      {role}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 bg-slate-200 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
          </div>
          <div className="h-6 w-20 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}