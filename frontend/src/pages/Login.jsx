import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Logo from "../components/Logo";
import Button from "../components/Button";
import FormField, { inputClass } from "../components/FormField";

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", formData);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/browse/lost");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-primary via-brand-primary to-brand-accent
        items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="relative z-10 max-w-md text-white">
          <Logo variant="dark" />
          <h2 className="mt-8 text-3xl font-bold tracking-tight">
            Reuniting campus with what matters.
          </h2>
          <p className="mt-3 text-white/80 text-sm leading-relaxed">
            Report lost items, browse found ones, and get notified the moment
            a match appears — all in one place.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Logo variant="light" /></div>

          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Log in to your account</p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6">
            <FormField label="Email" required>
              <input type="email" name="email" value={formData.email}
                onChange={handleChange} className={inputClass}
                placeholder="you@kct.ac.in" />
            </FormField>

            <FormField label="Password" required>
              <input type="password" name="password" value={formData.password}
                onChange={handleChange} className={inputClass}
                placeholder="••••••••" />
            </FormField>

            <Button type="submit" variant="primary" size="lg" className="w-full mt-2">
              Log In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-brand-accent hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}