import { useSearchParams } from "react-router-dom";
import ReportLostItem from "./ReportLostItem";
import ReportFoundItem from "./ReportFoundItem";

export default function ReportItem() {
    const [searchParams, setSearchParams] = useSearchParams();

    // Default to 'lost' if no param is provided
    const mode = searchParams.get("mode") === "found" ? "found" : "lost";

    return (
        <div className="max-w-7xl mx-auto pb-12">
            {/* Massive Toggle Switch */}
            <div className="flex justify-center mb-8">
                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setSearchParams({ mode: "lost" })}
                        className={`px-8 py-3 rounded-lg text-sm font-bold transition-all ${mode === "lost"
                                ? "bg-rose-500 text-white shadow-md"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                            }`}
                    >
                        🔍 I Lost an Item
                    </button>
                    <button
                        onClick={() => setSearchParams({ mode: "found" })}
                        className={`px-8 py-3 rounded-lg text-sm font-bold transition-all ${mode === "found"
                                ? "bg-emerald-500 text-white shadow-md"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                            }`}
                    >
                        📦 I Found an Item
                    </button>
                </div>
            </div>

            {/* Render the respective form based on the toggle */}
            <div className={mode === "lost" ? "block" : "hidden"}>
                <ReportLostItem />
            </div>
            <div className={mode === "found" ? "block" : "hidden"}>
                <ReportFoundItem />
            </div>
        </div>
    );
}