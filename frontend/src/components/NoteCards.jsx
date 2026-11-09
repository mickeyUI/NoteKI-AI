import { Pin, Calendar, Trash2Icon, Mic } from "lucide-react";

export default function NoteCards({
  note,
  isPinned = false,
  onTogglePin,
  onSelectTag,
  formatDate,
  handleDeleteNote,
  setNoteViewId,
  setNoteViewOpen,
}) {
  const toggleVisable = (id) => {
    setNoteViewOpen(true);
    setNoteViewId(id);
  };
  return (
    <div
      key={note.id}
      onClick={(e) => {
        e.stopPropagation();
        toggleVisable(note.id);
      }}
      className={`glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between min-w-[280px] ${note.note_type === "img" ? "h-[200px]" : ""} max-h-[200px] relative group select-none ${
        isPinned ? "border-amber-400 border-2" : ""
      }`}
    >
      {/* Pinned Card Action */}
      <div className="flex  justify-between -mt-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(note.id);
          }}
          className={` btn-style opacity-10 group-hover:opacity-100 ${
            isPinned
              ? "bg-purple-500/20 border-purple-500/40 text-purple-100 opacity-100"
              : "bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300"
          }`}
          title={isPinned ? "Unpin card" : "Pin card"}
        >
          <Pin className="w-3.5 h-3.5" fill="currentcolor" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteNote(note.id);
          }}
          className=" btn-style opacity-10 group-hover:opacity-100"
        >
          <Trash2Icon className="w-3.5 h-3.5 text-purple-200 hover:text-red-400" />
        </button>
      </div>
      {/* Header details */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 pr-8">
          {note.note_type === "voice" && (
            <span
              className="p-1 rounded-md bg-[#6a994e]/10 text-green-400 shrink-0 opacity-90"
              title="Voice Note"
            >
              <Mic className="w-3 h-3 animate-pulse " />
            </span>
          )}
          <h3
            className={`text-base font-bold internal truncate transition-colors ${note.note_type === "img" ? "pl-5" : ""}`}
          >
            {note.title}
          </h3>
        </div>
        {note.note_type === "img" ? (
          <div className=" max-h-[120px] overflow-hidden absolute top-10 -z-1 left-8 rounded-2xl max-w-[240px]">
            <img
              src={note.source_url || null}
              alt={note.title}
              className="rounded-lg h-60 object-cover opacity-100 brightness-30 -z-1 "
            />
          </div>
        ) : (
          <p className="text-xs internal leading-relaxed line-clamp-2 mb-4 opacity-80">
            {note.content}
          </p>
        )}
      </div>

      {/* Pill tags and calendar */}

      <div className="flex flex-row items-center justify-between ">
        {(() => {
          const tagsArr = Array.isArray(note.tags)
            ? note.tags
            : typeof note.tags === "string"
              ? note.tags
                  .split(/[, ]+/)
                  .map((t) => t.replace(/^#+/, "").trim())
                  .filter(Boolean)
              : [];
          if (tagsArr.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1.5">
              {tagsArr.map((tag, tagIdx) => (
                <span
                  key={tagIdx}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectTag) onSelectTag(tag);
                  }}
                  className={`text-[10px] font-bold btn-style cursor-pointer ${note.note_type === "img" ? "ml-5" : ""}`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          );
        })()}

        <div className="flex items-center pt-4 justify-end gap-1.5 internal opacity-50 text-[10px]">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(note.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
