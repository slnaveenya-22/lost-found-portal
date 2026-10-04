import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../components/Button";
import FormField, { inputClass } from "../components/FormField";
import ItemCard from "../components/ItemCard";

// Same list as SearchItems — swap for a GET /api/categories later
const CATEGORIES = [
  "Electronics",
  "Bag",
  "ID Card",
  "Books",
  "Clothing",
  "Keys",
  "Wallet",
  "Water Bottle",
  "Other",
];

const INITIAL_FORM = {
  category: "",
  item_name: "",
  color: "",
  brand: "",
  location: "",
  date_time: "",
  description: "",
};

export default function ReportLostItem() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successReportId, setSuccessReportId] = useState(null);

  const fileInputRef = useRef(null);

  // ── Which user is reporting ─────────────────────────────────
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  // ── Change handlers ─────────────────────────────────────────
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
    setServerError("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic client-side checks
    if (!file.type.startsWith("image/")) {
      setErrors({ ...errors, image: "Please choose an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, image: "Image must be under 5 MB." });
      return;
    }

    setImage(file);
    setErrors({ ...errors, image: "" });

    // Free the previous object URL to avoid memory leaks
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Validation ──────────────────────────────────────────────
  const validate = () => {
    const next = {};
    if (!formData.category) next.category = "Category is required";
    if (!formData.item_name.trim()) next.item_name = "Item name is required";
    if (!formData.location.trim()) next.location = "Location is required";
    if (!formData.date_time) next.date_time = "Date & time is required";
    return next;
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!user) {
      setServerError("You must be logged in to report a lost item.");
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      const first = Object.keys(validationErrors)[0];
      document
        .querySelector(`[name="${first}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("user_id", user.id);
      data.append("category", formData.category);
      data.append("item_name", formData.item_name.trim());
      data.append("color", formData.color.trim());
      data.append("brand", formData.brand.trim());
      data.append("location", formData.location.trim());
      data.append("date_time", formData.date_time);
      data.append("description", formData.description.trim());
      if (image) data.append("image", image);

      const res = await axios.post(
        "http://localhost:5000/api/items/lost",
        data,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setSuccessReportId(res.data.reportId);
    } catch (err) {
      setServerError(
        err.response?.data?.error ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────
  if (successReportId) {
    return (
      <SuccessScreen
        reportId={successReportId}
        itemName={formData.item_name}
        navigate={navigate}
      />
    );
  }

  // ── Preview item — mirrors the search-card shape ────────────
  const previewItem = {
    type: "lost",
    status: "Posted",
    item_name: formData.item_name || "Item name",
    category: formData.category || "Category",
    location: formData.location || "Location",
    date_time: formData.date_time || new Date().toISOString(),
    image_url: null, // we render the blob preview separately below
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Report a Lost Item
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Fill in the details below. The preview on the right shows how your
          listing will appear.
        </p>
      </div>

      {serverError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ══ Left: form (60%) ══════════════════════════════ */}
          <div className="lg:col-span-3 space-y-6">
            {/* Section: Item basics */}
            <Section title="Item details" hint="What did you lose?">
              <FormField label="Category" required error={errors.category}>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select a category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Item name" required error={errors.item_name}>
                <input
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g. Black leather wallet"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <FormField label="Color">
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g. Black"
                  />
                </FormField>

                <FormField label="Brand">
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g. Hidesign"
                  />
                </FormField>
              </div>
            </Section>

            {/* Section: Where & when */}
            <Section title="Where and when" hint="Helps us match your item.">
              <FormField label="Location lost" required error={errors.location}>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g. Library, 2nd floor"
                />
              </FormField>

              <FormField label="Date & time lost" required error={errors.date_time}>
                <input
                  type="datetime-local"
                  name="date_time"
                  value={formData.date_time}
                  onChange={handleChange}
                  className={inputClass}
                  max={new Date().toISOString().slice(0, 16)}
                />
              </FormField>
            </Section>

            {/* Section: Description + photo */}
            <Section title="More details" hint="Optional, but helps a lot.">
              <FormField label="Description">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={inputClass}
                  rows={4}
                  placeholder="Any distinguishing marks, contents, stickers, damage…"
                />
              </FormField>

              <FormField label="Photo" error={errors.image}>
                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-h-64 object-contain bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 rounded-full bg-white/90 hover:bg-white
                        border border-slate-200 shadow-sm w-8 h-8 flex items-center justify-center
                        text-slate-600"
                      aria-label="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed
                      border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-brand-accent
                      cursor-pointer px-4 py-8 text-center transition-colors"
                  >
                    <span className="text-3xl text-slate-400">📷</span>
                    <span className="mt-2 text-sm font-medium text-slate-700">
                      Click to upload a photo
                    </span>
                    <span className="text-xs text-slate-400 mt-0.5">
                      JPG, PNG · up to 5 MB
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </FormField>
            </Section>

            {/* Submit row (also in sticky bar below for convenience) */}
            <div className="hidden lg:flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(`/browse/lost`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                size="lg"
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit Report"}
              </Button>
            </div>
          </div>

          {/* ══ Right: live preview (40%) ═════════════════════ */}
          <aside className="lg:col-span-2 mt-6 lg:mt-0">
            <div className="lg:sticky lg:top-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Live preview
                  </h2>
                  <span className="text-xs text-slate-400">Updates as you type</span>
                </div>

                <ItemCard
                  item={{
                    ...previewItem,
                    image_url: imagePreview
                      ? imagePreview.replace(/^blob:/, "blob:")
                      : null,
                  }}
                />

                <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                  This is how your card appears on the browse page. Details
                  will be visible to everyone.
                </p>
              </div>

              {/* Tips card */}
              <div className="rounded-xl border border-brand-accent-soft bg-brand-accent-soft/50 p-4">
                <h3 className="text-xs font-semibold text-brand-primary mb-2">
                  💡 Tips for a good report
                </h3>
                <ul className="text-xs text-brand-primary/80 space-y-1.5 leading-relaxed">
                  <li>· Be specific about the color and brand.</li>
                  <li>· Add a photo if you have one — it doubles match rates.</li>
                  <li>· Mention any unique marks in the description.</li>
                </ul>
              </div>
            </div>

            {/* Mobile submit */}
            <div className="lg:hidden mt-4 flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => navigate(`/browse/lost`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit Report"}
              </Button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function Section({ title, hint, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SuccessScreen({ reportId, itemName, navigate }) {
  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600
        flex items-center justify-center text-3xl">
        ✓
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Report submitted
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        "{itemName}" is now listed as a lost item. We'll notify you if a
        potential match appears.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 inline-block">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Report ID
        </p>
        <p className="text-lg font-mono font-semibold text-slate-900 mt-1">
          {reportId}
        </p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="secondary" onClick={() => navigate(`/browse/lost`)}>
          Browse lost items
        </Button>
        <Button variant="primary" onClick={() => navigate(`/items/lost/${reportId}`)}>
          View my report
        </Button>
      </div>
    </div>
  );
}