import { useState } from "react";
import {
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function CreateCollection({
  isOpen,
  onClose,
  onSubmit,
  loading,
  setLoading,
  ungrouped = [],
  folders = [],
}) {
  const [collectionName, setCollectionName] = useState("");
  const [selectedNotes, setSelectedNotes] = useState([]);

  if (!isOpen) return null;

  const availableNotes = ungrouped.filter(
    (n) => !selectedNotes.some((s) => s.id === n.id),
  );

  const handleAdd = (note) => {
    setSelectedNotes((prev) => [...prev, note]);
  };

  const handleDismiss = (note) => {
    setSelectedNotes((prev) => prev.filter((n) => n.id !== note.id));
  };

  const handleClose = () => {
    setSelectedNotes([]);
    setCollectionName("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedNotes.length === 0) {
      toast.error("Collection is empty. Add at least 1 note.");
      return;
    }
    if (!collectionName.trim()) {
      toast.error("Collection name cannot be empty.");
      return;
    }
    if (folders.includes(collectionName.trim())) {
      toast.error("Collection already exists. Please choose another name.");
      return;
    }

    setLoading(true);
    await onSubmit(selectedNotes, collectionName.trim());
    setLoading(false);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 select-none">
      {/* Backdrop mask */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 md:translate-y-10 shadow-2xl border border-white/10 max-h-[90vh] overflow-x-hidden overflow-y-auto">
        <button
          onClick={handleClose}
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
            <h2 className="text-xl font-bold internal">Create Collection</h2>
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
            <div className="border-b-2 border-white/10 flex flex-col gap-3 pb-5">
              <span className="text-xs uppercase font-bold text-slate-400">
                Selected Notes ({selectedNotes.length})
              </span>
              {selectedNotes.length > 0 ? (
                selectedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex justify-between items-center rounded-2xl shadow-2xl p-3 min-h-20 relative border-2 border-purple-500/30 bg-purple-500/5 transition-all duration-300"
                  >
                    <div className="w-[85%]">
                      <h3 className="font-semibold text-sm truncate">{note.title}</h3>
                      <p className="text-xs internal leading-relaxed line-clamp-2 opacity-80">
                        {note.content}
                      </p>
                    </div>
                    <X
                      onClick={() => handleDismiss(note)}
                      className="w-5 h-5 hover:text-red-400 cursor-pointer transition-colors"
                    />
                  </div>
                ))
              ) : (
                <div className="flex justify-center items-center border-dashed rounded-2xl p-5 min-h-15 relative border border-white/10 text-xs text-slate-400">
                  <span>Click '+' on notes below to add them to this collection</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs uppercase font-bold text-slate-400">
                Available Notes ({availableNotes.length})
              </span>
              {availableNotes.length > 0 ? (
                availableNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex justify-between items-center rounded-2xl shadow-2xl p-3 min-h-20 relative border border-white/10 transition-all duration-300"
                  >
                    <div className="w-[85%]">
                      <h3 className="font-semibold text-sm truncate">{note.title}</h3>
                      <p className="text-xs internal leading-relaxed line-clamp-2 opacity-80">
                        {note.content}
                      </p>
                    </div>
                    <Plus
                      onClick={() => handleAdd(note)}
                      className="w-5 h-5 hover:text-green-400 cursor-pointer transition-colors"
                    />
                  </div>
                ))
              ) : (
                <div className="flex justify-center items-center border-dashed rounded-2xl p-5 min-h-15 relative border border-white/10 text-xs text-slate-400">
                  <span>No more ungrouped notes available</span>
                </div>
              )}
            </div>
          </section>

          {/* Form Actions */}
          <div className="flex gap-4 pt-3">
            <button
              type="button"
              onClick={handleClose}
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
