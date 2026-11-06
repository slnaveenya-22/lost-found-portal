import StatusPill from "./StatusPill";
import TypeBadge from "./TypeBadge";

export default function ItemCard({ item, onClick, currentUser }) {
  const img = item.image_url ? `http://localhost:5000${item.image_url}` : null;
  
  // Massive Color Distinction
  const isLost = item.type === "lost";
  const theme = isLost 
    ? "border-t-4 border-t-rose-500 border-x border-b border-slate-200 bg-rose-50/20" 
    : "border-t-4 border-t-emerald-500 border-x border-b border-slate-200 bg-emerald-50/20";

  const isOwner = currentUser && Number(item.user_id) === Number(currentUser.id);

  return (
    <article
      onClick={onClick}
      className={`group cursor-pointer rounded-xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${theme}`}
    >
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {img ? (
          <img src={img} alt={item.item_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-4xl opacity-50 ${isLost ? 'text-rose-500' : 'text-emerald-500'}`}>
            {isLost ? "🔍" : "📦"}
          </div>
        )}
        
        <div className="absolute top-2 left-2">
           <TypeBadge type={item.type} />
        </div>
        
        <div className="absolute top-2 right-2 flex gap-1">
          {isOwner && (
            <span className="bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
              YOURS
            </span>
          )}
          <StatusPill status={item.status} />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 truncate">{item.item_name}</h3>
        <p className="mt-1 text-xs text-slate-500 truncate">🏷 {item.category} · 📍 {item.location}</p>
      </div>
    </article>
  );
}