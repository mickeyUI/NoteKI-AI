import React, { useEffect, useState } from "react";
import {
  X,
  Plus,
  Sparkles,
  Loader2,
  AlignVerticalJustifyEndIcon,
} from "lucide-react";
import { toast } from "sonner";

export default function CreateCollection({
  isOpen,
  onClose,
  onSubmit,
  loading,
  setLoading,
  ungrouped,
  setUngrouped,
  folders,
}) {
  const [collectionName, setCollectionName] = useState("");
  const [toGroup, setToGroup] = useState([]);

  const handleAdd = (note) => {
    setUngrouped((prev) => prev.filter((n) => n.id != note.id));
    setToGroup((prev) => [note, ...prev]);
  };

  const handleDismiss = (note) => {
    setToGroup((prev) => prev.filter((n) => n.id != note.id));
    setUngrouped((prev) => [note, ...prev]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!toGroup) {
      toast.error("Collection Empty. Add Atleast 1 Note");
      return;
    }
    if (!collectionName) {
      toast.error("Collection name cant be Empty");
      return;
    }
    if (folders.includes(collectionName)) {
      toast.error("Collection already exists. try another name");
      return;
    }

    setLoading(true);

    await onSubmit(toGroup, collectionName);
    setLoading(false);
    onClose();

    // Reset values
    setToGroup([]);
    setCollectionName("");
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 select-none ">
      {/* Backdrop mask */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 md:translate-y-10 shadow-2xl border border-white/10 max-h-[90vh] overflow-x-hidden overflow-y-auto">
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
            <h2 className="text-xl font-bold internal">Create collection</h2>
          </div>
        </div>

        {/* Fields */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            className="glass-input w-full py-3 px-4 text-white placeholder-white/20 rounded-xl text-sm"
            placeholder="Name Of Your New Collection"
            required
          />

          <section className="h-90 md:max-h-[58vh] overflow-y-scroll overflow-x-hidden p-2 flex flex-col gap-5">
            <div className="border-b-2 border-white flex flex-col gap-5 pb-5">
              {toGroup ? (
                toGroup.map((note, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center rounded-2xl shadow-2xl p-3 min-h-20 relative border-2 border-white/10 transition-all duration-500 ease-in-out"
                  >
                    <div className="w-[90%] ">
                      <h3>{note.title}</h3>
                      <p className="text-xs internal leading-relaxed line-clamp-2  opacity-80">
                        {note.content}
                      </p>
                    </div>
                    <X
                      onClick={() => handleDismiss(note)}
                      className="w-5 h-5 hover:text-red-400/50 transition-all duration-500 ease-in-out"
                    />
                  </div>
                ))
              ) : (
                <div className="flex justify-center items-center border-dashed hover:translate-0.5  rounded-2xl shadow-2xl p-5 min-h-15 relative border-2 border-white/10 transition-all duration-500 ease-in-out">
                  <h3>add notes to folder</h3>
                  <p></p>
                </div>
              )}
            </div>

            {ungrouped ? (
              ungrouped.map((note, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center rounded-2xl shadow-2xl p-3 min-h-20 relative border-2 border-white/10 transition-all duration-500 ease-in-out"
                >
                  <div className="w-[90%] ">
                    <h3>{note.title}</h3>
                    <p className="text-xs internal leading-relaxed line-clamp-2  opacity-80">
                      {note.content}
                    </p>
                  </div>
                  <Plus
                    onClick={() => handleAdd(note)}
                    className="w-5 h-5 hover:text-green-400/50 transition-all duration-500 ease-in-out"
                  />
                </div>
              ))
            ) : (
              <div className="flex justify-center items-center border-dashed hover:translate-0.5  rounded-2xl shadow-2xl p-5 min-h-15 relative border-2 border-white/10 transition-all duration-500 ease-in-out">
                <h3>No Folders Found</h3>
                <p></p>
              </div>
            )}
          </section>
          {/* Form Actions */}
          <div className="flex gap-4 pt-3">
            <button
              type="button"
              onClick={() => {
                setCollectionName("");
                setToGroup([]);
                onClose();
              }}
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
                <span>CREATE</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
