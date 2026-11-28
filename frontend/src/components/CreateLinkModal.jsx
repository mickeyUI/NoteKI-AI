import { useEffect, useState } from "react";
import { X, Link2, Sparkles, Loader2 } from "lucide-react";
import { CollectionAndTagsRow } from "./ViewNoteShared";
import LinkPreviewCard from "./LinkPreviewCard";
import { useLinkPreview, isValidHttpUrl } from "../hooks/useLinkPreview";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Extract a clean hostname fallback from a URL when no explicit title is provided.
 */
function getHostnameFallback(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Modal for saving a standalone web link with live Open Graph preview, optional
 * title, commentary notes, collection assignment, and tags.
 */
export default function CreateLinkModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
  folders,
}) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [collection, setCollection] = useState("none");
  const [titleEdited, setTitleEdited] = useState(false);

  const validUrl = isValidHttpUrl(sourceUrl.trim());
  const { data: previewData } = useLinkPreview(validUrl ? sourceUrl.trim() : "");

  // Auto-fill the title from fetched link preview metadata unless the user typed one.
  useEffect(() => {
    if (!titleEdited && previewData?.title) {
      setTitle(previewData.title);
    }
  }, [previewData?.title, titleEdited]);

  /**
   * Validate the URL, normalize tags, and submit the link as a note_type="link" record.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedUrl = sourceUrl.trim();
    if (!isValidHttpUrl(trimmedUrl)) return;

    const tagArray = tags
      .split(/[, ]+/)
      .map((t) => t.replace(/^#+/, "").trim())
      .filter(Boolean);

    const resolvedTitle =
      title.trim() || previewData?.title || getHostnameFallback(trimmedUrl);

    onSubmit({
      title: resolvedTitle,
      content: content.trim(),
      tags: tagArray.toString(),
      source_url: trimmedUrl,
      group: collection,
      note_type: "link",
    });

    setSourceUrl("");
    setTitle("");
    setContent("");
    setTags("");
    setCollection("none");
    setTitleEdited(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="relative z-10 w-full max-w-2xl glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-1 rounded-xl text-purple-400">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold internal">Save Link</h2>
                <p className="text-xs internal opacity-80 font-medium">
                  Bookmark a URL with automatic preview and AI search indexing
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="glass-input w-full py-3 px-4 text-white placeholder-white/25 rounded-xl text-sm"
                  placeholder="https://example.com/article"
                  required
                  autoFocus
                />
              </div>

              {validUrl && (
                <div className="pt-1">
                  <LinkPreviewCard url={sourceUrl.trim()} />
                </div>
              )}

              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTitleEdited(true);
                  }}
                  className="glass-input w-full py-3 px-4 text-white placeholder-white/25 rounded-xl text-sm"
                  placeholder="Title (auto-filled from link if left blank)"
                />
              </div>

              <div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="glass-input w-full h-28 py-3 px-4 text-white placeholder-white/25 rounded-xl text-sm resize-none"
                  placeholder="Optional notes or why you saved this link..."
                />
              </div>

              <CollectionAndTagsRow
                folders={folders}
                group={collection}
                setGroup={setCollection}
                tags={tags}
                setTags={setTags}
              />

              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-white/10 text-slate-300 font-semibold rounded-xl transition-all duration-200 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !validUrl}
                  className="flex-1 py-3 px-4 bg-[#717171] hover:bg-[#4d4d4d] disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Save Link</span>
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
