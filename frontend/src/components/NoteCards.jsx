import { useState, useEffect, useRef } from "react";
import { Pin, Trash2Icon, Mic, Play, Pause, ExternalLink, Globe } from "lucide-react";
import { useLinkPreview, isValidHttpUrl } from "../hooks/useLinkPreview";

const WAVEFORM_BARS = [
  35, 60, 45, 85, 55, 95, 70, 40, 80, 65, 90, 50, 75, 45, 65, 35,
];

/**
 * Format seconds as m:ss (e.g. 0:03) for the inline voice note player.
 */
function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Extract a clean hostname from a URL for compact link preview display.
 */
function getShortDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Compact horizontal link preview strip rendered inside text note cards that have a source URL.
 */
function MiniLinkPreview({ url }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const { data, isLoading, isError } = useLinkPreview(url);

  if (!isValidHttpUrl(url)) return null;

  const domain = data?.domain || getShortDomain(url);
  const targetHref = data?.url || url;

  if (isLoading) {
    return (
      <div className="mt-2 h-10 w-full rounded-xl bg-white/[0.04] border border-white/10 animate-pulse" />
    );
  }

  const imgFailed = failedImageUrl === data?.image;
  const showImage = !isError && Boolean(data?.image) && !imgFailed;

  if (showImage) {
    return (
      <a
        href={targetHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-2 flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors group/link min-w-0"
        title={targetHref}
      >
        <img
          src={data.image}
          alt={data.title || domain}
          onError={() => setFailedImageUrl(data.image)}
          className="w-8 h-8 rounded-lg object-cover shrink-0 bg-black/30"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-200 truncate">
            {data.title || domain}
          </p>
          <p className="text-[10px] text-slate-400 truncate">{domain}</p>
        </div>
        <ExternalLink className="w-3 h-3 text-slate-400 group-hover/link:text-white shrink-0 transition-colors" />
      </a>
    );
  }

  return (
    <a
      href={targetHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] text-slate-300 hover:text-white transition-colors max-w-full"
      title={targetHref}
    >
      <Globe className="w-3 h-3 text-slate-400 shrink-0" />
      <span className="truncate">{domain}</span>
      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
    </a>
  );
}

/**
 * Return a persisted media URL only if it is not a stale session-only blob: URL.
 */
function getSafeMediaUrl(url) {
  if (!url || typeof url !== "string") return null;
  return url.startsWith("blob:") ? null : url;
}

/**
 * Renders a single note card (Voice, Image, or Text) in the NotesFeed grid.
 */
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
  const [imgSrc, setImgSrc] = useState(() => getSafeMediaUrl(note.source_url));
  const [audioSrc, setAudioSrc] = useState(() =>
    note.note_type === "voice" ? getSafeMediaUrl(note.source_url) : null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const blobUrlRef = useRef(null);
  const audioBlobUrlRef = useRef(null);
  const audioRef = useRef(null);

  // Resolve a live Blob URL for image card thumbnails when offline or if the remote URL fails.
  useEffect(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (
      note.note_type === "img" &&
      note.mediaBlob instanceof Blob &&
      (!navigator.onLine || !note.source_url || note.source_url.startsWith("blob:"))
    ) {
      const freshUrl = URL.createObjectURL(note.mediaBlob);
      blobUrlRef.current = freshUrl;
      setImgSrc(freshUrl);
    } else {
      setImgSrc(getSafeMediaUrl(note.source_url));
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [note.note_type, note.source_url, note.mediaBlob]);

  // Resolve a live Blob URL for inline voice playback when offline or using local mediaBlob.
  useEffect(() => {
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (note.note_type !== "voice") {
      setAudioSrc(null);
      return undefined;
    }

    if (
      note.mediaBlob instanceof Blob &&
      (!navigator.onLine || !note.source_url || note.source_url.startsWith("blob:"))
    ) {
      const freshUrl = URL.createObjectURL(note.mediaBlob);
      audioBlobUrlRef.current = freshUrl;
      setAudioSrc(freshUrl);
    } else {
      setAudioSrc(getSafeMediaUrl(note.source_url));
    }

    return () => {
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
        audioBlobUrlRef.current = null;
      }
    };
  }, [note.note_type, note.source_url, note.mediaBlob]);

  const handleImgError = () => {
    if (note.mediaBlob instanceof Blob && !blobUrlRef.current) {
      const freshUrl = URL.createObjectURL(note.mediaBlob);
      blobUrlRef.current = freshUrl;
      setImgSrc(freshUrl);
    }
  };

  /**
   * Toggle inline audio playback for voice notes without opening the ViewNote modal.
   */
  const toggleVoicePlayback = async (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      // Fall back to local mediaBlob if remote URL playback fails.
      if (note.mediaBlob instanceof Blob && !audioBlobUrlRef.current) {
        const freshUrl = URL.createObjectURL(note.mediaBlob);
        audioBlobUrlRef.current = freshUrl;
        setAudioSrc(freshUrl);
      }
      setIsPlaying(false);
    }
  };

  const toggleVisable = (id) => {
    setNoteViewOpen(true);
    setNoteViewId(id);
  };

  const tagsArr = Array.isArray(note.tags)
    ? note.tags
    : typeof note.tags === "string"
      ? note.tags
          .split(/[, ]+/)
          .map((t) => t.replace(/^#+/, "").trim())
          .filter(Boolean)
      : [];

  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const textSourceUrl = note.source_url || note.sourceUrl || "";
  const hasTextLink =
    note.note_type !== "voice" &&
    note.note_type !== "img" &&
    isValidHttpUrl(textSourceUrl);

  return (
    <div
      key={note.id}
      onClick={(e) => {
        e.stopPropagation();
        toggleVisable(note.id);
      }}
      className={`glass-panel glass-panel-hover rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-w-[260px] h-[235px] relative group select-none cursor-pointer ${
        isPinned ? "border-amber-400 border-2" : ""
      }`}
    >
      {/* Top Action Row: Pin + Delete */}
      <div className="flex items-center justify-between -mt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(note.id);
          }}
          className={`btn-style transition-opacity ${
            isPinned
              ? "bg-purple-500/20 border-purple-500/40 text-purple-200 opacity-100"
              : "bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300 opacity-30 group-hover:opacity-100"
          }`}
          title={isPinned ? "Unpin card" : "Pin card"}
        >
          <Pin className="w-3.5 h-3.5" fill={isPinned ? "currentColor" : "none"} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteNote(note.id);
          }}
          className="btn-style opacity-30 group-hover:opacity-100"
          title="Delete note"
        >
          <Trash2Icon className="w-3.5 h-3.5 text-purple-200 hover:text-red-400" />
        </button>
      </div>

      {/* Card Body by Note Type */}
      {note.note_type === "voice" ? (
        <div className="flex-1 flex flex-col justify-center gap-2.5 my-1 min-h-0">
          <div className="flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-sm font-bold text-emerald-400 truncate">
              {note.title}
            </h3>
          </div>

          {/* Inline Audio Player */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-black/25 border border-white/10"
          >
            {audioSrc && (
              <audio
                ref={audioRef}
                src={audioSrc}
                preload="metadata"
                onLoadedMetadata={(e) => {
                  if (Number.isFinite(e.currentTarget.duration)) {
                    setDuration(e.currentTarget.duration);
                  }
                }}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onEnded={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                }}
              />
            )}
            <button
              type="button"
              onClick={toggleVoicePlayback}
              disabled={!audioSrc}
              aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
              className="w-7 h-7 rounded-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" fill="currentColor" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
              )}
            </button>

            <div className="flex-1 flex items-center justify-between gap-0.5 h-6 px-1">
              {WAVEFORM_BARS.map((height, idx) => {
                const barRatio = (idx + 1) / WAVEFORM_BARS.length;
                const active =
                  progressRatio > 0
                    ? barRatio <= progressRatio
                    : idx < 6;
                return (
                  <span
                    key={idx}
                    style={{ height: `${height}%` }}
                    className={`w-1 rounded-full transition-colors ${
                      active ? "bg-emerald-400" : "bg-white/20"
                    }`}
                  />
                );
              })}
            </div>

            <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
              {formatAudioTime(isPlaying || currentTime > 0 ? currentTime : duration)}
            </span>
          </div>

          <p className="text-xs internal leading-relaxed line-clamp-2 opacity-80">
            {note.content}
          </p>
        </div>
      ) : note.note_type === "img" ? (
        <div className="flex-1 flex items-center my-1.5 min-h-0">
          <div className="relative w-full h-28 rounded-xl overflow-hidden bg-black/30 border border-white/10">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={note.title}
                onError={handleImgError}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 pt-6">
              <h3 className="text-sm font-bold text-white truncate">
                {note.title}
              </h3>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-start pt-2 min-h-0">
          <h3 className="text-base font-bold internal truncate mb-1.5">
            {note.title}
          </h3>
          <p
            className={`text-xs internal leading-relaxed opacity-80 ${
              hasTextLink ? "line-clamp-2" : "line-clamp-3"
            }`}
          >
            {note.content}
          </p>
          {hasTextLink && <MiniLinkPreview url={textSourceUrl} />}
        </div>
      )}

      {/* Footer: Tags + Date */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {tagsArr.slice(0, 2).map((tag, tagIdx) => (
            <span
              key={tagIdx}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectTag) onSelectTag(tag);
              }}
              className="text-[10px] font-bold btn-style cursor-pointer truncate max-w-[90px]"
            >
              #{tag}
            </span>
          ))}
        </div>

        <span className="internal opacity-50 text-[11px] shrink-0">
          {formatDate(note.updated_at)}
        </span>
      </div>
    </div>
  );
}
