import { useState, useEffect } from "react";
import {
  SquarePen,
  RefreshCw,
  FileText,
  SearchIcon,
  UploadIcon,
  UngroupIcon,
  X,
  Menu,
  Plus,
  Loader2,
  MicAudioLines,
  AlertTriangle,
} from "lucide-react";
import NoteCards from "./NoteCards";
import SearchDisplayPopup from "./SearchDisplayPopup";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../services/api";
import { toast } from "sonner";

export default function NotesFeed({
  loadingNotes = false,
  notesFetchError = false,
  onRetryNotes,
  notes = [],
  folders = [],
  pinnedNotes = [],
  standardNotes = [],
  pinnedIds = [],
  onTogglePin,
  onSelectTag,
  selectedTag = "",
  onOpenCreateNoteModal,
  isSearchActive = false,
  formatDate,
  handleDeleteNote,
  setNoteViewId,
  setNoteViewOpen,
  openUpload,
  openVoice,
  openFolder,
  unGroupNotes,
  _grouping,
  ungroupingFolder = null,
  isShowing,
  setPullSidebar,
  setCreateModel,
  // ungroupedNotes,
}) {
  const [searchDisplayActive, setSearchDisplayActive] = useState(false);
  const [pgSearchedNotes, setPgSearchedNotes] = useState([]);
  const [pging, setPging] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (selectedTag) {
      setSearch(selectedTag.replace(/^#+/, "").trim());
    }
  }, [selectedTag]);

  const handleSelectTag = (tag) => {
    const cleanTag = (tag || "").replace(/^#+/, "").trim();
    setSearch(cleanTag);
    if (onSelectTag) onSelectTag(cleanTag);
  };

  const notesToDisplay = search ? notes : [...pinnedNotes, ...standardNotes];
  const filteredNotes = notesToDisplay.filter((note) => {
    if (!search.trim()) {
      return true;
    }
    const rawQuery = search.toLowerCase().trim();
    const cleanQuery = rawQuery.replace(/^#+/, "");

    const title = (note?.title || "").toLowerCase();
    const content = (note?.content || "").toLowerCase();
    const tags = (note?.tags || "").toLowerCase();

    return (
      title.includes(rawQuery) ||
      content.includes(rawQuery) ||
      tags.includes(rawQuery) ||
      tags.includes(cleanQuery)
    );
  });
  // const MotionNoteCard = motion.create(NoteCards);

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
      toast.error("Try Again");
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
    <motion.div
      layout
      className={`h-full bg-[#1a1a1a] overflow-y-auto px-6 md:px-8 py-8 transition-all duration-1000 ease-in-out flex flex-col ${
        isSearchActive ? "w-full lg:w-[calc(100%-450px)]" : "w-full"
      }`}
    >
      {/* Upper title menu */}
      <div className="flex flex-col gap-5 lg:flex-row md:justify-between mb-8">
        <div className="flex gap-2">
          {isShowing && (
            <button
              onClick={() => setPullSidebar(false)}
              className=" flex justify-center items-center btn-style cursor-pointer"
            >
              <Menu className="w-6 h-6 " />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight internal mb-1">
              Lore Knowledge Base
            </h1>
            <p className="text-xs internal font-medium">
              Browse, create, and search your personal AI-augmented memory cards
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-start items-center">
          <div className="flex relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              placeholder="Search notes or #tag..."
              className="w-full h-10 focus:outline-none bg-1 rounded-2xl p-1 pl-3 focus:pr-20 text-[15px] border-white/10 transition-all ease-in-out placeholder:text-slate-500 placeholder:text-xs"
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

          <button onClick={runPgSearch} className="btn-style h-10">
            <SearchIcon className="w-5 h-5 " />
          </button>
          <button
            onClick={() => {
              openUpload(true);
            }}
            className="btn-style h-10"
            title="Upload Image"
          >
            <UploadIcon className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenCreateNoteModal}
            className="btn-style cursor-pointer  h-10"
            title="Create note"
          >
            <SquarePen className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              if (openVoice) openVoice(true);
            }}
            className="btn-style cursor-pointer h-10"
            title="Voice Note"
          >
            <MicAudioLines className="w-5 h-5" />
          </button>
        </div>
      </div>
      {searchDisplayActive && (
        <SearchDisplayPopup
          isOpen={searchDisplayActive}
          onClose={cancelSearch}
          queriedNotes={pgSearchedNotes}
          loading={pging}
          onTogglePin={onTogglePin}
          formatDate={formatDate}
          handleDeleteNote={handleDeleteNote}
          onSelectTag={handleSelectTag}
          setNoteViewId={setNoteViewId}
          setNoteViewOpen={setNoteViewOpen}
        />
      )}
      {loadingNotes ? (
        <div className="flex-1 flex flex-col gap-10 animate-pulse select-none">
          {/* Skeleton Collections */}
          <div className="flex flex-col gap-4">
            <div className="h-6 w-32 bg-white/10 rounded-lg ml-2" />
            <div
              className={`grid gap-6 ${
                isSearchActive
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="glass-panel rounded-2xl p-5 min-h-15 border border-white/5 bg-white/[0.02] flex items-center justify-between"
                >
                  <div className="h-4 w-28 bg-white/10 rounded-md" />
                  <div className="h-5 w-5 bg-white/5 rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Skeleton Notes */}
          <div className="flex flex-col gap-4">
            <div className="h-6 w-20 bg-white/10 rounded-lg ml-2" />
            <div
              className={`grid mb-24 gap-6 ${
                isSearchActive
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="glass-panel rounded-2xl p-5 h-[200px] border border-white/5 bg-white/[0.02] flex flex-col justify-between"
                >
                  {/* Card actions */}
                  <div className="flex justify-between -mt-1">
                    <div className="h-6 w-6 rounded-lg bg-white/10" />
                    <div className="h-6 w-6 rounded-lg bg-white/10" />
                  </div>
                  {/* Card content */}
                  <div className="space-y-2.5">
                    <div className="h-4 w-3/5 bg-white/15 rounded-md" />
                    <div className="h-3 w-full bg-white/5 rounded" />
                    <div className="h-3 w-4/5 bg-white/5 rounded" />
                  </div>
                  {/* Card footer */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-1.5">
                      <div className="h-4 w-12 bg-white/10 rounded-md" />
                      <div className="h-4 w-10 bg-white/10 rounded-md" />
                    </div>
                    <div className="h-3 w-16 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : notesFetchError && notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto select-none">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4 text-red-400">
            <AlertTriangle className="w-10 h-10 mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            Couldn't Connect to Server
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Unable to retrieve your saved memories. Please check your connection or verify that the backend server is running.
          </p>
          {onRetryNotes && (
            <button
              onClick={onRetryNotes}
              className="py-2.5 px-5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          )}
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
          <div className="flex flex-col gap-4 mb-10">
            <h1 className="internal text-2xl pl-2">Collections</h1>
            <div
              className={`grid gap-6 transition-all duration-500 ease-in-out ${
                isSearchActive
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              <div
                onClick={() => {
                  setCreateModel(true);
                }}
                className="flex justify-center items-center border-dashed hover:translate-0.5  rounded-2xl shadow-2xl p-5 min-h-15 relative border-2 border-white/10 transition-all duration-500 ease-in-out cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </div>

              {folders.map((groupName, indx) => {
                const isUngroupingThis = ungroupingFolder === groupName;
                return (
                  <div
                    key={indx}
                    onClick={() => openFolder(groupName)}
                    className="glass-panel hover:translate-0.5 rounded-2xl shadow-2xl p-5 flex justify-between min-h-15 relative border border-white/10 transition-all duration-500 ease-in-out cursor-pointer"
                  >
                    <h1 className="truncate">{groupName}</h1>
                    <button
                      title="ungroup"
                      disabled={Boolean(ungroupingFolder)}
                      className={`btn-style cursor-pointer ${Boolean(ungroupingFolder) && !isUngroupingThis ? "opacity-50 pointer-events-none" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        unGroupNotes(groupName);
                      }}
                    >
                      {isUngroupingThis ? (
                        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                      ) : (
                        <UngroupIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/*  Notes grid / masonry layout */}
          <div className="gap-6 flex flex-col">
            <div className="flex items-center justify-between pl-2 pr-2">
              <h1 className="internal text-2xl">Notes</h1>
              {search && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filtering:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                    <span>{search.startsWith("#") ? search : `#${search}`}</span>
                    <button
                      onClick={() => setSearch("")}
                      className="hover:text-white cursor-pointer"
                      title="Clear filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              )}
            </div>
            <motion.div
              layout
              className={`grid mb-24 gap-6 transition-all duration-500 ease-in-out ${
                isSearchActive
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              <AnimatePresence>
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
                        onSelectTag={handleSelectTag}
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
    </motion.div>
  );
}
