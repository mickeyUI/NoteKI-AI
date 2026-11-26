import { Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import NoteCards from "./NoteCards";

/**
 * Displays semantic / PG search results in an animated collapsible panel above
 * the main notes feed, with staggered card entrance transitions.
 */
export default function SearchDisplayPopup({
  isOpen,
  onClose,
  queriedNotes = [],
  loading,
  onTogglePin,
  onSelectTag,
  formatDate,
  handleDeleteNote,
  setNoteViewId,
  setNoteViewOpen,
}) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.985 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-40 w-full mb-6 select-none"
        >
          <div className="w-full bg-[#1e1e1e] rounded-3xl p-6 shadow-2xl border border-white/10 relative">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <h2 className="text-sm uppercase tracking-wider font-bold text-slate-300">
                Semantic Search Results ({queriedNotes?.length || 0})
              </h2>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                  title="Close search results"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400"
              >
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <span className="text-sm">Searching vector space...</span>
              </motion.div>
            ) : !queriedNotes || queriedNotes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-8 text-center text-sm text-slate-400"
              >
                No matching semantic notes found.
              </motion.div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {queriedNotes.map((note, idx) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.25,
                      delay: Math.min(idx * 0.04, 0.24),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <NoteCards
                      note={note}
                      onTogglePin={onTogglePin}
                      formatDate={formatDate}
                      handleDeleteNote={handleDeleteNote}
                      setNoteViewId={setNoteViewId}
                      setNoteViewOpen={setNoteViewOpen}
                      onSelectTag={onSelectTag}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
