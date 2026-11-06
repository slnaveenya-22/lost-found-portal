import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { ToastProvider } from "./context/ToastContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/Layout";

import SearchItems from "./pages/SearchItems";
import ReportItem from "./pages/ReportItem";
import ItemDetail from "./pages/ItemDetail";

import Dashboard from "./pages/Dashboard";
import Notifications from "./pages/Notifications";
import MyReports from "./pages/MyReports";
import MyClaims from "./pages/MyClaims";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClaims from "./pages/admin/AdminClaims";
import AdminItems from "./pages/admin/AdminItems";
import AdminUsers from "./pages/admin/AdminUsers";

// A safe redirect component that waits a frame before navigating
function RootRedirect() {
  useEffect(() => {
    window.location.replace("/browse");
  }, []);
  return <div className="p-10 text-center text-slate-500">Loading...</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<Layout />}>
            {/* Use the custom redirect here */}
            <Route path="/" element={<RootRedirect />} />

            <Route path="/browse" element={<SearchItems />} />
            <Route path="/report" element={<ReportItem />} />
            <Route path="/items/:type/:reportId" element={<ItemDetail />} />

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-reports" element={<MyReports />} />
            <Route path="/my-claims" element={<MyClaims />} />
            <Route path="/notifications" element={<Notifications />} />

            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/claims" element={<AdminClaims />} />
            <Route path="/admin/items" element={<AdminItems />} />
            <Route path="/admin/users" element={<AdminUsers />} />

            <Route
              path="*"
              element={
                <div className="max-w-xl mx-auto text-center py-20">
                  <h1 className="text-4xl font-bold text-slate-900">404</h1>
                  <p className="mt-2 text-slate-500">This page doesn't exist.</p>
                  <button
                    onClick={() => window.location.href = '/browse'}
                    className="mt-4 text-brand-accent hover:underline"
                  >
                    Go back home
                  </button>
                </div>
              }
            />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}