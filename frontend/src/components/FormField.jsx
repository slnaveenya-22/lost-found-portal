export default function FormField({ label, error, required, children }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-brand-accent">*</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent " +
  "placeholder:text-slate-400 transition";