import { useState, useEffect, useRef } from "react";
import { X, Sparkles, Loader2, Edit } from "lucide-react";
import Markdown from "react-markdown";
import { getDB } from "../services/indexedDB";
import { motion, AnimatePresence } from "framer-motion";
import LinkPreviewCard from "./LinkPreviewCard";
import { isValidHttpUrl } from "../hooks/useLinkPreview";

export default function ViewNote({
  isOpen,
  setView,
  onSubmit,
  loading,
  noteid,
  notes,
  userId,
}) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [creation, setCreated] = useState("");
  const [noteType, setNoteType] = useState("");
  const [audioError, setAudioError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const audioBlobUrlRef = useRef(null);

  const selectedNote = notes.find((note) => note.id == noteid);

  useEffect(() => {
    if (!selectedNote) return;
    setId(selectedNote.id);
    setTitle(selectedNote.title || "");
    setContent(selectedNote.content || "");
    setTags(selectedNote.tags || "");
    setCreated(selectedNote.created_at || "");
    setNoteType(selectedNote.note_type || "");
    setAudioError(false);
    setImageError(false);

    // Clean up previously created temporary blob URL
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }

    let resolvedSource =
      selectedNote.source_url || selectedNote.sourceUrl || "";

    // 1. If the selected note in memory has a mediaBlob, generate a fresh live blob URL
    if (selectedNote.mediaBlob instanceof Blob) {
      const freshBlob = URL.createObjectURL(selectedNote.mediaBlob);
      audioBlobUrlRef.current = freshBlob;
      resolvedSource = freshBlob;
    }

    setSourceUrl(resolvedSource);

    // 2. For both voice and image notes without an active mediaBlob in memory,
    // check IndexedDB cache so offline previews work even after state refreshes.
    if (
      (selectedNote.note_type === "voice" || selectedNote.note_type === "img") &&
      !(selectedNote.mediaBlob instanceof Blob)
    ) {
      getDB(userId || selectedNote?.user_id)
        .then((db) => {
          const tx = db.transaction("notes", "readonly");
          const req = tx.objectStore("notes").get(selectedNote.id);
          req.onsuccess = () => {
            const stored = req.result;
            if (stored?.mediaBlob instanceof Blob) {
              if (audioBlobUrlRef.current) {
                URL.revokeObjectURL(audioBlobUrlRef.current);
              }
              const freshBlob = URL.createObjectURL(stored.mediaBlob);
              audioBlobUrlRef.current = freshBlob;
              setSourceUrl(freshBlob);
              setAudioError(false);
              setImageError(false);
            }
          };
        })
        .catch((err) =>
          console.warn("Failed to check IndexedDB for media blob:", err),
        );
    }

    return () => {
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
        audioBlobUrlRef.current = null;
      }
    };
  }, [selectedNote, userId]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !content) return;

    // Normalize tags: clean commas/spaces and strip leading #
    const tagArray = tags
      .split(/[, ]+/)
      .map((t) => t.replace(/^#+/, "").trim())
      .filter(Boolean);

    // Avoid overwriting a persisted remote source_url with a temporary local blob: URL when saving edits.
    const originalSource = selectedNote?.source_url || selectedNote?.sourceUrl || "";
    const persistedSourceUrl =
      noteType !== "text" &&
      sourceUrl.startsWith("blob:") &&
      originalSource &&
      !originalSource.startsWith("blob:")
        ? originalSource
        : sourceUrl;

    onSubmit({
      id,
      title,
      content,
      tags: tagArray.toString(),
      source_url: persistedSourceUrl,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 overflow-y-auto overscroll-contain p-3 sm:p-4 md:p-6 select-none">
          {/* Backdrop mask (fixed so it covers the viewport even when modal content scrolls on mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => setView(false)}
          />

          <div className="flex min-h-full items-start lg:items-center justify-center">
            {/* Modal Card + optional right-side Link Preview card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="relative z-10 my-auto flex flex-col lg:flex-row items-stretch lg:items-start justify-start lg:justify-center gap-3 sm:gap-4 w-full max-w-6xl"
            >
            <div className="relative w-full mx-auto lg:mx-0 lg:flex-1 min-w-0 max-w-3xl glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border border-white/10">
            <button
              onClick={() => setView(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-1  rounded-xl text-purple-400">
            <Edit className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">View Note</h2>
          </div>
        </div>

        {/* Fields */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full py-3 px-4 text-white placeholder-slate-600 rounded-xl text-2xl"
              placeholder="Title"
              required
            />
          </div>

          <div className="space-y-2">
            {noteType === "voice" ? (
              <div className="space-y-3">
                {sourceUrl && (
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-green-400/80">
                        Voice Recording
                      </span>
                      {sourceUrl.startsWith("http") && (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-purple-300 hover:text-purple-200 underline cursor-pointer"
                        >
                          Direct link
                        </a>
                      )}
                    </div>
                    <audio
                      key={sourceUrl}
                      controls
                      preload="auto"
                      src={sourceUrl}
                      className="w-full h-9 rounded-lg"
                      onError={(e) => {
                        console.error("Audio playback error for URL:", sourceUrl, e);
                        setAudioError(true);
                      }}
                    />
                    {audioError && (
                      <p className="text-xs text-red-400 mt-0.5">
                        Browser could not play this audio source directly. Click "Direct link" above to open or download it.
                      </p>
                    )}
                  </div>
                )}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="glass-input w-full h-44 md:h-[320px] py-3 px-4 text-white placeholder-slate-600 rounded-xl text-sm resize-none"
                  placeholder="Voice transcription..."
                  required
                />
              </div>
            ) : noteType === "img" ? (
              <div className="flex flex-col justify-center items-center gap-2">
                {sourceUrl && !imageError ? (
                  <img
                    src={sourceUrl}
                    alt={title || "img"}
                    className="max-h-[300px] rounded-2xl"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <p className="text-xs text-slate-400 py-8">
                    Image preview is unavailable offline.
                  </p>
                )}
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="glass-input w-full h-44 sm:h-56 lg:h-[380px] py-3 px-4 text-white placeholder-slate-600 rounded-xl text-sm resize-none"
                placeholder="Write the core details, ideas, or insights..."
                required
              />
            )}
          </div>
          {/* 
          <ComboBox
            key={noteid}
            folders={folders}
            folder={collection}
            setFolder={setCollection}
          /> */}

          <div className="space-y-2">
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="glass-input w-full py-3 px-4 text-white placeholder-slate-600 rounded-xl text-sm"
              placeholder="Tags"
            />
          </div>

          {noteType == "text" && (
            <div className="space-y-2">
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="glass-input w-full py-3 px-4 text-white placeholder-slate-600 rounded-xl text-sm"
                placeholder="Source Url"
              />
            </div>
          )}
          <span className="text-sm">created at: {formatDate(creation)}</span>

          {/* Form Actions */}
          <div className="flex gap-4 pt-3">
            <button
              type="button"
              onClick={() => setView(false)}
              className="flex-1 py-3 px-4 bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-white/10 text-slate-300 font-semibold rounded-xl transition-all duration-200 cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-[#717171] hover:bg-[#4d4d4d] text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
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
        </form>
            </div>

            {noteType === "text" && isValidHttpUrl(sourceUrl) && (
              <div className="w-full max-w-3xl mx-auto lg:mx-0 lg:w-80 xl:w-96 shrink-0 glass-panel rounded-2xl sm:rounded-3xl p-4 shadow-2xl border border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
                  Source Preview
                </p>
                <LinkPreviewCard url={sourceUrl} />
              </div>
            )}
            </motion.div>
          </div>
    </div>
  )}
</AnimatePresence>
  );
}
