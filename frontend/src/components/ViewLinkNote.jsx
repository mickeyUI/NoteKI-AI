import { ArrowLeft, X, Link2, Folder, Tag, ExternalLink, Calendar } from "lucide-react";
import LinkPreviewCard from "./LinkPreviewCard";
import { isValidHttpUrl } from "../hooks/useLinkPreview";
import { TagChipsEditor, NoteModalFooter, formatNoteDate } from "./ViewNoteShared";

/**
 * Dedicated viewer/editor for saved link items (note_type === "link").
 * Shows the URL input with external launch action, full Open Graph preview card,
 * editable title, commentary notes, collection selector, and tag chips.
 */
export default function ViewLinkNote({
  title,
  setTitle,
  content,
  setContent,
  tags,
  setTags,
  sourceUrl,
  setSourceUrl,
  group,
  setGroup,
  folders = [],
  creation,
  loading,
  onClose,
}) {
  const folderOptions = Array.from(
    new Set(["none", ...(Array.isArray(folders) ? folders : []), ...(group ? [group] : [])]),
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="shrink-0 sticky sm:static top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-0 sm:py-0 sm:pb-3 bg-[#121212]/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden p-1.5 -ml-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="hidden sm:block p-2 bg-white/5 border border-white/10 rounded-xl text-purple-300 shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white shrink-0">
            View Link
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-[11px] font-medium text-purple-200 shrink-0">
            <Link2 className="w-3 h-3" />
            Saved Link
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 sm:px-1 sm:py-4 space-y-4">
        {/* Mobile Type Badge */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/25 text-[11px] font-medium text-purple-200">
            <Link2 className="w-3 h-3" />
            Saved Link
          </span>
        </div>

        {/* URL Input Row */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <Link2 className="w-3.5 h-3.5 text-purple-300" />
            <span>URL</span>
          </div>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
            placeholder="https://..."
            required
          />
          {isValidHttpUrl(sourceUrl) && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-slate-400 hover:text-white transition-colors shrink-0"
              title="Open link"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Rich Link Preview */}
        {isValidHttpUrl(sourceUrl) && <LinkPreviewCard url={sourceUrl} />}

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="glass-input w-full py-3 px-4 text-white placeholder-slate-500 rounded-xl text-lg sm:text-xl font-bold focus:outline-none"
          placeholder="Title"
          required
        />

        {/* Notes / Commentary */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="glass-input w-full h-32 sm:h-36 py-3 px-4 text-white placeholder-slate-500 rounded-xl text-sm leading-relaxed resize-none focus:outline-none"
          placeholder="Optional notes or context about this link..."
        />

        {/* Collection & Tags Metadata Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
              <Folder className="w-4 h-4 text-slate-300" />
              <span>collection</span>
            </div>
            <select
              value={group || "none"}
              onChange={(e) => setGroup(e.target.value)}
              className="bg-[#1a1a1a] border border-white/10 text-slate-200 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              {folderOptions.map((item) => (
                <option key={item} value={item} className="bg-[#1a1a1a] text-white">
                  {item === "none" ? "No collection" : item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
              <Tag className="w-3.5 h-3.5 text-slate-300" />
              <span>Tags</span>
            </div>
            <div className="flex-1 min-w-0">
              <TagChipsEditor tags={tags} setTags={setTags} compact />
            </div>
          </div>
        </div>

        {/* Mobile Created Metadata */}
        <div className="flex sm:hidden items-center justify-between text-xs text-slate-400 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Created: {formatNoteDate(creation)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <NoteModalFooter
        leftContent={<span className="hidden sm:inline">Created: {formatNoteDate(creation)}</span>}
        onCancel={onClose}
        loading={loading}
      />
    </div>
  );
}
