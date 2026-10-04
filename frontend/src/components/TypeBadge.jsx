export default function TypeBadge({ type }) {
  const isLost = type === "lost";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide border
        ${isLost
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
    >
      {isLost ? "LOST" : "FOUND"}
    </span>
  );
}