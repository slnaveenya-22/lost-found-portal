import { NavLink } from "react-router-dom";
import Logo from "./Logo";

const navBase = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const navIdle = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
const navActive = "bg-brand-accent-soft text-brand-primary border-l-[3px] border-brand-accent pl-[9px]";

function NavItem({ to, icon, label, collapsed }) {
  return (
    <NavLink to={to} className={({ isActive }) =>
      `${navBase} ${isActive ? navActive : navIdle}`
    }>
      <span className="w-5 h-5 flex items-center justify-center text-base">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ collapsed = false, role = "student", user, onLogout, onToggleCollapse }) {
  const isAdmin = role === "admin";
  const isGuest = role === "guest";

  return (
    <aside className={`flex flex-col h-screen bg-white border-r border-slate-200 transition-all
      ${collapsed ? "w-[72px]" : "w-60"}`}>
      <div className="h-16 flex items-center px-4 border-b border-slate-200">
        <Logo collapsed={collapsed} variant="light" />
      </div>
      

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <NavItem to="/"          icon="🏠" label="Home"        collapsed={collapsed} />
        <NavItem to="/browse/lost"  icon="🔍" label="Lost Items"  collapsed={collapsed} />
        <NavItem to="/browse/found" icon="🔎" label="Found Items" collapsed={collapsed} />

        {!isGuest && (
          <>
            <NavItem to="/dashboard"    icon="📊" label="Dashboard"    collapsed={collapsed} />
            <NavItem to="/report-lost"  icon="➕" label="Report Lost"  collapsed={collapsed} />
            <NavItem to="/report-found" icon="➕" label="Report Found" collapsed={collapsed} />
            <NavItem to="/notifications"icon="🔔" label="Notifications" collapsed={collapsed} />
          </>
        )}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-slate-200" />
            {!collapsed && (
              <p className="px-3 text-xs uppercase tracking-wider text-slate-400 mb-1">Admin</p>
            )}
            <NavItem to="/admin"         icon="⚙️" label="Dashboard" collapsed={collapsed} />
            <NavItem to="/admin/claims"  icon="✅" label="Claims"    collapsed={collapsed} />
            <NavItem to="/admin/items"   icon="📦" label="Items"     collapsed={collapsed} />
            <NavItem to="/admin/users"   icon="👥" label="Users"     collapsed={collapsed} />
          </>
        )}

        {isGuest && (
          <>
            <div className="my-3 border-t border-slate-200" />
            <NavItem to="/login"    icon="🔑" label="Log In"   collapsed={collapsed} />
            <NavItem to="/register" icon="✨" label="Register" collapsed={collapsed} />
          </>
        )}
      </nav>

      {!isGuest && user && (
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center font-semibold shrink-0">
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                <button onClick={onLogout} className="text-xs text-slate-500 hover:text-brand-accent">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle — desktop only */}
      {onToggleCollapse && (
        <div className="hidden lg:block border-t border-slate-200 p-3">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm
              text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="w-5 h-5 flex items-center justify-center">
              {collapsed ? "→" : "←"}
            </span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </aside>
  );
}