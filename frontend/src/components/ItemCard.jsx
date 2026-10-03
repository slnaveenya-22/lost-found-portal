import StatusPill from "./StatusPill";
import TypeBadge from "./TypeBadge";

export default function ItemCard({ item, onClick }) {
  const img = item.image_url
    ? `http://localhost:5000${item.image_url}`
    : null;

  return (
    <article
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white overflow-hidden
        transition-all hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {img ? (
          <img src={img} alt={item.item_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">
            📦
          </div>
        )}
        <div className="absolute top-2 left-2"><TypeBadge type={item.type} /></div>
        <div className="absolute top-2 right-2"><StatusPill status={item.status} /></div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 truncate">{item.item_name}</h3>
        <p className="mt-1 text-xs text-slate-500 truncate">
          🏷 {item.category} · 📍 {item.location}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          🕒 {new Date(item.date_time).toLocaleDateString()}
        </p>
      </div>
    </article>
  );
}