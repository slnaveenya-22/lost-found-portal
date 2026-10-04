import { NavLink } from "react-router-dom";
import {
  Home,
  Search,
  PackageSearch,
  LayoutDashboard,
  PlusCircle,
  Bell,
  Settings,
  CheckCircle2,
  Users,
  LogIn,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Logo from "./Logo";

const navBase =
  "flex items-center gap-3 rounded-lg transition-colors text-[15px] font-medium";
const navIdle =
  "text-slate-600 hover:bg-brand-accent-soft/40 hover:text-slate-900";
const navActive =
  "bg-brand-accent-soft text-brand-primary border-l-[3px] border-brand-accent pl-[13px]";

function NavItem({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${navBase} ${isActive ? navActive : navIdle} ${
          collapsed ? "justify-center p-3" : "px-4 py-2.5"
        }`
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export default function Sidebar({
  collapsed = false,
  role = "student",
  user,
  onLogout,
  onToggleCollapse,
}) {
  const isAdmin = role === "admin";
  const isGuest = role === "guest";

  return (
    <aside
      className={`flex flex-col h-screen transition-all border-r border-brand-accent/15
        bg-gradient-to-b from-brand-accent-tint to-white
        ${collapsed ? "w-[72px]" : "w-64"}`}
    >
      {/* Logo */}
      <div
        className={`h-16 flex items-center border-b border-brand-accent/15
          ${collapsed ? "justify-center px-2" : "px-4"}`}
      >
        <Logo collapsed={collapsed} variant="light" />
      </div>

      {/* Nav */}
      <nav
        className={`flex-1 overflow-y-auto py-3 space-y-1 ${
          collapsed ? "px-2" : "px-3"
        }`}
      >
        <NavItem to="/" icon={Home} label="Home" collapsed={collapsed} />
        <NavItem
          to="/browse/lost"
          icon={Search}
          label="Lost Items"
          collapsed={collapsed}
        />
        <NavItem
          to="/browse/found"
          icon={PackageSearch}
          label="Found Items"
          collapsed={collapsed}
        />

        {!isGuest && (
          <>
            <NavItem
              to="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              collapsed={collapsed}
            />
            <NavItem
              to="/report-lost"
              icon={PlusCircle}
              label="Report Lost"
              collapsed={collapsed}
            />
            <NavItem
              to="/report-found"
              icon={PlusCircle}
              label="Report Found"
              collapsed={collapsed}
            />
            <NavItem
              to="/notifications"
              icon={Bell}
              label="Notifications"
              collapsed={collapsed}
            />
          </>
        )}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-brand-accent/15" />
            {!collapsed && (
              <p className="px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Admin
              </p>
            )}
            <NavItem
              to="/admin"
              icon={Settings}
              label="Dashboard"
              collapsed={collapsed}
            />
            <NavItem
              to="/admin/claims"
              icon={CheckCircle2}
              label="Claims"
              collapsed={collapsed}
            />
            <NavItem
              to="/admin/items"
              icon={PackageSearch}
              label="Items"
              collapsed={collapsed}
            />
            <NavItem
              to="/admin/users"
              icon={Users}
              label="Users"
              collapsed={collapsed}
            />
          </>
        )}

        {isGuest && (
          <>
            <div className="my-3 border-t border-brand-accent/15" />
            <NavItem
              to="/login"
              icon={LogIn}
              label="Log In"
              collapsed={collapsed}
            />
            <NavItem
              to="/register"
              icon={UserPlus}
              label="Register"
              collapsed={collapsed}
            />
          </>
        )}
      </nav>

      {/* Footer — user chip */}
      {!isGuest && user && (
        <div
          className={`border-t border-brand-accent/15 ${
            collapsed ? "p-2" : "p-3"
          }`}
        >
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "gap-3"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-accent to-brand-primary text-white flex items-center justify-center font-semibold shrink-0 text-sm shadow-sm">
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user.name}
                </p>
                <button
                  onClick={onLogout}
                  className="text-xs text-slate-500 hover:text-brand-accent transition-colors"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer — collapse toggle (desktop only) */}
      {onToggleCollapse && (
        <div className="hidden lg:block border-t border-brand-accent/15 p-2">
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center rounded-lg text-sm text-slate-500
              hover:bg-brand-accent-soft/40 hover:text-slate-700 transition-colors
              ${collapsed ? "justify-center p-2.5" : "gap-2 px-3 py-2"}`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" strokeWidth={1.75} />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}