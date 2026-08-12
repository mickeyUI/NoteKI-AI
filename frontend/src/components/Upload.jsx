import React, { useState } from "react";
import {
  X,
  Plus,
  Sparkles,
  Loader2,
  AlignVerticalJustifyEndIcon,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { toast } from "sonner";

export default function Upload({
  isOpen,
  onClose,
  onSubmit,
  loading,
  setLoading,
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  if (!isOpen) return null;

  const handleFileChange = async (event) => {
    setContent(event.target.files[0]);
  };

  const uploadImage = async () => {
    if (!content) {
      toast.error("Image Not Found");
      return;
    }

    const fileName = `${Date.now()}-${content.name}`;

    const { data, error } = await supabase.storage
      .from("images")
      .upload(fileName, content);

    if (error) {
      console.error(error);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !content) {
      toast.error("");
      return;
    }
    setLoading(true);
    const publicURL = await uploadImage();

    if (!publicURL) {
      alert("Failed to upload image. Please try again.");
      setLoading(false);
      return;
    }

    // Split tags by comma, trim white spaces, filter out empty fields
    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSubmit({
      title,
      tags: tagArray.toString(),
      source_url: publicURL,
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
      <div className="relative z-10 w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 internal hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-1 rounded-xl text-purple-400">
            <Plus className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold internal">Upload Image</h2>
            <p className="text-xs internal font-medium opacity-80">
              Add your image or note to your AI knowledge base
            </p>
          </div>
        </div>

        {/* Fields */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="">
            <input
              type="file"
              onChange={handleFileChange}
              className="glass-input border-1 border-b w-full py-3 px-4 text-white placeholder-white/20 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-2">
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
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="glass-input w-full py-3 px-4 text-white placeholder-white/20 rounded-xl text-sm"
              placeholder="Tags e.g. frontend, react, tips"
            />
          </div>

          <div className="space-y-2"></div>

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
              className="flex-1 py-3 px-4 bg-[#717171] hover:bg-[#4d4d4d] text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer flex items-center justify-center gap-2"
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
    </div>
  );
}
