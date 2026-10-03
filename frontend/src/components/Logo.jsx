// PLACEHOLDER — swap with final logo later.
// Current: abstract lotus mark + wordmark.
export default function Logo({ collapsed = false, variant = "dark" }) {
  const textColor = variant === "dark" ? "text-white" : "text-brand-primary";
  return (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center shrink-0">
        {/* Placeholder lotus: simple geometric petals */}
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
          <path d="M12 3c-1.5 2-2 4-2 6 0 1.5.5 3 2 4 1.5-1 2-2.5 2-4 0-2-.5-4-2-6z" />
          <path d="M4 9c0 3 2 6 5 7-1-2-1-4 0-6-2 0-4-.5-5-1z" />
          <path d="M20 9c-1 .5-3 1-5 1 1 2 1 4 0 6 3-1 5-4 5-7z" />
        </svg>
      </div>
      {!collapsed && (
        <span className={`font-semibold tracking-tight ${textColor}`}>
          KCT <span className="font-normal opacity-70">Lost &amp; Found</span>
        </span>
      )}
    </div>
  );
}