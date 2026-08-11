import React, { useState } from "react";
import {
  Plus,
  RefreshCw,
  FileText,
  Pin,
  Calendar,
  Trash2Icon,
  SearchIcon,
  UploadIcon,
  UngroupIcon,
  ArrowBigRight,
  X,
  Menu,
} from "lucide-react";
import NoteCards from "./NoteCards";
import SearchDisplayPopup from "./SearchDisplayPopup";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../services/api";

export default function NotesFeed({
  loadingNotes = false,
  notes = [],
  folders = [],
  pinnedNotes = [],
  standardNotes = [],
  pinnedIds = [],
  onTogglePin,
  onSelectTag,
  onOpenCreateNoteModal,
  isSearchActive = false,
  formatDate,
  handleDeleteNote,
  setNoteViewId,
  setNoteViewOpen,
  openUpload,
  openFolder,
  unGroupNotes,
  isShowing,
  setPullSidebar,
}) {
  const [searchDisplayActive, setSearchDisplayActive] = useState(false);
  const [pgSearchedNotes, setPgSearchedNotes] = useState([]);
  const [pging, setPging] = useState(false);
  const [search, setSearch] = useState("");
  const notesToDisplay = [...pinnedNotes, ...standardNotes];
  const filteredNotes = notesToDisplay.filter((note) => {
    if (!search) {
      return notesToDisplay;
    }
    const query = search.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.toLowerCase().includes(query)
    );
  });
  const MotionNoteCard = motion.create(NoteCards);

  const runPgSearch = async () => {
    if (!search) {
      return;
    }
    try {
      setSearchDisplayActive(true);
      setPging(true);
      const pgResults = await api.pgSearch(search);
      setPgSearchedNotes(pgResults);
    } catch (error) {
      console.log("Faild PgSearching:", error.message);
    } finally {
      setPging(false);
    }
  };

  const cancelSearch = () => {
    // do something to cancel pg search here
    setSearch("");
    setSearchDisplayActive(false);
  };
  return (
    <section
      className={`h-full overflow-y-auto px-6 md:px-8 py-8 transition-all duration-500 ease-in-out flex flex-col ${
        isSearchActive ? "w-full lg:w-[calc(100%-450px)]" : "w-full"
      }`}
    >
      {/* Upper title menu */}
      <div className="flex items-center justify-between mb-8">
        {isShowing && (
          <button
            onClick={() => setPullSidebar(false)}
            className="absolute -left-6 hover:left-1 p-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-300 rounded-lg transition-all duration-200 cursor-pointe"
          >
            <Menu className="w-9 h-9 " />
          </button>
        )}
        <div className="ml-6">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            My Knowledge Base
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Browse, create, and search your personal AI-augmented memory cards
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              className="w-full bg-purple-950 rounded-2xl p-1 pr-8 text-[15px] hover:border-2 hover:border-purple-700 border-1 border-purple-800"
            />
            {search && (
              <button
                onClick={cancelSearch}
                className="absolute right-0 flex justify-center items-center  p-2 "
              >
                <X className="h-5 w-5 opacity-25 hover:opacity-70 border-2 rounded-2xl" />
              </button>
            )}
          </div>

          <button
            onClick={runPgSearch}
            className="border-0 p-2 rounded-2xl bg-gray-900 hover:bg-purple-950"
          >
            <SearchIcon className="w-4 h-4 " />
          </button>
          <button
            onClick={() => {
              openUpload(true);
            }}
            className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 py-1 px-2 rounded-2xl"
          >
            <UploadIcon />
          </button>
          <button
            onClick={onOpenCreateNoteModal}
            className="py-2.5 px-4 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.2)] text-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>
      {searchDisplayActive && (
        <SearchDisplayPopup
          isOpen={searchDisplayActive}
          queriedNotes={pgSearchedNotes}
          loading={pging}
          onTogglePin={onTogglePin}
          onOpenCreateNoteModal={() => setIsNoteModalOpen(true)}
          isSearchActive={isSearchActive}
          formatDate={formatDate}
          handleDeleteNote={handleDeleteNote}
          onSelectTag={(tag) => setInputVal(`#${tag}`)}
          setNoteViewId={setNoteViewId}
          setNoteViewOpen={setNoteViewOpen}
        />
      )}
      {loadingNotes ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
          <span className="text-sm font-medium">
            Retrieving saved memories...
          </span>
        </div>
      ) : notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto select-none">
          <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl mb-4 text-slate-400">
            <FileText className="w-10 h-10 mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            No Saved Memories
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Start populating your Lore knowledge database by creating notes or
            import documents. You can also converse with AI to generate
            responses.
          </p>
          <button
            onClick={onOpenCreateNoteModal}
            className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-semibold rounded-xl transition-colors cursor-pointer text-xs"
          >
            Create Your First Card
          </button>
        </div>
      ) : (
        <>
          {/* folder setup */}

          {folders.length > 0 && (
            <div
              className={`grid mb-24 gap-6 transition-all duration-500 ease-in-out ${
                isSearchActive
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              {folders.map((groupName, indx) => (
                <div
                  key={indx}
                  onClick={() => openFolder(groupName)}
                  className="glass-panel hover:translate-0.5  rounded-2xl shadow-2xl p-5 flex  justify-between min-h-15 relative border border-white/10 transition-all duration-500 ease-in-out"
                >
                  <h1 className="truncate">{groupName}</h1>
                  <button
                    title="ungroup"
                    className="border rounded-sm transition-all duration-500 ease-in-out bg-gray-600 hover:bg-violet-700 hover:border-violet-700 "
                    onClick={(e) => {
                      e.stopPropagation();
                      unGroupNotes(groupName);
                    }}
                  >
                    <UngroupIcon className="w-5 h-5 " />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/*  Notes grid / masonry layout */}
          <div>
            <motion.div
              layout
              className={`grid mb-24 gap-6 transition-all duration-500 ease-in-out ${
                isSearchActive
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              <AnimatePresence mode="popLayout">
                {filteredNotes.map((note) => {
                  if (!note) return null;

                  const isPinned = pinnedIds.includes(note.id);

                  return (
                    <motion.div
                      key={note.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{
                        layout: {
                          duration: 0.3,
                        },
                      }}
                    >
                      <NoteCards
                        note={note}
                        isPinned={isPinned}
                        onTogglePin={onTogglePin}
                        onSelectTag={onSelectTag}
                        formatDate={formatDate}
                        handleDeleteNote={handleDeleteNote}
                        setNoteViewId={setNoteViewId}
                        setNoteViewOpen={setNoteViewOpen}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </section>
  );
}
