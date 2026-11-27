import { useState, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { api } from "../services/api";

/**
 * Minimalistic modal allowing the user to write and submit feedback to the
 * backend /Feedback endpoint, or cancel/close with Escape.
 */
export default function FeedbackModal({ isOpen, onClose }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Close the modal on Escape unless a submission is currently in flight.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  // Submit feedback to the backend and reset the form on success.
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await api.submitFeedback(trimmed);
      toast.success("Thanks for your feedback!");
      setMessage("");
      onClose();
    } catch (err) {
      toast.error(err?.message || "Could not send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-md"
            onClick={() => !submitting && onClose()}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="relative z-10 w-full max-w-md glass-panel rounded-2xl p-5 sm:p-6 shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">
                Give Feedback
              </h2>
              <button
                type="button"
                onClick={() => !submitting && onClose()}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                autoFocus
                rows={4}
                placeholder="Share a bug, idea, or anything on your mind..."
                className="glass-input w-full py-3 px-3.5 text-sm text-white placeholder-slate-500 rounded-xl border border-white/10 focus:border-white/25 resize-none focus:outline-none"
                required
              />

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => !submitting && onClose()}
                  disabled={submitting}
                  className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="py-2 px-4 rounded-xl bg-white hover:bg-slate-200 text-[#121212] text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
