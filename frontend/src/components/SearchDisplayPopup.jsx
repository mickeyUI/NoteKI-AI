import React, { useState, useEffect } from "react";
import { Plus, X, LoaderIcon, Loader2 } from "lucide-react";
import NoteCards from "./NoteCards";

export default function SearchDisplayPopup({
  isOpen,
  queriedNotes = [],
  loading,
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
  return (
    <div className=" inset-0 z-50 flex h-full w-full pr-20 select-none">
      {/* Backdrop mask */}
      <div
      // className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
      // onClick={() => setView(false)}
      />
      {/* Modal Card */}
      <div className="absolute z-10 w-auto  h-full bg-gray-950 rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 overflow-y-auto">
        {/* Header */}
        {loading ? (
          <main className="w-292 h-full pl-20 pt-20">
            <Loader2 w-5 h-5 />
            <h1>loading...</h1>
          </main>
        ) : (
          <main className="grid mb-24 gap-6 transition-all duration-500 ease-in-out grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {queriedNotes.map((note) => {
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
        )}
      </div>
    </div>
  );
}
