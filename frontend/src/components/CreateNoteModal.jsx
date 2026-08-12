import React, { useState } from "react";
import { X, Plus, Sparkles, Loader2 } from "lucide-react";

export default function CreateNoteModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !content) return;

    // Split tags by comma, trim white spaces, filter out empty fields
    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSubmit({
      title,
      content,
      tags: tagArray.toString(),
      source_url: sourceUrl,
    });

    // Reset values
    setTitle("");
    setContent("");
    setTags("");
    setSourceUrl("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop mask */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10  lg:min-w-[1000px] glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-1 rounded-xl text-purple-400">
            <Plus className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold internal">Create New Memory</h2>
            <p className="text-xs internal opacity-80 font-medium">
              Add a note or resource to your AI knowledge base
            </p>
          </div>
        </div>

        {/* Fields */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="space-y-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full py-3 px-4 text-white placeholder-white/20 rounded-xl text-sm"
              placeholder="TITLE"
              required
            />
          </div>

          <div className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="glass-input w-full h-[400px]  py-3 px-4 text-white placeholder-white/20 rounded-xl text-sm resize-none"
              placeholder="Take a note, ideas, or insights..."
              required
            />
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="glass-input w-full py-3 px-4 text-white placeholder-white/20 rounded-xl text-sm"
              placeholder="Tags e.g. frontend, react, tips"
            />
          </div>

          <div className="space-y-2">
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="glass-input w-full py-3 px-4 text-white placeholder-white/20 rounded-xl text-sm"
              placeholder="Source eg:https://example.com/docs"
            />
          </div>

          {/* Form Actions */}
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
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer flex items-center justify-center gap-2"
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
    </div>
  );
}
