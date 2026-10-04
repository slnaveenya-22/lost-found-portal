import { PackageSearch } from "lucide-react";

/**
 * Placeholder brand mark.
 * Swap the <PackageSearch /> for a real logo SVG when ready.
 */
export default function Logo({ collapsed = false, variant = "dark" }) {
  const textColor = variant === "dark" ? "text-white" : "text-brand-primary";
  const subTextColor = variant === "dark" ? "text-white/70" : "text-slate-400";

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center shrink-0 shadow-sm">
        <PackageSearch className="w-5 h-5 text-white" strokeWidth={2} />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className={`font-semibold tracking-tight text-[15px] ${textColor}`}>
            KCT
          </span>
          <span className={`text-[11px] font-medium ${subTextColor}`}>
            Lost &amp; Found
          </span>
        </div>
      )}
    </div>
  );
}