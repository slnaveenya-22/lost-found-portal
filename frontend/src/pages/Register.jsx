import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Logo from "../components/Logo";
import Button from "../components/Button";
import FormField, { inputClass } from "../components/FormField";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear this field's error as soon as the user edits it
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
    setServerError("");
  };

  // Client-side validation — mirrors backend rules
  const validate = () => {
    const next = {};
    if (!formData.name.trim()) next.name = "Name is required";
    if (!formData.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      next.email = "Enter a valid email address";
    }
    if (!formData.password) {
      next.password = "Password is required";
    } else if (formData.password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    if (!formData.confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      setSuccess(true);

      // Brief success flash, then send them to login
      setTimeout(() => navigate("/login"), 1400);
    } catch (err) {
      if (err.response?.data?.error) {
        setServerError(err.response.data.error);
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Brand panel (hidden on mobile) ───────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-primary via-brand-primary to-brand-accent
        items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5" />

        <div className="relative z-10 max-w-md text-white">
          <Logo variant="dark" />

          <h2 className="mt-8 text-3xl font-bold tracking-tight leading-tight">
            Join the KCT Lost&nbsp;&amp;&nbsp;Found community.
          </h2>
          <p className="mt-3 text-white/80 text-sm leading-relaxed">
            Create an account to report items, raise claims, and get notified
            the moment someone finds what you're looking for.
          </p>

          {/* Small feature list — reinforces value */}
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-xs">✓</span>
              Report lost &amp; found items in seconds
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-xs">✓</span>
              Smart matches between reports
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-xs">✓</span>
              Verified claim process
            </li>
          </ul>
        </div>
      </div>

      {/* ── Form panel ───────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Logo variant="light" />
          </div>

          {success ? (
            // ── Success state ────────────────────────────────
            <div className="text-center py-10">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-600
                flex items-center justify-center text-2xl">
                ✓
              </div>
              <h1 className="mt-4 text-xl font-bold text-slate-900">
                Account created
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Redirecting you to log in…
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">
                Create your account
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                It only takes a minute
              </p>

              {serverError && (
                <div className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6" noValidate>
                <FormField label="Full Name" required error={errors.name}>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Naveen Kumar"
                    autoComplete="name"
                  />
                </FormField>

                <FormField label="Email" required error={errors.email}>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="you@kct.ac.in"
                    autoComplete="email"
                  />
                </FormField>

                <FormField
                  label="Password"
                  required
                  error={errors.password}
                >
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </FormField>

                <FormField
                  label="Confirm Password"
                  required
                  error={errors.confirmPassword}
                >
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  disabled={submitting}
                >
                  {submitting ? "Creating account…" : "Create Account"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-brand-accent hover:underline"
                >
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}