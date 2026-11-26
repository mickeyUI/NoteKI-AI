import { ArrowLeft, X, Edit, FileText, Folder, Tag, Link2, ExternalLink, Calendar } from "lucide-react";
import LinkPreviewCard from "./LinkPreviewCard";
import { isValidHttpUrl } from "../hooks/useLinkPreview";
import { TagChipsEditor, NoteModalFooter, formatNoteDate } from "./ViewNoteShared";

/**
 * Text note viewer/editor matching the structured single-column layout with
 * collection selector, tag chips, source URL, and embedded source preview.
 * Uses a sticky header/footer full-screen layout on mobile and modal layout on PC.
 */
export default function ViewTextNote({
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
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const folderOptions = Array.from(
    new Set(["none", ...(Array.isArray(folders) ? folders : []), ...(group ? [group] : [])]),
  );

  return (
    <div className="flex flex-col h-full sm:block sm:space-y-4">
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
          <div className="hidden sm:block p-2 bg-white/5 border border-white/10 rounded-xl text-slate-200 shrink-0">
            <Edit className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white shrink-0">
            View Note
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-medium text-slate-200 shrink-0">
            <FileText className="w-3 h-3" />
            Text Note
          </span>
          <span className="text-xs text-slate-400 truncate hidden sm:inline">
            {wordCount} {wordCount === 1 ? "word" : "words"}
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

      {/* Scrollable Body on Mobile, Standard Flow on PC */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-0 sm:overflow-visible space-y-4">
        {/* Mobile Type & Word Count Sub-row */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] font-medium text-slate-200">
            <FileText className="w-3 h-3" />
            Text Note
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-400 font-medium">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="glass-input w-full py-3 px-4 text-white placeholder-slate-500 rounded-xl text-lg sm:text-xl font-bold focus:outline-none"
          placeholder="Title"
          required
        />

        {/* Content textarea with Markdown hint */}
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="glass-input w-full h-44 sm:h-52 py-3 px-4 pb-7 text-white placeholder-slate-500 rounded-xl text-sm leading-relaxed resize-none focus:outline-none"
            placeholder="Write the core details, ideas, or insights..."
            required
          />
          <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-[10px] font-mono text-slate-500">
            Markdown supported
          </span>
        </div>

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

        {/* Source URL Row */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <Link2 className="w-3.5 h-3.5 text-slate-300" />
            <span>Source URL</span>
          </div>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
            placeholder="https://..."
          />
          {isValidHttpUrl(sourceUrl) && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-slate-400 hover:text-white transition-colors shrink-0"
              title="Open source URL"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Embedded Source Preview */}
        {isValidHttpUrl(sourceUrl) && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Source Preview
            </p>
            <LinkPreviewCard url={sourceUrl} />
          </div>
        )}

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
