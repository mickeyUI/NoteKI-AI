import { useState, useEffect, useRef, useCallback } from "react";
import { getDB } from "../services/indexedDB";
import { motion, AnimatePresence } from "framer-motion";
import ViewTextNote from "./ViewTextNote";
import ViewImageNote from "./ViewImageNote";
import ViewVoiceNote from "./ViewVoiceNote";
import { parseTagList } from "./ViewNoteShared";

/**
 * Shared modal shell for viewing and editing text, image, and voice notes.
 * Renders as a full-screen sheet with sticky header/footer on mobile (< 640px)
 * and as a centered glass modal on desktop/PC, while handling IndexedDB media
 * blob loading and keyboard shortcuts (Esc, Ctrl/Cmd+S).
 */
export default function ViewNote({
  isOpen,
  setView,
  onSubmit,
  onDelete,
  loading,
  noteid,
  notes,
  folders = [],
  userId,
}) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [group, setGroup] = useState("none");
  const [creation, setCreated] = useState("");
  const [noteType, setNoteType] = useState("");
  const [mediaBlob, setMediaBlob] = useState(null);
  const [audioError, setAudioError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const audioBlobUrlRef = useRef(null);

  const selectedNote = notes.find((note) => note.id == noteid);

  // Sync local form state and resolve local mediaBlob URLs whenever the selected note changes.
  useEffect(() => {
    if (!selectedNote) return;
    setId(selectedNote.id);
    setTitle(selectedNote.title || "");
    setContent(selectedNote.content || "");
    setTags(selectedNote.tags || "");
    setGroup(selectedNote.group || "none");
    setCreated(selectedNote.created_at || "");
    setNoteType(selectedNote.note_type || "text");
    setAudioError(false);
    setImageError(false);
    setMediaBlob(
      selectedNote.mediaBlob instanceof Blob ? selectedNote.mediaBlob : null,
    );

    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }

    let resolvedSource =
      selectedNote.source_url || selectedNote.sourceUrl || "";

    if (selectedNote.mediaBlob instanceof Blob) {
      const freshBlob = URL.createObjectURL(selectedNote.mediaBlob);
      audioBlobUrlRef.current = freshBlob;
      resolvedSource = freshBlob;
    }

    setSourceUrl(resolvedSource);

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
              setMediaBlob(stored.mediaBlob);
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

  // Submit edited note fields while preserving persisted remote media URLs.
  const submitChanges = useCallback(() => {
    if (!title || (!content && noteType !== "img")) return;

    const tagArray = parseTagList(tags);
    const originalSource =
      selectedNote?.source_url || selectedNote?.sourceUrl || "";
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
      group: group || "none",
    });
  }, [id, title, content, tags, sourceUrl, group, noteType, selectedNote, onSubmit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    submitChanges();
  };

  // Handle Escape to close and Ctrl/Cmd+S to save while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setView(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        submitChanges();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setView, submitChanges]);

  const modalMaxWidth = noteType === "img" ? "max-w-4xl" : "max-w-2xl";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 overflow-hidden sm:overflow-y-auto overscroll-contain p-0 sm:p-4 md:p-6 select-none">
          {/* Backdrop mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => setView(false)}
          />

          <div className="flex h-full sm:h-auto sm:min-h-full items-stretch sm:items-start lg:items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className={`relative z-10 sm:my-auto w-full h-dvh sm:h-auto ${modalMaxWidth} bg-[#121212] sm:bg-transparent glass-panel rounded-none sm:rounded-3xl p-0 sm:p-6 md:p-7 shadow-2xl border-0 sm:border sm:border-white/10 overflow-hidden sm:overflow-visible`}
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full sm:block">
                {noteType === "img" ? (
                  <ViewImageNote
                    id={id}
                    title={title}
                    setTitle={setTitle}
                    content={content}
                    setContent={setContent}
                    tags={tags}
                    setTags={setTags}
                    sourceUrl={sourceUrl}
                    creation={creation}
                    mediaBlob={mediaBlob}
                    imageError={imageError}
                    setImageError={setImageError}
                    loading={loading}
                    onClose={() => setView(false)}
                    onDelete={onDelete}
                  />
                ) : noteType === "voice" ? (
                  <ViewVoiceNote
                    title={title}
                    setTitle={setTitle}
                    content={content}
                    setContent={setContent}
                    tags={tags}
                    setTags={setTags}
                    sourceUrl={sourceUrl}
                    creation={creation}
                    mediaBlob={mediaBlob}
                    audioError={audioError}
                    setAudioError={setAudioError}
                    loading={loading}
                    onClose={() => setView(false)}
                  />
                ) : (
                  <ViewTextNote
                    title={title}
                    setTitle={setTitle}
                    content={content}
                    setContent={setContent}
                    tags={tags}
                    setTags={setTags}
                    sourceUrl={sourceUrl}
                    setSourceUrl={setSourceUrl}
                    group={group}
                    setGroup={setGroup}
                    folders={folders}
                    creation={creation}
                    loading={loading}
                    onClose={() => setView(false)}
                  />
                )}
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
