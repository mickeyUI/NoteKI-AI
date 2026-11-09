import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "./services/api";
import AuthPage from "./components/AuthPage";
import CreateNoteModal from "./components/CreateNoteModal";
import Sidebar from "./components/Sidebar";
import NotesFeed from "./components/NotesFeed";
import AIAnswerPanel from "./components/AIAnswerPanel";
import ChatInput from "./components/ChatInput";
import ViewNote from "./components/ViewNote";
import Upload from "./components/Upload";
import VoiceUpload from "./components/VoiceUpload";
import Folder from "./components/Folder";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import CreateCollection from "./components/CreateCollection";
import { Trash2 } from "lucide-react";

export default function App() {
  const [session, setSession] = useState(null);
  const [notes, setNotes] = useState([]);
  const [chats, setChats] = useState([]);
  const [folder, setFolder] = useState([]);
  const [group, setGroup] = useState("");
  const [ungrouped, setUngrouped] = useState([]);
  const lastLoadedUserIdRef = useRef(null);

  // UI states
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isNoteViewOpen, setNoteViewOpen] = useState(false);
  const [noteCreationLoading, setNoteCreationLoading] = useState(false);
  const [noteViewLoading, setViewLoading] = useState(false);
  const [noteViewId, setNoteViewId] = useState("");
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isVoiceOpen, setVoiceOpen] = useState(false);
  const [isFolderOpen, setFolderOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState(() => {
    const saved = localStorage.getItem("pinned_notes");
    return saved ? JSON.parse(saved) : [];
  });

  // AI Streaming States
  const [searchQuery, setSearchQuery] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [citations, setCitations] = useState([]);

  // search and response
  const [activeHistoryItem, setActiveHistoryItem] = useState(null);
  const [userRes, setUserQuery] = useState([]);
  const [aiRes, setAiRes] = useState([]);

  // Status
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [grouping, setGrouping] = useState(false);
  const [ungroupingFolder, setUngroupingFolder] = useState(null);
  const [pullSidebar, setPullSidebar] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [selectedTag, setSelectedTag] = useState("");

  const handleTagFilter = (tag) => {
    setSelectedTag(tag);
    setFolderOpen(false);
  };

  const [notesFetchError, setNotesFetchError] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoadingNotes(true);
    setLoadingChats(true);
    setNotesFetchError(false);
    try {
      let notesError = null;
      let chatsError = null;

      // Parallel fetch as required: /GetNotes and /Chats
      const [fetchedNotes, fetchedChats] = await Promise.all([
        api.getNotes().catch((err) => {
          console.error("Notes load error:", err);
          notesError = err;
          return null;
        }),
        api.getChats().catch((err) => {
          console.error("Chats load error:", err);
          chatsError = err;
          return null;
        }),
      ]);

      if (notesError) {
        setNotesFetchError(true);
        toast.error("Couldn't connect to server: Error fetching notes.");
      } else if (Array.isArray(fetchedNotes)) {
        setNotes(fetchedNotes);
        setNotesFetchError(false);
      }

      if (chatsError) {
        toast.warning("Couldn't connect to server: Error fetching chats.");
      } else if (Array.isArray(fetchedChats)) {
        setChats(fetchedChats);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setNotesFetchError(true);
      toast.error("Couldn't connect to server. Please try again.");
    } finally {
      setLoadingNotes(false);
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession) {
        setSession(initialSession);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync token to localStorage and load data once per authenticated user
  useEffect(() => {
    const userId = session?.user?.id;
    if (userId) {
      if (lastLoadedUserIdRef.current !== userId) {
        lastLoadedUserIdRef.current = userId;
        loadDashboardData();
      }
    } else {
      lastLoadedUserIdRef.current = null;
      setNotes([]);
      setChats([]);
    }
  }, [session?.user?.id, loadDashboardData]);

  // Auth failure listener (to handle 401 redirects from the fetch API client)
  useEffect(() => {
    const handleAuthFailed = () => {
      setSession(null);
    };
    window.addEventListener("auth-failed", handleAuthFailed);
    return () => window.removeEventListener("auth-failed", handleAuthFailed);
  }, []);

  useEffect(() => {
    const ungroup = notes.filter((note) => note.group == "none");
    setUngrouped(ungroup);
  }, [notes]);

  const pinnedNotes = ungrouped.filter(
    (n) => n && n.id && pinnedIds.includes(n.id),
  );
  const standardNotes = ungrouped.filter(
    (n) => n && n.id && !pinnedIds.includes(n.id),
  );

  const setFolders = () => {
    if (!notes || !Array.isArray(notes)) {
      setFolder([]);
      return;
    }

    const folderSet = new Set();
    notes.forEach((note) => {
      if (note?.group !== "none") {
        folderSet.add(note.group);
      }
    });
    setFolder(Array.from(folderSet));
  };

  useEffect(() => {
    setFolders();
  }, [notes]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recently";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "Recently"
      : d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  };

  const handleLogout = async () => {
    console.log("clicked");
    setSession(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("couldn't logout:   ", error);
    }
  };

  const handleCreateNote = async (noteData) => {
    setNoteCreationLoading(true);
    try {
      const newNote = await api.addNote(noteData);
      if (newNote && newNote.id) {
        setNotes((prev) => [newNote, ...prev]);
      } else {
        await api.getNotes().then(setNotes);
      }
      toast.success("Note Created");
    } catch (err) {
      toast.error("Try Again");
      console.log("Failed to create note: " + err.message);
    } finally {
      setNoteCreationLoading(false);
      setIsNoteModalOpen(false);
    }
  };

  const handleUploading = async (noteData) => {
    try {
      const newUpload = await api.uploadImg(noteData);
      if (newUpload && newUpload.id) {
        setNotes(() => [newUpload, ...notes]);
      } else {
        await api.getNotes().then(setNotes);
      }
      toast.success("Upload Complete");
    } catch (err) {
      toast.error("Try Again");
      console.log("Failed to create note: " + err.message);
    } finally {
      setUploading(false);
      setUploadOpen(false);
    }
  };

  const handleEditNote = async (noteData) => {
    try {
      setViewLoading(true);
      const newNote = await api.editNote(noteData);
      if (newNote && newNote.id) {
        const modified = notes.filter((note) => note.id != newNote.id);
        setNotes([newNote, ...modified]);
      } else {
        await api.getNotes().then(setNotes);
      }
      toast.success("Edit Complete");
    } catch (err) {
      toast.error("Try Again");
      console.log("Failed to create note: " + err.message);
    } finally {
      setViewLoading(false);
      setNoteViewOpen(false);
    }
  };

  const handleDeleteNote = (noteID) => {
    setDeleteConfirmId(noteID);
  };

  const confirmDeleteNote = async () => {
    const noteID = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      setNotes((prev) => prev.filter((note) => note.id !== noteID));
      setUngrouped((prev) => prev.filter((note) => note.id !== noteID));
      await api.deleteNote(noteID);
      toast.success("Note Deleted");
    } catch (err) {
      toast.error("Try Again");
      console.log("Error:", err.message);
    }
  };

  const handleDeleteChat = async (chatID) => {
    try {
      await api.deleteChat(chatID);
      const newChat = chats.filter((chat) => chat.id != chatID);
      setChats(newChat);
    } catch (err) {
      toast.error("Try Again");
      console.log("ERROR: ", err.message);
    }
  };

  const togglePin = (noteId) => {
    const nextPinned = pinnedIds.includes(noteId)
      ? pinnedIds.filter((id) => id !== noteId)
      : [...pinnedIds, noteId];
    setPinnedIds(nextPinned);
    localStorage.setItem("pinned_notes", JSON.stringify(nextPinned));
  };

  const handleStartNewChat = useCallback(() => {
    setActiveHistoryItem(null);
    setSearchQuery("");
    setAiResponse("");
    setCitations([]);
    setUserQuery([]);
    setAiRes([]);
    setIsSearchActive(true);
  }, []);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const query = inputVal;
    setInputVal("");
    setSearchQuery(query);
    setIsSearchActive(true);
    setAiResponse("");
    setIsStreaming(true);

    try {
      const response = await fetch(`${api.baseUrl}/question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: query,
          conversation_id: activeHistoryItem?.id || undefined,
        }),
      });

      if (!response.ok) {
        toast.error("Try Again");
        throw new Error(`AI Streaming failed: ${response.statusText}`);
      }
      const stringifiedCitation = response.headers.get("X-Citation");
      if (stringifiedCitation) {
        const parsedCitation = JSON.parse(stringifiedCitation);
        setCitations(parsedCitation);
        console.log("Citations received:", parsedCitation);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponseText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          fullResponseText += chunk;
          setAiResponse(fullResponseText);
        }
      }

      try {
        let chatResult = activeHistoryItem;
        if (!chatResult || !chatResult.id) {
          chatResult = await api.addChat(query);
          if (chatResult && chatResult.id) {
            setActiveHistoryItem(chatResult);
          }
        }
        const chatId = chatResult?.id || "";

        const [fetchedUserQuery, fetchedAiRes] = await Promise.all([
          api.addMessage(chatId, query, "user").catch((err) => {
            console.error("User message save error", err);
            return [];
          }),
          api.addMessage(chatId, fullResponseText, "AI").catch((err) => {
            console.error("AI message save error", err);
            return [];
          }),
        ]);
        setUserQuery(fetchedUserQuery || []);
        setAiRes(fetchedAiRes || []);
        await api.getChats().then(setChats);
      } catch (logErr) {
        toast.error("Try Again");
        console.error("Failed to log chat conversation:", logErr);
      }
    } catch (err) {
      console.error(err);
      setAiResponse(
        `An error occurred while generating the response: ${err.message}`,
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleDismissSearch = useCallback(() => {
    setIsSearchActive(false);
    setSearchQuery("");
    setAiResponse("");
    setActiveHistoryItem(null);
    setCitations([]);
    setUserQuery([]);
    setAiRes([]);
  }, []);

  const handleViewHistoryChat = (chatItem) => {
    setActiveHistoryItem(chatItem);
    setSearchQuery(chatItem.title || "Conversation");
    setAiResponse("");
    setCitations([]);
    setIsSearchActive(true);
  };

  const handleGrouping = async () => {
    try {
      setGrouping(true);
      toast.success("Grouping ....");
      await api.groupNotes();
      const updatedNotes = await api.getNotes();
      if (updatedNotes) {
        setNotes(updatedNotes);
      }
      toast.success("Grouping Finished");
    } catch (err) {
      toast.error("Try Again Later");
      console.error("Failed grouping:", err);
    } finally {
      setGrouping(false);
    }
  };

  const handleUngrouping = async (folder) => {
    try {
      setUngroupingFolder(folder);
      toast.success("Ungrouping ....");
      await api.ungroupNotes(folder);
      const updatedNotes = await api.getNotes();
      const ungroupedNotes = notes.filter((note) => note.group == folder);
      if (updatedNotes) {
        setNotes(updatedNotes);
        setUngrouped((prev) => [...prev, ...ungroupedNotes]);
      }
      toast.success(`${folder} Ungrouped`);
    } catch (err) {
      toast.error("Try Again Later");
      console.error("ungrouping failed:", err);
    } finally {
      setUngroupingFolder(null);
    }
  };

  const CreateNewCollection = async (notes, collectionName) => {
    try {
      await api.customGroup(notes, collectionName);
      const updatedNotes = await api.getNotes();
      if (updatedNotes) {
        setNotes(updatedNotes);
        toast.success(`${collectionName} Created`);
      }
    } catch (err) {
      toast.error("Try Again Later");
      console.error("custom grouping failed:", err);
    }
  };

  const openFolder = (group) => {
    setFolderOpen(true);
    setGroup(group);
  };
  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="flex  h-screen text-slate-100 overflow-hidden font-sans select-none">
      <Toaster position="top-center" theme="light" />
      {/* Sidebar - Left Panel */}
      <AnimatePresence>
        {!pullSidebar && (
          <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Sidebar
              pinnedNotes={pinnedNotes}
              chats={chats}
              loadingChats={loadingChats}
              activeHistoryItem={activeHistoryItem}
              onViewHistory={handleViewHistoryChat}
              onSelectShortcut={(title) => setInputVal(title)}
              onTogglePin={togglePin}
              onLogout={handleLogout}
              onOpenCreateNoteModal={() => setIsNoteModalOpen(true)}
              toggleDelete={handleDeleteChat}
              handleGrouping={handleGrouping}
              Grouping={grouping}
              pullButton={setPullSidebar}
              onStartNewChat={handleStartNewChat}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden bg-[#030712]">
        {/* Glow ambient background inside dashboard */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-15%] left-[20%] w-[45%] h-[45%] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

        {/* Split Panel Flex Core */}
        <div className="flex-1 flex h-[calc(100vh-80px)] overflow-hidden relative z-10">
          {/* Notes Feed Container */}
          <AnimatePresence>
            <NotesFeed
              loadingNotes={loadingNotes}
              notesFetchError={notesFetchError}
              onRetryNotes={loadDashboardData}
              notes={notes}
              folders={folder}
              pinnedNotes={pinnedNotes}
              standardNotes={standardNotes}
              pinnedIds={pinnedIds}
              onTogglePin={togglePin}
              onSelectTag={handleTagFilter}
              selectedTag={selectedTag}
              onOpenCreateNoteModal={() => setIsNoteModalOpen(true)}
              isSearchActive={isSearchActive}
              formatDate={formatDate}
              handleDeleteNote={handleDeleteNote}
              setNoteViewId={setNoteViewId}
              setNoteViewOpen={setNoteViewOpen}
              openUpload={setUploadOpen}
              openVoice={setVoiceOpen}
              openFolder={openFolder}
              unGroupNotes={handleUngrouping}
              grouping={grouping}
              ungroupingFolder={ungroupingFolder}
              isShowing={pullSidebar}
              setPullSidebar={setPullSidebar}
              setCreateModel={setCreateGroupModalOpen}
              ungroupedNotes={ungrouped}
            />
          </AnimatePresence>

          {/* AI Answer Panel - Slide out layout */}
          <AIAnswerPanel
            isSearchActive={isSearchActive}
            searchQuery={searchQuery}
            aiResponse={aiResponse}
            isStreaming={isStreaming}
            citations={citations}
            onClose={handleDismissSearch}
            convo={activeHistoryItem}
            userRes={userRes}
            aiRes={aiRes}
            setNoteViewId={setNoteViewId}
            setNoteViewOpen={setNoteViewOpen}
            onStartNewChat={handleStartNewChat}
          />
        </div>
      </main>

      {/* AI Search/Chat Input (Bottom Fixed) */}
      <ChatInput
        inputVal={inputVal}
        onChange={setInputVal}
        isStreaming={isStreaming}
        onSubmit={handleSearchSubmit}
      />
      {/* Note Modal Dialog */}
      <CreateNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSubmit={handleCreateNote}
        loading={noteCreationLoading}
        folders={folder}
      />
      <ViewNote
        isOpen={isNoteViewOpen}
        setView={setNoteViewOpen}
        loading={noteViewLoading}
        noteid={noteViewId}
        setid={setNoteViewId}
        notes={notes}
        onSubmit={handleEditNote}
        folders={folder}
      />
      <Upload
        isOpen={isUploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUploading}
        loading={uploading}
        setLoading={setUploading}
        folders={folder}
      />
      <VoiceUpload
        isOpen={isVoiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSubmit={handleCreateNote}
        loading={noteCreationLoading}
        folders={folder}
      />
      <Folder
        isOpen={isFolderOpen}
        setView={setFolderOpen}
        notes={notes}
        group={group}
        onTogglePin={togglePin}
        onOpenCreateNoteModal={() => setIsNoteModalOpen(true)}
        isSearchActive={isSearchActive}
        formatDate={formatDate}
        handleDeleteNote={handleDeleteNote}
        onSelectTag={handleTagFilter}
        setNoteViewId={setNoteViewId}
        setNoteViewOpen={setNoteViewOpen}
      />
      <CreateCollection
        isOpen={createGroupModalOpen}
        onClose={() => setCreateGroupModalOpen(false)}
        onSubmit={CreateNewCollection}
        loading={uploading}
        setLoading={setUploading}
        ungrouped={ungrouped}
        setUngrouped={setUngrouped}
        folders={folder}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative z-10 w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl border border-white/10 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Memory</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                "{notes.find((n) => n.id === deleteConfirmId)?.title || "this note"}"
              </span>
              ?
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteNote}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
