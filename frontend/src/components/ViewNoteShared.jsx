import { useState } from "react";
import { Plus, X, Sparkles, Loader2, Folder, Tag } from "lucide-react";

export const MAX_TAGS_PER_NOTE = 3;
export const MAX_TAG_LENGTH = 15;

/**
 * Parse a comma- or space-separated tags string into a deduplicated array of
 * clean tag names, clamped to MAX_TAG_LENGTH characters and MAX_TAGS_PER_NOTE items.
 */
export function parseTagList(tagsStr) {
  if (!tagsStr || typeof tagsStr !== "string") return [];
  const cleaned = tagsStr
    .split(/[, ]+/)
    .map((t) => t.replace(/^#+/, "").trim().slice(0, MAX_TAG_LENGTH))
    .filter(Boolean);
  return Array.from(new Set(cleaned)).slice(0, MAX_TAGS_PER_NOTE);
}

/**
 * Format an ISO date string into a readable date (and optional time) string.
 */
export function formatNoteDate(dateStr, includeTime = false) {
  if (!dateStr) return "Recently";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Recently";
  if (includeTime) {
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a byte count into a human-readable KB or MB string.
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract a clean hostname from a URL for compact metadata display.
 */
export function getDisplayDomain(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Interactive tag chips editor that keeps tags synced as a comma-separated string.
 */
export function TagChipsEditor({ tags, setTags, addLabel = "Add tag", compact = false }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const tagList = parseTagList(tags);
  const atLimit = tagList.length >= MAX_TAGS_PER_NOTE;

  // Add one or more tags entered by the user into the comma-separated tags string (up to MAX_TAGS_PER_NOTE).
  const commitTag = () => {
    const incoming = parseTagList(draft);
    if (incoming.length > 0 && !atLimit) {
      const merged = Array.from(new Set([...tagList, ...incoming])).slice(
        0,
        MAX_TAGS_PER_NOTE,
      );
      setTags(merged.join(","));
    }
    setDraft("");
    setAdding(false);
  };

  // Remove a single tag from the tags string.
  const removeTag = (tagToRemove) => {
    const next = tagList.filter((t) => t !== tagToRemove);
    setTags(next.join(","));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tagList.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-slate-200"
        >
          <span>#{tag}</span>
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={`Remove #${tag}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {adding && !atLimit ? (
        <input
          type="text"
          value={draft}
          maxLength={MAX_TAG_LENGTH}
          autoFocus
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_TAG_LENGTH))}
          onBlur={commitTag}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitTag();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setDraft("");
              setAdding(false);
            }
          }}
          placeholder={`max ${MAX_TAG_LENGTH} chars...`}
          className="glass-input px-2.5 py-1 text-xs text-white rounded-lg w-28 focus:outline-none"
        />
      ) : !atLimit ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={`Add tag (${tagList.length}/${MAX_TAGS_PER_NOTE})`}
        >
          <Plus className="w-3 h-3" />
          {!compact && <span>{addLabel}</span>}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Two-column collection selector and interactive tag chips row shared across
 * note creation and view modals.
 */
export function CollectionAndTagsRow({
  folders = [],
  group,
  setGroup,
  tags,
  setTags,
}) {
  const folderOptions = Array.from(
    new Set(["none", ...(Array.isArray(folders) ? folders : []), ...(group ? [group] : [])]),
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
          <Folder className="w-4 h-4 text-slate-300" />
          <span>collection</span>
        </div>
        <select
          value={group || "none"}
          onChange={(e) => setGroup(e.target.value)}
          className="min-w-0 flex-1 max-w-[150px] bg-[#1a1a1a] border border-white/10 text-slate-200 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer truncate"
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
  );
}

/**
 * Shared modal footer with an optional left metadata/action slot and Cancel / Save Memory buttons.
 * Sticks to the bottom of the viewport on mobile (< 640px) and sits inline at the bottom of the modal on PC.
 */
export function NoteModalFooter({ leftContent, onCancel, loading }) {
  return (
    <div className="shrink-0 sticky sm:static bottom-0 z-20 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-0 sm:py-0 sm:pt-4 bg-[#121212]/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-white/10">
      {leftContent && (
        <div className="text-xs text-slate-400 flex items-center gap-2">
          {leftContent}
        </div>
      )}
      <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 sm:flex-none py-2.5 px-5 bg-slate-900/50 hover:bg-slate-900 border border-white/10 text-slate-300 font-semibold text-xs sm:text-sm rounded-xl transition-all duration-200 cursor-pointer text-center"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 sm:flex-none py-2.5 px-5 bg-[#717171] hover:bg-[#4d4d4d] text-white font-semibold text-xs sm:text-sm rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.08)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Save Memory</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
