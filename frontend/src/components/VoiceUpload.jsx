import { useState, useRef, useEffect } from "react";
import {
  X,
  Mic,
  MicOff,
  Upload,
  Loader2,
  Sparkles,
  Play,
  Square,
  FileAudio,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { api } from "../services/api";
import { toast } from "sonner";
import ComboBox from "./ComboBox";
import { motion, AnimatePresence } from "framer-motion";

export default function VoiceUpload({
  isOpen,
  onClose,
  onSubmit,
  loading,
  folders,
}) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [collection, setCollection] = useState("none");
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [transcribedText, setTranscribedText] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioPreviewUrl && audioPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  const reset = (keepPreviewUrl = false) => {
    setTitle("");
    setTags("");
    setCollection("none");
    setAudioFile(null);
    setAudioUrl("");
    if (!keepPreviewUrl && audioPreviewUrl && audioPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioPreviewUrl("");
    setTranscribedText("");
    setTranscribing(false);
    setIsRecording(false);
    setRecordingSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Microphone access is not supported by your browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const file = new File([audioBlob], `recording-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setAudioFile(file);
        const previewUrl = URL.createObjectURL(audioBlob);
        setAudioPreviewUrl(previewUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      toast.error("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    if (audioPreviewUrl && audioPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioPreviewUrl(URL.createObjectURL(file));
  };

  const uploadAudioToSupabase = async (file) => {
    if (!file) return "";
    const ext = file.name?.split(".").pop() || "webm";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const contentType = file.type || (ext === "m4a" ? "audio/mp4" : "audio/webm");
    const options = { contentType, upsert: true };

    // 1. Try 'audio' bucket first
    let bucket = "audio";
    let { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, options);

    // 2. If 'audio' bucket fails (RLS policy missing, not found, etc.), fallback to 'images' bucket
    if (error) {
      console.warn(
        `Supabase '${bucket}' bucket upload failed (${error.message}), trying 'images' bucket...`,
      );
      bucket = "images";
      const retry = await supabase.storage
        .from(bucket)
        .upload(fileName, file, options);
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Supabase upload error on all buckets:", error);
      throw new Error(
        error.message || "Failed to upload audio to cloud storage",
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  };

  const handleTranscribe = async () => {
    if (!audioFile) {
      toast.error("Please record or select an audio file first.");
      return;
    }

    if (!navigator.onLine) {
      toast.info(
        "Offline: Audio will be transcribed automatically once internet returns.",
      );
      return;
    }

    setTranscribing(true);
    try {
      // Send audio file directly to backend Groq Whisper STT
      const formData = new FormData();
      formData.append("file", audioFile);

      const res = await api.transcribeAudio(formData);
      if (res && res.text) {
        setTranscribedText(res.text);
        if (!title) {
          const previewSnippet = res.text.slice(0, 30).trim();
          setTitle(
            previewSnippet ? `Voice: ${previewSnippet}...` : "Voice Note",
          );
        }
        toast.success("Voice transcribed successfully!");
      } else {
        toast.error("No transcription returned from Groq.");
      }
    } catch (err) {
      console.error("Transcription error:", err);
      toast.error(
        `Transcription failed: ${err.message || "Check Groq config"}`,
      );
    } finally {
      setTranscribing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!navigator.onLine) {
      if (!audioFile && !transcribedText.trim()) {
        toast.error("Please record or select an audio file first.");
        return;
      }

      const tagArray = tags
        .split(/[, ]+/)
        .map((t) => t.replace(/^#+/, "").trim())
        .filter(Boolean);

      const resolvedTitle =
        title.trim() ||
        (transcribedText.trim()
          ? `Voice: ${transcribedText.slice(0, 30).trim()}...`
          : "Voice Note");

      const resolvedContent =
        transcribedText.trim() ||
        "Voice recording (transcription pending sync...)";

      onSubmit({
        title: resolvedTitle,
        content: resolvedContent,
        tags: tagArray.toString(),
        source_url: audioPreviewUrl,
        audioFile: audioFile,
        mediaBlob: audioFile,
        note_type: "voice",
        group: collection,
        needsTranscription: !transcribedText.trim(),
        isOffline: true,
      });

      reset(true);
      onClose();
      return;
    }

    if (!transcribedText.trim()) {
      toast.error("Please transcribe or enter note content before saving.");
      return;
    }

    let publicUrl = audioUrl;
    if (!publicUrl && audioFile) {
      try {
        publicUrl = await uploadAudioToSupabase(audioFile);
        setAudioUrl(publicUrl);
      } catch (uploadErr) {
        console.warn(
          "Storage upload failed, continuing with note text:",
          uploadErr,
        );
        toast.error("Cloud storage upload failed; saving note text.");
      }
    }

    // Normalize tags: clean commas/spaces and strip leading #
    const tagArray = tags
      .split(/[, ]+/)
      .map((t) => t.replace(/^#+/, "").trim())
      .filter(Boolean);

    onSubmit({
      title: title.trim() || "Voice Memory",
      content: transcribedText.trim(),
      tags: tagArray.toString(),
      source_url: publicUrl || audioPreviewUrl || "",
      audioFile: audioFile,
      mediaBlob: audioFile,
      note_type: "voice",
      group: collection,
    });

    reset(true);
    onClose();
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={() => {
              reset();
              onClose();
            }}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="relative z-10 w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-[#6a994e] border border-purple-500/20 rounded-xl text-purple-400">
            <Mic className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Voice Note</h2>
            <p className="text-xs text-slate-400 font-medium">
              {!navigator.onLine
                ? "Offline: audio saved locally & transcribed when online"
                : "Record or upload audio to transcribe with Groq AI"}
            </p>
          </div>
        </div>

        {/* Audio Input Options */}
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-3 w-full justify-center">
              {/* Record Button */}
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 py-2.5 px-5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Recording ({formatTimer(recordingSeconds)})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-2 py-2.5 px-5 bg-[#6a994e]/80  hover:bg-[#6a994e]  text-white rounded-xl font-semibold text-xs transition-all shadow-[0_0_15px_rgba(56,92,34,0.4)]  cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>Record Voice</span>
                </button>
              )}

              <span className="text-xs text-slate-500">or</span>

              {/* File Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 py-2.5 px-4 bg-slate-900/60 hover:bg-slate-900 border border-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Audio</span>
              </button>
            </div>

            {/* Selected File / Recording Status */}
            {audioFile && (
              <div className="w-full mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="flex items-center gap-1.5 truncate">
                    <FileAudio className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="truncate">{audioFile.name}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>

                {audioPreviewUrl && (
                  <audio
                    controls
                    src={audioPreviewUrl}
                    className="w-full h-9 rounded-lg"
                  />
                )}

                {/* Transcribe Button */}
                <button
                  type="button"
                  onClick={handleTranscribe}
                  disabled={transcribing}
                  className="w-full py-2.5 px-4 mt-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {transcribing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transcribing via Groq Whisper...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Transcribe with Groq AI</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Form Details */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="glass-input w-full py-3 px-4 text-white placeholder-white/20 rounded-xl text-sm"
                placeholder="Title (e.g. Quick Voice Thought)"
                required
              />
            </div>

            {/* Transcribed / Editable Text */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
                <span>Transcription (editable)</span>
                {transcribedText && (
                  <span className="text-purple-400 text-[10px]">
                    Groq whisper-large-v3-turbo
                  </span>
                )}
              </div>
              <textarea
                value={transcribedText}
                onChange={(e) => setTranscribedText(e.target.value)}
                className="glass-input w-full h-32 py-3 px-4 text-white placeholder-white/20 rounded-xl text-sm resize-none leading-relaxed"
                placeholder="Transcribed text will appear here. You can edit, format, or add notes directly..."
              />
            </div>

            {/* Folder Collection */}
            <ComboBox
              folders={folders}
              folder={collection}
              setFolder={setCollection}
            />

            {/* Tags */}
            <div>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="glass-input w-full py-3 px-4 text-white placeholder-white/20 rounded-xl text-sm"
                placeholder="Tags e.g. voice, meeting, idea"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="flex-1 py-3 px-4 bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-white/10 text-slate-300 font-semibold rounded-xl transition-all duration-200 cursor-pointer text-center text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  transcribing ||
                  (!navigator.onLine
                    ? !audioFile && !transcribedText.trim()
                    : !transcribedText.trim())
                }
                className="flex-1 py-3 px-4 bg-[#6a994e]/70  hover:bg-[#6a994e] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Memory</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
  );
}
