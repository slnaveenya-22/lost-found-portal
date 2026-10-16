/**
 * Vertical timeline of status changes for an item.
 * Props:
 *   history — array from GET /api/items/:type/:reportId/history
 *   loading — bool
 */
export default function StatusTimeline({ history = [], loading = false }) {
  if (loading) return <TimelineSkeleton />;

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Timeline</h2>
        <p className="text-sm text-slate-500">No changes yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-900 mb-5">Timeline</h2>

      <ol className="relative space-y-5">
        {history.map((entry, i) => (
          <TimelineRow
            key={entry.id ?? `synthetic-${i}`}
            entry={entry}
            isLast={i === history.length - 1}
          />
        ))}
      </ol>
    </div>
  );
}

function TimelineRow({ entry, isLast }) {
  const { old_status, new_status, actor_role, changed_at } = entry;
  const meta = statusMeta(new_status);

  return (
    <li className="relative pl-8">
      {!isLast && (
        <span
          className="absolute left-[11px] top-6 bottom-[-20px] w-px bg-slate-200"
          aria-hidden="true"
        />
      )}

      <span
        className={`absolute left-0 top-1 w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm ${meta.dot}`}
      >
        {meta.icon}
      </span>

      <div>
        <p className="text-sm text-slate-800">
          <span className="font-medium">{meta.verb}</span>{" "}
          <span className="text-slate-500">by</span>{" "}
          <span className="font-medium">{actorLabel(actor_role)}</span>
        </p>
        {old_status && old_status !== new_status && (
          <p className="mt-0.5 text-xs text-slate-500">
            {old_status} → {new_status}
          </p>
        )}
        <p
          className="mt-1 text-xs text-slate-400"
          title={formatAbsolute(changed_at)}
        >
          {timeAgo(changed_at)}
        </p>
      </div>
    </li>
  );
}

function TimelineSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 animate-pulse">
      <div className="h-4 w-20 bg-slate-200 rounded mb-5" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="relative pl-8 mb-5">
          <span className="absolute left-0 top-1 w-[22px] h-[22px] rounded-full bg-slate-200" />
          <div className="h-3.5 w-1/2 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-1/3 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────── */

function statusMeta(status) {
  switch (status) {
    case 'Matched':
      return { verb: 'Match suggested', dot: 'bg-indigo-100 text-indigo-700', icon: '◎' };
    case 'Verified':
      return { verb: 'Marked as verified', dot: 'bg-amber-100 text-amber-700', icon: '✓' };
    case 'Returned':
      return { verb: 'Marked as returned', dot: 'bg-emerald-100 text-emerald-700', icon: '↩' };
    case 'Removed':
      return { verb: 'Removed', dot: 'bg-red-100 text-red-700', icon: '✕' };
    case 'Posted':
    default:
      return { verb: 'Reported', dot: 'bg-slate-100 text-slate-700', icon: '•' };
  }
}

function actorLabel(role) {
  switch (role) {
    case 'admin':   return 'admin';
    case 'student': return 'you';
    case 'staff':   return 'staff';
    case 'system':  return 'the system';
    default:        return role || 'someone';
  }
}

function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatAbsolute(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium', timeStyle: 'short',
    });
  } catch {
    return value;
  }
}