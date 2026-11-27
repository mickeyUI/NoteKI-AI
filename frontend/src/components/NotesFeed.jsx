import { useState, useEffect, useRef } from "react";
import {
  SquarePen,
  RefreshCw,
  FileText,
  SearchIcon,
  UploadIcon,
  X,
  Plus,
  MicAudioLines,
  AlertTriangle,
} from "lucide-react";
import NoteCards from "./NoteCards";
import GlassFolder from "./glassFolderCards";
import SearchDisplayPopup from "./SearchDisplayPopup";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../services/api";
import { toast } from "sonner";

// Minimalistic monochrome charcoal art matching the app's #212121 + smoked glass theme.
const MINIMAL_FOLDER_ART = {
  style: "streak",
  colors: ["#121212", "#1b1b1b", "#262626", "#323232", "#1c1c1c", "#101010"],
  scale: 0.55,
  warp: 0.85,
  angle: -0.5,
  gloss: 0.12,
  veins: 0,
};

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
  _isSearchActive = false,
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
  setCreateModel,
  // ungroupedNotes,
}) {
  const [searchDisplayActive, setSearchDisplayActive] = useState(false);
  const [pgSearchedNotes, setPgSearchedNotes] = useState([]);
  const [pging, setPging] = useState(false);
  const [search, setSearch] = useState("");
  const [noteTypeFilter, setNoteTypeFilter] = useState("all");
  const [folderWidth, setFolderWidth] = useState(() => {
    if (typeof window === "undefined") return 220;
    if (window.innerWidth < 640) return 160;
    if (window.innerWidth < 1024) return 200;
    return 220;
  });
  const lastFolderTapRef = useRef({ group: null, time: 0 });
  const searchInputRef = useRef(null);

  // Focus the feed search input when the user presses Cmd/Ctrl+K.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Keep GlassFolder card width responsive across phone, tablet, and desktop breakpoints.
  useEffect(() => {
    const updateFolderWidth = () => {
      if (window.innerWidth < 640) setFolderWidth(160);
      else if (window.innerWidth < 1024) setFolderWidth(200);
      else setFolderWidth(220);
    };
    window.addEventListener("resize", updateFolderWidth);
    return () => window.removeEventListener("resize", updateFolderWidth);
  }, []);

  /**
   * Detect a double-tap on touch devices so mobile users can open a collection just like desktop double-click.
   */
  const handleFolderTouchEnd = (groupName, event) => {
    // Ignore taps on the action/menu buttons inside the folder.
    if (event.target.closest("button")) return;
    const now = Date.now();
    if (
      lastFolderTapRef.current.group === groupName &&
      now - lastFolderTapRef.current.time < 320
    ) {
      lastFolderTapRef.current = { group: null, time: 0 };
      openFolder(groupName);
    } else {
      lastFolderTapRef.current = { group: groupName, time: now };
    }
  };

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
    // Apply note-type tab filter (All / Voice / Images / Text).
    if (noteTypeFilter !== "all") {
      const nType = note?.note_type || "text";
      if (nType !== noteTypeFilter) return false;
    }

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
      className="h-full w-full bg-[#1a1a1a] overflow-y-auto px-6 md:px-8 py-8 transition-all duration-500 ease-in-out flex flex-col"
    >
      {/* Upper title menu */}
      <div className="flex flex-col gap-5 lg:flex-row md:justify-between mb-6 sm:mb-8">
        <div className="hidden sm:flex gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight internal mb-1">
              Lore Knowledge Base
            </h1>
            <p className="text-xs internal font-medium">
              Browse, create, and search your personal AI-augmented memory cards
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-start items-center flex-wrap sm:flex-nowrap">
          <div className="relative flex items-center flex-1 sm:flex-none sm:w-72 md:w-80 h-10 rounded-full bg-[#242424] border border-white/10 focus-within:border-white/25 px-3.5 gap-2.5 transition-colors">
            <SearchIcon className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runPgSearch();
                }
              }}
              type="text"
              placeholder="Search notes or #tag..."
              className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={cancelSearch}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-[#323232] border border-white/10 text-[11px] font-medium text-slate-300 shrink-0 select-none">
                ⌘K
              </kbd>
            )}
          </div>
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
      {loadingNotes ? (
        <div className="flex-1 flex flex-col gap-10 animate-pulse select-none">
          {/* Skeleton Collections (matches horizontal GlassFolder + New Collection row) */}
          <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
            <div className="h-6 w-32 bg-white/10 rounded-lg ml-2" />
            <div className="no-scrollbar -mx-6 md:-mx-8 px-6 md:px-8 flex flex-nowrap items-start gap-4 sm:gap-6 pt-8 pb-4 overflow-x-auto overflow-y-hidden">
              <div className="shrink-0 w-[160px] h-[154px] sm:w-[200px] sm:h-[192px] lg:w-[220px] lg:h-[211px] rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 rounded-md bg-white/10" />
                <div className="h-3 w-20 rounded bg-white/10" />
              </div>

              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="shrink-0 w-[160px] h-[154px] sm:w-[200px] sm:h-[192px] lg:w-[220px] lg:h-[211px] flex flex-col justify-end relative"
                >
                  {/* Folder tab */}
                  <div className="h-3.5 w-14 sm:w-16 rounded-t-lg bg-white/10 ml-3" />
                  {/* Folder body */}
                  <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden">
                    {/* Peeking sheet edge */}
                    <div className="h-2.5 w-4/5 mx-auto rounded-t-md bg-white/[0.06]" />
                    <div className="flex items-end justify-between gap-2 pt-2">
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 w-24 sm:w-28 bg-white/10 rounded" />
                        <div className="h-2.5 w-14 bg-white/[0.07] rounded" />
                      </div>
                      <div className="h-6 w-6 rounded-lg bg-white/10 shrink-0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skeleton Notes */}
          <div className="flex flex-col gap-4">
            <div className="h-6 w-20 bg-white/10 rounded-lg ml-2" />
            <div className="grid mb-24 gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            Unable to retrieve your saved memories. Please check your connection
            or verify that the backend server is running.
          </p>
          {onRetryNotes && (
            <button
              onClick={onRetryNotes}
              className="py-2.5 px-5 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-2"
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
          <div className="flex flex-col gap-3 sm:gap-4 mb-8 sm:mb-10 min-w-0">
            <h1 className="internal text-xl sm:text-2xl pl-2">Collections</h1>
            <div className="no-scrollbar -mx-6 md:-mx-8 px-6 md:px-8 flex flex-nowrap items-start gap-4 sm:gap-6 overflow-x-auto overflow-y-hidden">
              <div className="flex justify-center items-end rounded-2xl  w-[160px] h-[154px] sm:w-[200px] sm:h-[192px] lg:w-[220px] lg:h-[211px]">
                <button
                  type="button"
                  onClick={() => {
                    setCreateModel(true);
                  }}
                  aria-label="Create new collection"
                  className="shrink-0 flex flex-col justify-center items-center gap-2 border-dashed hover:border-white/25 hover:bg-white/[0.03] rounded-2xl shadow-2xl p-4 sm:p-5 w-[160px] h-[154px] sm:w-[200px] sm:h-[192px] lg:w-[220px] lg:h-[150px] relative border-2 border-white/10 transition-all duration-300 cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                    New Collection
                  </span>
                </button>
              </div>

              {folders.map((groupName, indx) => {
                const isUngroupingThis = ungroupingFolder === groupName;
                const groupNotes = notes.filter((n) => n.group === groupName);
                const folderFiles = groupNotes.map((n) => ({
                  name: n.title || "Untitled",
                  meta: formatDate ? formatDate(n.updated_at) : n.note_type,
                  image: n.note_type === "img" ? n.source_url : undefined,
                }));

                return (
                  <div
                    key={groupName}
                    className="shrink-0"
                    onDoubleClick={() => openFolder(groupName)}
                    onTouchEnd={(e) => handleFolderTouchEnd(groupName, e)}
                    title="Double-click or double-tap to open collection"
                  >
                    <GlassFolder
                      label={groupName}
                      meta={
                        isUngroupingThis
                          ? "Ungrouping..."
                          : `${groupNotes.length} ${groupNotes.length === 1 ? "note" : "notes"}`
                      }
                      tone="dark"
                      art={MINIMAL_FOLDER_ART}
                      seed={indx + 1}
                      width={folderWidth}
                      files={folderFiles}
                      action="more"
                      menu={[
                        {
                          label: "Open Collection",
                          onSelect: () => openFolder(groupName),
                        },
                        {
                          label: isUngroupingThis ? "Ungrouping..." : "Ungroup",
                          danger: true,
                          onSelect: () => {
                            if (!ungroupingFolder) unGroupNotes(groupName);
                          },
                        },
                      ]}
                      onFileSelect={(_file, index) => {
                        const selected = groupNotes[index];
                        if (selected) {
                          setNoteViewId(selected.id);
                          setNoteViewOpen(true);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/*  Notes grid / masonry layout */}
          <div className="gap-5 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 pl-2 pr-2">
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="internal text-2xl">Notes</h1>
                {/* Note type filter tabs */}
                <div
                  role="tablist"
                  aria-label="Filter notes by type"
                  className="inline-flex items-center gap-1 p-1 rounded-xl glass-panel border border-white/10"
                >
                  {[
                    { id: "all", label: "All" },
                    { id: "voice", label: "Voice" },
                    { id: "img", label: "Images" },
                    { id: "text", label: "Text" },
                  ].map((tab) => {
                    const active = noteTypeFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setNoteTypeFilter(tab.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? "bg-white/15 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {search && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filtering:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                    <span>
                      {search.startsWith("#") ? search : `#${search}`}
                    </span>
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
              className="grid mb-24 gap-6 transition-all duration-500 ease-in-out grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
