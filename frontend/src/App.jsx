import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "./services/api";
import AuthPage from "./components/AuthPage";
import CreateNoteModal from "./components/CreateNoteModal";
import Sidebar from "./components/Sidebar";
import NotesFeed from "./components/NotesFeed";
import AIAnswerPanel from "./components/AIAnswerPanel";
import ChatInput from "./components/ChatInput";
import ViewNote from "./components/ViewNote";
import Upload from "./components/Upload";
import Folder from "./components/Folder";
import { FastForward, Heading1 } from "lucide-react";
import { Button } from "flowbite-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import CreateCollection from "./components/CreateCollection";

export default function App() {
  const [session, setSession] = useState(null);
  const [notes, setNotes] = useState([]);
  const [chats, setChats] = useState([]);
  const [folder, setFolder] = useState([]);
  const [group, setGroup] = useState("");
  const [ungrouped, setUngrouped] = useState([]);

  // UI states
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isNoteViewOpen, setNoteViewOpen] = useState(false);
  const [noteCreationLoading, setNoteCreationLoading] = useState(false);
  const [noteViewLoading, setViewLoading] = useState(false);
  const [noteViewId, setNoteViewId] = useState("");
  const [isUploadOpen, setUploadOpen] = useState(false);
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
  const [pullSidebar, setPullSidebar] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync token to localStorage and load data
  useEffect(() => {
    if (session) {
      loadDashboardData();
      // toast.success("its loads 2 times. don't know why figure it out ");
    } else {
      setNotes([]);
      setChats([]);
    }
  }, [session]);

  // Auth failure listener (to handle 401 redirects from the fetch API client)
  useEffect(() => {
    const handleAuthFailed = () => {
      setSession(null);
    };
    window.addEventListener("auth-failed", handleAuthFailed);
    return () => window.removeEventListener("auth-failed", handleAuthFailed);
  }, []);

  const loadDashboardData = async () => {
    setLoadingNotes(true);
    setLoadingChats(true);
    try {
      // Parallel fetch as required: /GetNotes and /Chats
      const [fetchedNotes, fetchedChats] = await Promise.all([
        api.getNotes().catch((err) => {
          console.error("Notes load error", err);
          return [];
        }),
        api.getChats().catch((err) => {
          console.error("Chats load error", err.message);
          return [];
        }),
      ]);
      setNotes(fetchedNotes || []);
      setChats(fetchedChats || []);
      const ungroup = fetchedNotes.filter((note) => note.group == "none");
      setUngrouped(ungroup);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoadingNotes(false);
      setLoadingChats(false);
    }
  };

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

  const pinnedNotes = ungrouped.filter(
    (n) => n && n.id && pinnedIds.includes(n.id),
  );
  const standardNotes = ungrouped.filter(
    (n) => n && n.id && !pinnedIds.includes(n.id),
  );

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

  const handleDeleteNote = async (noteID) => {
    try {
      const res = await api.deleteNote(noteID);
      if (res) {
        const newNote = notes.filter((note) => note.id != noteID);
        setNotes(newNote);
        toast.success("Note Deleted");
      }
    } catch (err) {
      toast.error("Try Again");
      console.log("Error:", err.message);
    }
  };

  const handleDeleteChat = async (chatID) => {
    try {
      const res = await api.deleteChat(chatID);
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
        body: JSON.stringify({ question: query }),
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
        let chatResult = activeHistoryItem || "";
        if (!activeHistoryItem) {
          chatResult = await api.addChat(query);
        }
        const chatId = chatResult?.id || "";

        const [fetchedUserQuery, fetchedAiRes] = await Promise.all([
          api.addMessage(chatId, query, "user").catch((err) => {
            console.error("Notes load error", err);
            return [];
          }),
          api.addMessage(chatId, fullResponseText, "AI").catch((err) => {
            console.error("Chats load error", err);
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
  }, []);

  const handleViewHistoryChat = (chatItem) => {
    setActiveHistoryItem(chatItem);
    setSearchQuery(chatItem.title || "Conversation");

    let responseContent =
      chatItem.response || chatItem.answer || chatItem.content || "";
    if (!responseContent && chatItem.messages && chatItem.messages.length > 0) {
      const lastMsg = chatItem.messages[chatItem.messages.length - 1];
      responseContent =
        lastMsg.response || lastMsg.answer || lastMsg.content || "";
    }

    setAiResponse(
      responseContent ||
        "This conversation summary was recorded. No detailed message body was stored.",
    );
    setCitations([]);
    setIsSearchActive(true);
  };

  const handleGrouping = async () => {
    try {
      setGrouping(true);
      const res = await api.groupNotes();
      const updatedNotes = await api.getNotes();
      if (updatedNotes) {
        setNotes(updatedNotes);
      }
    } catch (err) {
      toast.error("Try Again Later");
      console.error("Failed grouping:", err);
    } finally {
      setGrouping(false);
      toast.success("Grouping Finished");
    }
  };

  const handleUngrouping = async (folder) => {
    try {
      setGrouping(true);
      const res = await api.ungroupNotes(folder);
      const updatedNotes = await api.getNotes();
      if (updatedNotes) {
        setNotes(updatedNotes);
      }
    } catch (err) {
      toast.error("Try Again Later");
      console.error("ungrouping faild:", err);
    } finally {
      setGrouping(false);
      toast.success(`${folder} Ungrouped`);
    }
  };

  const CreateNewCollection = async (notes, collectionName) => {
    try {
      const res = await api.customGroup(notes, collectionName);
      const updatedNotes = await api.getNotes();
      if (updatedNotes) {
        setNotes(updatedNotes);
        toast.success(`${collectionName} Created`);
      }
    } catch (err) {
      toast.error("Try Again Later");
      console.error("custom grouping faild:", err);
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
              notes={notes}
              folders={folder}
              pinnedNotes={pinnedNotes}
              standardNotes={standardNotes}
              pinnedIds={pinnedIds}
              onTogglePin={togglePin}
              onSelectTag={(tag) => setInputVal(`#${tag}`)}
              onOpenCreateNoteModal={() => setIsNoteModalOpen(true)}
              isSearchActive={isSearchActive}
              formatDate={formatDate}
              handleDeleteNote={handleDeleteNote}
              setNoteViewId={setNoteViewId}
              setNoteViewOpen={setNoteViewOpen}
              openUpload={setUploadOpen}
              openFolder={openFolder}
              unGroupNotes={handleUngrouping}
              grouping={grouping}
              isShowing={pullSidebar}
              setPullSidebar={setPullSidebar}
              setCreateModel={setCreateGroupModalOpen}
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
        onSelectTag={(tag) => setInputVal(`#${tag}`)}
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
    </div>
  );
}
