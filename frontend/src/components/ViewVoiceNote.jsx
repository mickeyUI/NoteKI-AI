import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  X,
  Edit,
  Mic,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  TagChipsEditor,
  NoteModalFooter,
  formatNoteDate,
  formatBytes,
} from "./ViewNoteShared";

const WAVEFORM_BARS = [
  32, 56, 78, 45, 92, 64, 40, 85, 58, 70, 36, 95, 62, 48, 82, 52, 74, 38, 88,
  60, 44, 72, 50, 66, 35, 80, 54, 42, 68, 36,
];
const SPEED_OPTIONS = [1, 1.25, 1.5, 2];

/**
 * Format seconds into a m:ss audio timer string.
 */
function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Voice note viewer/editor with custom waveform audio player, playback speed &
 * volume controls, editable AI transcript, and tag chips.
 * Uses a sticky header/footer full-screen layout on mobile and modal layout on PC.
 */
export default function ViewVoiceNote({
  title,
  setTitle,
  content,
  setContent,
  tags,
  setTags,
  sourceUrl,
  creation,
  mediaBlob,
  audioError,
  setAudioError,
  loading,
  onClose,
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Reset playback indicators when the audio source changes.
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [sourceUrl]);

  // Toggle play/pause on Spacebar when the user is not typing inside an input or textarea.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== "Space") return;
      const tagName = document.activeElement?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
        return;
      }
      e.preventDefault();
      if (!audioRef.current) return;
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => setAudioError(true));
      } else {
        audioRef.current.pause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setAudioError]);

  // Toggle audio playback safely.
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setAudioError(true));
    } else {
      audio.pause();
    }
  };

  // Seek audio to the clicked position along the waveform bar track.
  const handleWaveformSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  // Update playback speed on the underlying audio element.
  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Update volume slider on the underlying audio element.
  const handleVolumeChange = (nextVol) => {
    setVolume(nextVol);
    setIsMuted(nextVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = nextVol;
      audioRef.current.muted = nextVol === 0;
    }
  };

  // Toggle audio mute state.
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
  };

  // Copy transcript text to clipboard.
  const handleCopyTranscript = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedTranscript(true);
      toast.success("Transcript copied");
      setTimeout(() => setCopiedTranscript(false), 1800);
    } catch {
      toast.error("Could not copy transcript");
    }
  };

  // Download the audio source or cached blob.
  const handleDownloadAudio = () => {
    if (!sourceUrl) return;
    const link = document.createElement("a");
    link.href = sourceUrl;
    link.download = `${(title || "voice-note").replace(/[^a-z0-9-_]+/gi, "_")}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const formatType = mediaBlob?.type
    ? mediaBlob.type.split("/").pop()?.toUpperCase()
    : sourceUrl && !sourceUrl.startsWith("blob:")
      ? sourceUrl.split("?")[0].split(".").pop()?.toUpperCase()
      : "";
  const formatSize = mediaBlob instanceof Blob ? formatBytes(mediaBlob.size) : "";
  const formatParts = [formatType, formatSize].filter(Boolean);

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
          <div className="hidden sm:block p-2 bg-white/5 border border-white/10 rounded-xl text-slate-200 shrink-0">
            <Edit className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="hidden sm:block text-base sm:text-lg font-bold text-white shrink-0">
                View Note
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-medium text-slate-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                Voice Note
              </span>
            </div>
            {duration > 0 && (
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 sm:mt-0">
                {formatAudioTime(duration)}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="hidden sm:block p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 sm:px-1 sm:py-4 space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="glass-input w-full py-3 px-4 text-white placeholder-slate-500 rounded-xl text-base sm:text-lg font-bold focus:outline-none"
            placeholder="Voice note title"
            required
          />
        </div>

        {/* Voice Recording Custom Player */}
        {sourceUrl && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
            <audio
              ref={audioRef}
              key={sourceUrl}
              src={sourceUrl}
              preload="metadata"
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (Number.isFinite(dur)) setDuration(dur);
              }}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              onError={() => setAudioError(true)}
              className="hidden"
            />

            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px] text-slate-300">
                <Mic className="w-3.5 h-3.5" />
                Voice Recording
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-300">
                  {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
                </span>
                <button
                  type="button"
                  onClick={handleDownloadAudio}
                  className="sm:hidden p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Download audio"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white text-black hover:bg-slate-200 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-md"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              {/* Interactive Waveform Bars */}
              <div
                onClick={handleWaveformSeek}
                role="slider"
                aria-label="Audio progress"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(currentTime)}
                tabIndex={0}
                className="flex-1 h-12 rounded-xl bg-black/30 border border-white/5 px-3 flex items-center gap-1 cursor-pointer overflow-hidden"
              >
                {WAVEFORM_BARS.map((heightPct, idx) => {
                  const barRatio = (idx + 1) / WAVEFORM_BARS.length;
                  const isActive = barRatio <= progressRatio;
                  return (
                    <div
                      key={idx}
                      style={{ height: `${heightPct}%` }}
                      className={`flex-1 rounded-full transition-colors duration-150 ${
                        isActive ? "bg-white" : "bg-white/20"
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {audioError && (
              <p className="text-xs text-red-400">
                Browser could not play this audio source directly. Try downloading it.
              </p>
            )}

            {/* Speed, Volume & Download Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3">
                <div className="inline-flex items-center rounded-lg bg-black/30 border border-white/10 p-0.5">
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleSpeedChange(rate)}
                      className={`px-2 py-1 text-[11px] font-mono rounded-md transition-colors cursor-pointer ${
                        playbackRate === rate
                          ? "bg-white/15 text-white font-semibold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 sm:w-20 accent-white cursor-pointer"
                    aria-label="Volume"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadAudio}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download audio
              </button>
            </div>
          </div>
        )}

        {/* AI Transcript */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              AI Transcript
            </span>
            <button
              type="button"
              onClick={handleCopyTranscript}
              disabled={!content}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
            >
              {copiedTranscript ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-24 sm:h-28 bg-transparent text-sm text-slate-200 placeholder-slate-500 leading-relaxed resize-none focus:outline-none"
            placeholder="Voice transcription..."
            required
          />
        </div>

        {/* Tags & Created/Format Metadata */}
        <div className="space-y-3">
          <TagChipsEditor tags={tags} setTags={setTags} addLabel="Add tags" />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Created: {formatNoteDate(creation, true)}
            </span>
            {formatParts.length > 0 && (
              <span className="font-mono text-[11px] text-slate-400">
                Format: {formatParts.join(" • ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <NoteModalFooter
        leftContent={
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
              Space
            </kbd>
            to play/pause audio
          </span>
        }
        onCancel={onClose}
        loading={loading}
      />
    </div>
  );
}
