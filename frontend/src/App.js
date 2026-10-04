import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth pages (no sidebar)
import Login from "./pages/Login";
import Register from "./pages/Register";

// App shell
import Layout from "./components/Layout";
import SearchItems from "./pages/SearchItems";
import ItemDetail from "./pages/ItemDetail";
import ReportLostItem from "./pages/ReportLostItem";
import ReportFoundItem from "./pages/ReportFoundItem";
import Dashboard from "./pages/Dashboard";
import Notifications from "./pages/Notifications";
import MyReports from "./pages/MyReports";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClaims from "./pages/admin/AdminClaims";
import AdminItems from "./pages/admin/AdminItems";
import AdminUsers from "./pages/admin/AdminUsers";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth — no shell */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Everything else wrapped in Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/browse/lost" replace />} />

          {/* Browse */}
          <Route
            path="/browse/lost"
            element={<SearchItems type="lost" title="Lost Items" />}
          />
          <Route
            path="/browse/found"
            element={<SearchItems type="found" title="Found Items" />}
          />

          {/* Item detail */}
          <Route path="/items/:type/:reportId" element={<ItemDetail />} />

          {/* Reports */}
          <Route path="/report-lost" element={<ReportLostItem />} />
          <Route path="/report-found" element={<ReportFoundItem />} />
          <Route path="/my-reports" element={<MyReports />} />

          {/* User dashboard + notifications */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/claims" element={<AdminClaims />} />
          <Route path="/admin/items" element={<AdminItems />} />
          <Route path="/admin/users" element={<AdminUsers />} />

          {/* 404 — anything else */}
          <Route
            path="*"
            element={
              <div className="max-w-xl mx-auto text-center py-20">
                <h1 className="text-4xl font-bold text-slate-900">404</h1>
                <p className="mt-2 text-slate-500">
                  This page doesn't exist.
                </p>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}