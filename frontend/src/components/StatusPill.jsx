const styles = {
  Posted:   "bg-slate-100 text-slate-700 border-slate-200",
  Matched:  "bg-indigo-50 text-indigo-700 border-indigo-200",
  Verified: "bg-amber-50 text-amber-700 border-amber-200",
  Returned: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Removed:  "bg-red-50 text-red-700 border-red-200",
};

export default function StatusPill({ status = "Posted" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.Posted}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}