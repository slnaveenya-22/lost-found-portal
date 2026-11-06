import { Mail, CheckCircle2, X } from "lucide-react";
import Button from "./Button";

export default function ClaimDetailsModal({ claim, isClaimant, onClose }) {
  if (!claim) return null;

  const contactName = isClaimant ? claim.finder_name : claim.claimant_name;
  const contactEmail = isClaimant ? claim.finder_email : claim.claimant_email;
  const safeName = contactName || "Unknown User";

  const message = isClaimant
    ? "Great news! Your claim was approved. Please contact the finder to arrange a pickup."
    : "You approved this claim! Please contact the claimant to arrange a pickup.";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close claim details"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Claim Approved!</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-3">
            Contact Information
          </p>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold">
              {safeName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{safeName}</p>
              <p className="text-xs text-slate-500">Point of Contact</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-700 bg-white p-2 rounded border border-slate-200">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            {contactEmail ? (
              <a
                href={`mailto:${contactEmail}`}
                className="hover:text-brand-accent hover:underline truncate"
              >
                {contactEmail}
              </a>
            ) : (
              <span className="text-slate-400 italic">No email provided</span>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close
          </Button>
          {contactEmail && (
            <a href={`mailto:${contactEmail}`} className="w-full">
              <Button variant="primary" className="w-full">
                Send Email
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
