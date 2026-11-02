
import { Loader2, X } from "lucide-react";
import NoteCards from "./NoteCards";

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
  if (!isOpen) return null;
  return (
    <div className="relative z-40 w-full mb-6 select-none">
      <div className="w-full bg-[#1e1e1e] rounded-3xl p-6 shadow-2xl border border-white/10 relative">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
          <h2 className="text-sm uppercase tracking-wider font-bold text-slate-300">
            Semantic Search Results ({queriedNotes?.length || 0})
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              title="Close search results"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            <span className="text-sm">Searching vector space...</span>
          </div>
        ) : !queriedNotes || queriedNotes.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No matching semantic notes found.
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {queriedNotes.map((note) => (
              <NoteCards
                key={note.id}
                note={note}
                onTogglePin={onTogglePin}
                formatDate={formatDate}
                handleDeleteNote={handleDeleteNote}
                setNoteViewId={setNoteViewId}
                setNoteViewOpen={setNoteViewOpen}
                onSelectTag={onSelectTag}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
