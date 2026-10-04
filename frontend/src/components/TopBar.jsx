import { Menu, Search, Bell, Command } from "lucide-react";

export default function TopBar({
  title,
  onMenuClick,
  notificationCount = 0,
  user,
}) {
  return (
    <header className="h-16 bg-white border-b border-brand-accent/15 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-brand-accent-soft/40 text-slate-600 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <h1 className="text-lg font-semibold text-slate-900 tracking-tight truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search box */}
        <div
          className="hidden md:flex items-center gap-2 rounded-full
            bg-brand-accent-soft/50 hover:bg-brand-accent-soft
            border border-brand-accent/15
            px-3.5 py-2 text-sm text-slate-500 cursor-pointer
            transition-colors min-w-[240px]"
        >
          <Search className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="flex items-center gap-0.5 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            <Command className="w-2.5 h-2.5" strokeWidth={2} />
            <span>K</span>
          </kbd>
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-brand-accent-soft/40 text-slate-600 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" strokeWidth={1.75} />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-brand-accent text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        {user && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-accent to-brand-primary text-white flex items-center justify-center font-semibold text-sm shadow-sm">
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
        )}
      </div>
    </header>
  );
}