import { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

export default function Toast({ message, type = "success", onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isSuccess = type === "success";

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-bottom-5 fade-in duration-300
      ${isSuccess ? "bg-white border-emerald-200 text-slate-800" : "bg-white border-red-200 text-slate-800"}`}>
      
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
      )}
      
      <p className="text-sm font-medium pr-2">{message}</p>
      
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}