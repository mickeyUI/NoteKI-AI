import React, { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import NoteCards from "./NoteCards";

export default function Folder({
  isOpen,
  setView,
  notes,
  group,
  onTogglePin,
  onSelectTag,
  onOpenCreateNoteModal,
  isSearchActive = false,
  formatDate,
  handleDeleteNote,
  setNoteViewId,
  setNoteViewOpen,
}) {
  if (!isOpen) return null;
  if (!notes) return null;
  const groupItems = notes.filter((note) => note.group == group);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop mask */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={() => setView(false)}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full h-full glass-panel-folder rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 overflow-y-auto">
        <button
          onClick={() => setView(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-2 ">
          <div>
            <h2 className="text-xl font-bold text-white">Folder: {group}</h2>
          </div>
          <main className="grid mb-24 gap-6 transition-all duration-500 ease-in-out grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groupItems.map((note) => {
              return (
                <NoteCards
                  key={note.id}
                  note={note}
                  onTogglePin={onTogglePin}
                  formatDate={formatDate}
                  handleDeleteNote={handleDeleteNote}
                  setNoteViewId={setNoteViewId}
                  setNoteViewOpen={setNoteViewOpen}
                  onSelectTag={onSelectTag}
                />
              );
            })}
          </main>
        </div>
      </div>
    </div>
  );
}
