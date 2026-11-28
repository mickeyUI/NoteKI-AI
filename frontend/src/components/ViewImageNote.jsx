import { useState } from "react";
import {
  ArrowLeft,
  X,
  Image as ImageIcon,
  Share2,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Trash2,
  Calendar,
  Link2,
  Info,
  Check,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  TagChipsEditor,
  NoteModalFooter,
  formatNoteDate,
  formatBytes,
  getDisplayDomain,
} from "./ViewNoteShared";

/**
 * Image note viewer/editor with a two-column layout on desktop (Fit/Full image
 * preview on the left; extracted summary, tags, file metadata, and delete on
 * the right) and a single-column sticky-header/footer full-screen view on mobile.
 */
export default function ViewImageNote({
  id,
  title,
  setTitle,
  content,
  setContent,
  tags,
  setTags,
  sourceUrl,
  creation,
  mediaBlob,
  imageError,
  setImageError,
  loading,
  onClose,
  onDelete,
}) {
  const [fitMode, setFitMode] = useState("fit");
  const [dimensions, setDimensions] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Copy the extracted summary text to the user's clipboard.
  const handleCopySummary = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSummary(true);
      toast.success("Summary copied");
      setTimeout(() => setCopiedSummary(false), 1800);
    } catch {
      toast.error("Could not copy text");
    }
  };

  // Share the image note via Web Share API when available, falling back to copying the URL or summary.
  const handleShare = async () => {
    const shareUrl =
      sourceUrl && !sourceUrl.startsWith("blob:") ? sourceUrl : window.location.href;
    const shareText = content || title || "Image Note";
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Image Note",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(
        sourceUrl && !sourceUrl.startsWith("blob:") ? sourceUrl : shareText,
      );
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not share note");
    }
  };

  // Trigger a browser download for the active image URL or cached Blob.
  const handleDownload = () => {
    if (!sourceUrl) return;
    const link = document.createElement("a");
    link.href = sourceUrl;
    link.download = `${(title || "image-note").replace(/[^a-z0-9-_]+/gi, "_")}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Derive real browser-known file details (type, natural dimensions, cached blob size).
  const fileTypeLabel = mediaBlob?.type
    ? mediaBlob.type.split("/").pop()?.toUpperCase()
    : "";
  const dimLabel = dimensions ? `${dimensions.w}×${dimensions.h}` : "";
  const sizeLabel = mediaBlob instanceof Blob ? formatBytes(mediaBlob.size) : "";
  const fileInfoParts = [fileTypeLabel, dimLabel, sizeLabel].filter(Boolean);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="shrink-0 sticky sm:static top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-0 sm:py-0 sm:pb-3 bg-[#121212]/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden p-1.5 -ml-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base sm:text-lg font-bold text-white truncate sm:order-2">
            View Note
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-[11px] sm:text-xs font-medium text-slate-200 shrink-0 sm:order-1">
            <ImageIcon className="w-3.5 h-3.5" />
            Image Note
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCopySummary}
            disabled={!content}
            className="hidden sm:inline-flex p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-30"
            title="Copy extracted summary"
          >
            {copiedSummary ? (
              <Check className="w-4 h-4 text-slate-200" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          {sourceUrl && (
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 sm:px-1 sm:py-4 space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="block sm:hidden text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Title
          </label>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full py-3 px-4 pr-10 sm:pr-4 text-white placeholder-slate-500 rounded-xl text-base sm:text-xl font-bold focus:outline-none"
              placeholder="Title"
              required
            />
            <Pencil className="sm:hidden pointer-events-none w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Two-Column Body on PC, Single-Column on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-stretch">
          {/* Left: Image Preview */}
          <div className="relative rounded-2xl bg-white/[0.03] border border-white/10 p-3 flex items-center justify-center min-h-[240px] sm:min-h-[260px] lg:min-h-[340px] overflow-hidden">
            {sourceUrl && !imageError ? (
              <div
                className={`w-full flex items-center justify-center ${
                  fitMode === "full" ? "max-h-[360px] overflow-auto" : "h-full"
                }`}
              >
                <img
                  src={sourceUrl}
                  alt={title || "Image note"}
                  onLoad={(e) =>
                    setDimensions({
                      w: e.currentTarget.naturalWidth,
                      h: e.currentTarget.naturalHeight,
                    })
                  }
                  onError={() => setImageError(true)}
                  className={`rounded-xl transition-all duration-200 ${
                    fitMode === "fit"
                      ? "max-h-[310px] w-auto object-contain"
                      : "w-full h-auto object-cover"
                  }`}
                />
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center">
                Image preview is unavailable offline.
              </p>
            )}

            {sourceUrl && !imageError && (
              <div className="absolute bottom-3 right-3 inline-flex items-center rounded-xl bg-black/70 backdrop-blur-md border border-white/10 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFitMode("fit")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    fitMode === "fit"
                      ? "bg-white/15 text-white font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Minimize2 className="w-3 h-3" />
                  Fit
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode("full")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    fitMode === "full"
                      ? "bg-white/15 text-white font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Maximize2 className="w-3 h-3" />
                  Full
                </button>
              </div>
            )}
          </div>

          {/* Right: Extracted Summary, Tags & Metadata */}
          <div className="flex flex-col justify-between gap-4">
            {/* Extracted Summary */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Extracted Summary
                </span>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  disabled={!content}
                  className="text-[11px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
                >
                  {copiedSummary ? "COPIED" : "COPY ALL"}
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-28 bg-transparent text-xs sm:text-sm text-slate-200 placeholder-slate-500 leading-relaxed resize-none focus:outline-none"
                placeholder="Extracted image text or summary..."
                required
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tags
              </p>
              <TagChipsEditor tags={tags} setTags={setTags} addLabel="Add tag" />
            </div>

            {/* Metadata List */}
            <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Created at
                </span>
                <span className="text-slate-200 font-medium">
                  {formatNoteDate(creation, true)}
                </span>
              </div>

              {sourceUrl && !sourceUrl.startsWith("blob:") && (
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-slate-400 shrink-0">
                    <Link2 className="w-3.5 h-3.5" />
                    Source
                  </span>
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-300 hover:text-white underline truncate max-w-[200px]"
                    title={sourceUrl}
                  >
                    {getDisplayDomain(sourceUrl)}
                  </a>
                </div>
              )}

              {fileInfoParts.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <Info className="w-3.5 h-3.5" />
                    File info
                  </span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {fileInfoParts.join(" • ")}
                  </span>
                </div>
              )}

              {onDelete && (
                <div className="pt-2 sm:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDelete(id);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400/80 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete note
                  </button>
                </div>
              )}
            </div>

            {/* Keyboard Shortcut Hints */}
            <div className="hidden sm:flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                  Esc
                </kbd>
                Cancel
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                  Ctrl+S
                </kbd>
                Save Memory
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <NoteModalFooter
        leftContent={
          onDelete ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(id);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-red-400/80 hover:text-red-300 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete note
            </button>
          ) : (
            <span className="hidden sm:inline">Created: {formatNoteDate(creation)}</span>
          )
        }
        onCancel={onClose}
        loading={loading}
      />
    </div>
  );
}
