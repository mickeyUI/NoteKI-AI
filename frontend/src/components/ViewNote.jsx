import { useState, useEffect, useRef, useCallback } from "react";
import { getDB } from "../services/indexedDB";
import { motion, AnimatePresence } from "framer-motion";
import ViewTextNote from "./ViewTextNote";
import ViewImageNote from "./ViewImageNote";
import ViewVoiceNote from "./ViewVoiceNote";
import ViewLinkNote from "./ViewLinkNote";
import { parseTagList } from "./ViewNoteShared";

/**
 * Return the persisted source URL for a note, stripping stale session-only
 * blob: URLs when no live Blob is attached.
 */
function getInitialSourceUrl(note) {
  const raw = note?.source_url || note?.sourceUrl || "";
  if (raw.startsWith("blob:") && !(note?.mediaBlob instanceof Blob)) {
    return "";
  }
  return raw;
}

/**
 * Keyed inner note editor/viewer mounted fresh for each selected note ID so
 * opening a note never flashes the previous note's type or content.
 */
function ViewNoteContent({
  selectedNote,
  setView,
  onSubmit,
  onDelete,
  loading,
  folders = [],
  userId,
}) {
  const [title, setTitle] = useState(() => selectedNote.title || "");
  const [content, setContent] = useState(() => selectedNote.content || "");
  const [tags, setTags] = useState(() => selectedNote.tags || "");
  const [sourceUrl, setSourceUrl] = useState(() => getInitialSourceUrl(selectedNote));
  const [group, setGroup] = useState(() => selectedNote.group || "none");
  const [mediaBlob, setMediaBlob] = useState(() =>
    selectedNote.mediaBlob instanceof Blob ? selectedNote.mediaBlob : null,
  );
  const [audioError, setAudioError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const audioBlobUrlRef = useRef(null);

  const id = selectedNote.id;
  const creation = selectedNote.created_at || "";
  const noteType = selectedNote.note_type || "text";

  // Create a fresh object URL for attached Blobs or load cached media from IndexedDB.
  useEffect(() => {
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }

    if (selectedNote.mediaBlob instanceof Blob) {
      const freshBlob = URL.createObjectURL(selectedNote.mediaBlob);
      audioBlobUrlRef.current = freshBlob;
      setSourceUrl(freshBlob);
      return () => {
        if (audioBlobUrlRef.current) {
          URL.revokeObjectURL(audioBlobUrlRef.current);
          audioBlobUrlRef.current = null;
        }
      };
    }

    if (noteType === "voice" || noteType === "img") {
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
  }, [selectedNote, noteType, userId]);

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
        : sourceUrl.startsWith("blob:")
          ? ""
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
  }, [setView, submitChanges]);

  return (
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
      ) : noteType === "link" ? (
        <ViewLinkNote
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
      ) : (
        <ViewTextNote
          title={title}
          setTitle={setTitle}
          content={content}
          setContent={setContent}
          tags={tags}
          setTags={setTags}
          group={group}
          setGroup={setGroup}
          folders={folders}
          creation={creation}
          loading={loading}
          onClose={() => setView(false)}
        />
      )}
    </form>
  );
}

/**
 * Shared modal shell for viewing and editing text, link, image, and voice notes.
 * Renders as a full-screen sheet with sticky header/footer on mobile (< 640px)
 * and as a centered glass modal on desktop/PC.
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
  const selectedNote = notes.find((note) => note.id == noteid);
  const noteType = selectedNote?.note_type || "text";
  const modalMaxWidth = noteType === "img" ? "max-w-4xl" : "max-w-2xl";

  return (
    <AnimatePresence>
      {isOpen && selectedNote && (
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
              <ViewNoteContent
                key={selectedNote.id}
                selectedNote={selectedNote}
                setView={setView}
                onSubmit={onSubmit}
                onDelete={onDelete}
                loading={loading}
                folders={folders}
                userId={userId}
              />
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
