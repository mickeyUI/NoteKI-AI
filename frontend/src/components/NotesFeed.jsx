import { useMemo, useState } from "react";
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
} from "lucide-react";
import NoteCards from "./NoteCards";
import SearchDisplayPopup from "./SearchDisplayPopup";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../services/api";
import { toast } from "sonner";

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
  grouping,
  isShowing,
  setPullSidebar,
  setCreateModel,
  // ungroupedNotes,
}) {
  const [searchDisplayActive, setSearchDisplayActive] = useState(false);
  const [pgSearchedNotes, setPgSearchedNotes] = useState([]);
  const [pging, setPging] = useState(false);
  const [search, setSearch] = useState("");
  // const ungroupedNotes = useMemo(
  //   () => [...pinnedNotes, ...standardNotes].filter((n) => n.group === "none"),
  //   [pinnedNotes, standardNotes],
  // );
  const notesToDisplay = search ? notes : [...pinnedNotes, ...standardNotes];
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
      <div className="flex flex-col gap-5 md:flex-row md:justify-between mb-8">
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
        <div className="flex gap-2">
          <div className="flex relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              className="w-full focus:outline-none bg-1 rounded-2xl p-1 pl-3 focus:pr-20 text-[15px] border-white/10 transition-all ease-in-out "
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

          <button onClick={runPgSearch} className="btn-style ">
            <SearchIcon className="w-4 h-4 " />
          </button>
          <button
            onClick={() => {
              openUpload(true);
            }}
            className="btn-style"
            title="Upload Image"
          >
            <UploadIcon />
          </button>
          <button
            onClick={onOpenCreateNoteModal}
            className="btn-style cursor-pointer"
            title="Create note"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        </div>
      </div>
      {searchDisplayActive && (
        <SearchDisplayPopup
          isOpen={searchDisplayActive}
          queriedNotes={pgSearchedNotes}
          loading={pging}
          onTogglePin={onTogglePin}
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

          {true && (
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
                  className="flex justify-center items-center border-dashed hover:translate-0.5  rounded-2xl shadow-2xl p-5 min-h-15 relative border-2 border-white/10 transition-all duration-500 ease-in-out"
                >
                  <Plus className="w-5 h-5" />
                </div>

                {folders.map((groupName, indx) => (
                  <div
                    key={indx}
                    onClick={() => openFolder(groupName)}
                    className="glass-panel hover:translate-0.5  rounded-2xl shadow-2xl p-5 flex  justify-between min-h-15 relative border border-white/10 transition-all duration-500 ease-in-out"
                  >
                    <h1 className="truncate">{groupName}</h1>
                    <button
                      title="ungroup"
                      className="btn-style "
                      onClick={(e) => {
                        e.stopPropagation();
                        unGroupNotes(groupName);
                      }}
                    >
                      {/* its loading all the components. */}
                      {false ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <UngroupIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/*  Notes grid / masonry layout */}
          <div className="gap-6 flex flex-col">
            <h1 className="internal text-2xl pl-2">Notes</h1>
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
    </motion.div>
  );
}
