export default function TopBar({ title, onMenuClick, notificationCount = 0, user }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600">
          ☰
        </button>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 cursor-pointer hover:bg-slate-100">
          🔍 <span>Search…</span>
          <kbd className="ml-2 rounded bg-white border border-slate-200 px-1.5 text-xs">⌘K</kbd>
        </div>

        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600">
          🔔
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-brand-accent text-white text-[10px] rounded-full flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>

        {user && (
          <div className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center font-semibold">
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
        )}
      </div>
    </header>
  );
}