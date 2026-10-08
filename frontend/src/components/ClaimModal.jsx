import { useEffect, useState } from "react";
import axios from "axios";
import Button from "./Button";

export default function ClaimModal({
  foundItem,           // { id, report_id, item_name }
  matchId = null,
  onClose,
  onSuccess,
}) {
  const [questions, setQuestions] = useState([]);
  const [legacy, setLegacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [answers, setAnswers] = useState({}); // { [questionId]: selectedOption }
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { status: 'Pending'|'Rejected', message }

  // ── Fetch the quiz ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    axios
      .get(
        `http://localhost:5000/api/items/found/${foundItem.report_id}/quiz`
      )
      .then((res) => {
        if (cancelled) return;
        setQuestions(res.data.questions || []);
        setLegacy(res.data.legacy || false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err.response?.data?.error || "Couldn't load the verification quiz."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [foundItem.report_id]);

  // ── Answer selection ───────────────────────────────────────
  const select = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => answers[q.id] != null);

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!allAnswered && !legacy) return;

    setSubmitting(true);
    try {
      const payload = {
        found_item_id: foundItem.id,
        match_id: matchId,
        answers: questions.map((q) => ({
          question_id: q.id,
          selected_option: answers[q.id],
        })),
      };

      const res = await axios.post(
        "http://localhost:5000/api/claims",
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (res.data.status === "Pending") {
        setResult({
          status: "Pending",
          message:
            "Your claim has been submitted for review. An admin will verify it shortly.",
        });
        onSuccess?.();
      } else {
        setResult({
          status: "Rejected",
          message:
            "One or more of your answers were incorrect. Your claim was not submitted. Try again if you're the rightful owner.",
        });
      }
    } catch (err) {
      setResult({
        status: "Error",
        message:
          err.response?.data?.error ||
          "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render branches ────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="w-full max-w-lg my-8 rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Verify ownership
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {foundItem.item_name}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {loading && <LoadingState />}

          {!loading && loadError && (
            <ErrorState message={loadError} onClose={onClose} />
          )}

          {!loading && !loadError && legacy && (
            <LegacyState />
          )}

          {!loading && !loadError && !legacy && result && (
            <ResultState result={result} onClose={onClose} />
          )}

          {!loading && !loadError && !legacy && !result && (
            <>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                Answer these questions to prove you own this item. All
                three must be correct.
              </p>

              {questions.map((q, idx) => (
                <div key={q.id} className="mb-6">
                  <p className="text-sm font-medium text-slate-900 mb-3">
                    {idx + 1}. {q.question_text}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const selected = answers[q.id] === opt;
                      return (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors
                            ${
                              selected
                                ? "border-brand-accent bg-brand-accent-soft/50"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={selected}
                            onChange={() => select(q.id, opt)}
                            className="accent-brand-accent"
                          />
                          <span className="text-sm text-slate-700">
                            {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !loadError && !legacy && !result && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
            >
              {submitting ? "Submitting…" : "Submit claim"}
            </Button>
          </div>
        )}

        {!loading && (loadError || legacy || result) && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-states ─────────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="space-y-4 animate-pulse py-4">
      <div className="h-4 w-3/4 bg-slate-200 rounded" />
      <div className="h-10 w-full bg-slate-100 rounded-lg" />
      <div className="h-10 w-full bg-slate-100 rounded-lg" />
      <div className="h-4 w-2/3 bg-slate-200 rounded mt-6" />
      <div className="h-10 w-full bg-slate-100 rounded-lg" />
      <div className="h-10 w-full bg-slate-100 rounded-lg" />
    </div>
  );
}

function ErrorState({ message, onClose }) {
  return (
    <div className="py-6 text-center">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-sm text-slate-700">{message}</p>
    </div>
  );
}

function LegacyState() {
  return (
    <div className="py-6 text-center">
      <div className="text-3xl mb-3">📋</div>
      <p className="text-sm text-slate-700 font-medium mb-1">
        This item doesn't have a verification quiz.
      </p>
      <p className="text-xs text-slate-500">
        An admin will review your claim manually.
      </p>
    </div>
  );
}

function ResultState({ result, onClose }) {
  const isSuccess = result.status === "Pending";
  return (
    <div className="py-4 text-center">
      <div
        className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center text-2xl
          ${isSuccess ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
      >
        {isSuccess ? "✓" : "✕"}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">
        {isSuccess ? "Claim submitted" : "Claim not submitted"}
      </h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
        {result.message}
      </p>
    </div>
  );
}