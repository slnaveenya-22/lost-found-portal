import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import FormField, { inputClass } from "../components/FormField";

const CATEGORIES = ["Electronics", "Bag", "ID Card", "Books", "Clothing", "Keys", "Wallet", "Water Bottle", "Other"];
const DATE_RANGES = [
  { label: "Any time", value: "" },
  { label: "Last 24 hours", value: "1" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
];

export default function SearchItems() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get type from URL, default to 'lost'
  const type = searchParams.get("type") === "found" ? "found" : "lost";
  const isLost = type === "lost";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [sort, setSort] = useState("recent");

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function fetchItems() {
      setLoading(true);
      try {
        const params = { type };
        if (keyword.trim()) params.q = keyword.trim();
        if (category) params.category = category;
        if (dateRange) params.days = dateRange;
        if (sort) params.sort = sort;

        const res = await axios.get("http://localhost:5000/api/items/search", {
          params, signal: controller.signal
        });
        if (!cancelled) setItems(res.data.items || []);
      } catch (err) {
        if (!axios.isCancel(err) && !cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(fetchItems, 300);
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [keyword, category, dateRange, sort, type]);

  const activeFilterCount = (keyword.trim() ? 1 : 0) + (category ? 1 : 0) + (dateRange ? 1 : 0);
  const clearFilters = () => { setKeyword(""); setCategory(""); setDateRange(""); setSort("recent"); };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Massive Toggle Switch */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setSearchParams({ type: "lost" })}
            className={`px-8 py-3 rounded-lg text-sm font-bold transition-all ${isLost ? "bg-rose-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
              }`}
          >
            🔍 Lost Items
          </button>
          <button
            onClick={() => setSearchParams({ type: "found" })}
            className={`px-8 py-3 rounded-lg text-sm font-bold transition-all ${!isLost ? "bg-emerald-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
              }`}
          >
            📦 Found Items
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Full Filter Rail */}
        <aside className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-brand-accent hover:underline">Clear all</button>
              )}
            </div>

            <FormField label="Keyword">
              <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search item..." className={inputClass} />
            </FormField>

            <FormField label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>

            <FormField label="Date reported">
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={inputClass}>
                {DATE_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </FormField>

            <FormField label="Sort by">
              <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputClass}>
                <option value="recent">Most recent</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Item name (A-Z)</option>
              </select>
            </FormField>
          </div>
        </aside>

        {/* Results */}
        <section className="flex-1 min-w-0">
          {!loading && items.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">{items.length} items found</p>
              {user && (
                <Button variant={isLost ? "primary" : "accent"} onClick={() => navigate(`/report?mode=${type}`)}>
                  ➕ Report {isLost ? "Lost" : "Found"} Item
                </Button>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-slate-200 rounded-xl animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <EmptyState
                icon={isLost ? "🔍" : "📦"}
                title={`No ${type} items found`}
                message="Try adjusting your search filters."
                action={user && <Button variant={isLost ? "primary" : "accent"} onClick={() => navigate(`/report?mode=${type}`)}>Report an Item</Button>}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((item) => (
                <ItemCard
                  key={item.id || item.report_id}
                  item={{ ...item, type }}
                  currentUser={user}
                  onClick={() => navigate(`/items/${type}/${item.report_id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}