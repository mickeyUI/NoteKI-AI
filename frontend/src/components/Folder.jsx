import { useEffect } from "react";
import { X, Folder as FolderIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import NoteCards from "./NoteCards";

/**
 * Folder modal displaying all notes belonging to a selected collection in a
 * structured 3-column grid with a fixed header and scrollable body.
 */
export default function Folder({
  isOpen,
  setView,
  notes,
  group,
  pinnedIds = [],
  onTogglePin,
  onSelectTag,
  formatDate,
  handleDeleteNote,
  setNoteViewId,
  setNoteViewOpen,
}) {
  // Close the folder modal when the user presses Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setView(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setView]);

  const groupItems = Array.isArray(notes)
    ? notes.filter((note) => note.group == group)
    : [];

  return (
    <AnimatePresence>
      {isOpen && notes && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-6 sm:p-4 sm:pt-10 md:p-6 md:pt-12 select-none">
          {/* Backdrop mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setView(false)}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative z-10 w-full max-w-6xl max-h-[90vh] glass-panel-folder rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
          >
            {/* Structured Header Bar */}
            <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-none">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-200 shrink-0">
                  <FolderIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">
                  Folder:
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white truncate">
                  {group}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300 shrink-0">
                  {groupItems.length}{" "}
                  {groupItems.length === 1 ? "note" : "notes"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setView(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                title="Close Folder"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Notes Grid Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
              {groupItems.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  No notes in this folder yet.
                </div>
              ) : (
                <motion.main
                  layout
                  className="grid gap-5 transition-all duration-500 ease-in-out grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                >
                  <AnimatePresence>
                    {groupItems.map((note) => (
                      <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ layout: { duration: 0.3 } }}
                      >
                        <NoteCards
                          note={note}
                          isPinned={pinnedIds.includes(note.id)}
                          onTogglePin={onTogglePin}
                          formatDate={formatDate}
                          handleDeleteNote={handleDeleteNote}
                          setNoteViewId={setNoteViewId}
                          setNoteViewOpen={setNoteViewOpen}
                          onSelectTag={onSelectTag}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.main>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
