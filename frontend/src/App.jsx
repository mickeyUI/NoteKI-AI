import React, { useState, useEffect, useCallback } from "react";
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

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [notes, setNotes] = useState([]);
  const [chats, setChats] = useState([]);
  const [folder, setFolder] = useState([]);
  const [group, setGroup] = useState("");

  // UI states
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isNoteViewOpen, setNoteViewOpen] = useState(false);
  const [noteCreationLoading, setNoteCreationLoading] = useState(false);
  const [noteViewLoading, setViewLoading] = useState(false);
  const [noteViewId, setNoteViewId] = useState("");
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isFolderOpen, setFolderOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pinnedIds, setPinnedIds] = useState(() => {
    const saved = localStorage.getItem("pinned_notes");
    return saved ? JSON.parse(saved) : [];
  });
  const [SidebarCollapse, setSidebarCollapse] = useState(false);

  // AI Streaming States
  const [searchQuery, setSearchQuery] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [citations, setCitations] = useState([]);

  // History viewing state
  const [activeHistoryItem, setActiveHistoryItem] = useState(null);
  const [userRes, setUserQuery] = useState([]);
  const [aiRes, setAiRes] = useState([]);

  // General status indicators
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);

  if (!token) {
    return <AuthPage onAuthSuccess={setToken} />;
  }

  // Sync token to localStorage and load data
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      loadDashboardData();
    } else {
      localStorage.removeItem("token");
      setNotes([]);
      setChats([]);
    }
  }, [token]);

  // Auth failure listener (to handle 401 redirects from the fetch API client)
  useEffect(() => {
    const handleAuthFailed = () => {
      setToken(null);
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
          console.error("Chats load error", err);
          return [];
        }),
      ]);
      setNotes(fetchedNotes || []);
      setChats(fetchedChats || []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoadingNotes(false);
      setLoadingChats(false);
    }
  };

  // Safe unpacked data getters to prevent React rendering crashes
  const getSafeNotes = () => {
    if (!notes) return [];
    if (Array.isArray(notes)) {
      return notes.filter((note) => note?.group === "none");
    }
    return [];
  };

  const getSafeChats = () => {
    if (!chats) return [];
    if (Array.isArray(chats)) return chats;
    if (chats.chats && Array.isArray(chats.chats)) return chats.chats;
    if (chats.data && Array.isArray(chats.data)) return chats.data;
    return [];
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
    console.log("Folders found:", Array.from(folderSet));
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

  const safeNotes = getSafeNotes();
  const safeChats = getSafeChats();

  const pinnedNotes = safeNotes.filter(
    (n) => n && n.id && pinnedIds.includes(n.id),
  );
  const standardNotes = safeNotes.filter(
    (n) => n && n.id && !pinnedIds.includes(n.id),
  );

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
  };

  const handleCreateNote = async (noteData) => {
    setNoteCreationLoading(true);
    try {
      const newNote = await api.addNote(noteData);
      if (newNote && newNote.id) {
        setNotes((prev) => {
          const currentList = getSafeNotes();
          return [newNote, ...currentList];
        });
      } else {
        await api.getNotes().then(setNotes);
      }
      setIsNoteModalOpen(false);
    } catch (err) {
      alert("Failed to create note: " + err.message);
    } finally {
      setNoteCreationLoading(false);
    }
  };

  const handleUploading = async (noteData) => {
    try {
      if (!noteData.source_url) {
        alert("image is required.");
        return;
      }
      const newUpload = await api.uploadImg(noteData);
      console.log(newUpload);
      if (newUpload && newUpload.id) {
        setNotes(() => {
          const currentList = getSafeNotes();
          return [newUpload, ...currentList];
        });
      } else {
        await api.getNotes().then(setNotes);
      }
      setUploadOpen(false);
    } catch (err) {
      alert("Failed to create note: " + err.message);
    } finally {
      setUploading(false);
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
      setNoteViewOpen(false);
    } catch (err) {
      alert("Failed to create note: " + err.message);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDeleteNote = async (noteID) => {
    const res = await api.deleteNote(noteID);
    if (res) {
      const newNote = notes.filter((note) => note.id != noteID);
      setNotes(newNote);
    } else {
      alert("error");
    }
  };

  const handleDeleteChat = async (chatID) => {
    const res = await api.deleteChat(chatID);
    if (res) {
      const newChat = chats.filter((chat) => chat.id != chatID);
      setChats(newChat);
    } else {
      alert("error");
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
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ question: query }),
      });

      if (!response.ok) {
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
    console.log("Grouping notes by group field...");
    const res = await api.groupNotes();
    if (res) {
      try {
        const updatedNotes = await api.getNotes();
        if (updatedNotes) {
          setNotes(updatedNotes);
        }
      } catch (err) {
        console.error("Failed to refresh notes after grouping:", err);
      }
    } else {
      alert("error, failed to group notes. Please try again.");
    }
  };

  const handleUngrouping = async (folder) => {
    console.log("Ungrouping notes in folder:", folder);
    const res = await api.ungroupNotes(folder);
    if (res) {
      try {
        const updatedNotes = await api.getNotes();
        if (updatedNotes) {
          setNotes(updatedNotes);
        }
      } catch (err) {
        console.error("Failed to refresh notes after ungrouping:", err);
      }
    } else {
      alert("error, failed to ungroup notes. Please try again.");
    }
  };

  const openFolder = (group) => {
    setFolderOpen(true);
    setGroup(group);
  };

  return (
    <div className="flex  h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Sidebar - Left Panel */}
      {!SidebarCollapse ? (
        <Sidebar
          pinnedNotes={pinnedNotes}
          chats={safeChats}
          loadingChats={loadingChats}
          activeHistoryItem={activeHistoryItem}
          onViewHistory={handleViewHistoryChat}
          onSelectShortcut={(title) => setInputVal(title)}
          onTogglePin={togglePin}
          onLogout={handleLogout}
          onOpenCreateNoteModal={() => setIsNoteModalOpen(true)}
          toggleDelete={handleDeleteChat}
          handleGrouping={handleGrouping}
          handleCollapseSidebar={setSidebarCollapse}
        />
      ) : (
        <button
          onClick={() => setSidebarCollapse(false)}
          className="absolute -top-200 left-0 bg-amber h-20 w-20 bg-amber-950"
        >
          return
        </button>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden bg-[#030712]">
        {/* Glow ambient background inside dashboard */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-15%] left-[20%] w-[45%] h-[45%] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

        {/* Split Panel Flex Core */}
        <div className="flex-1 flex h-[calc(100vh-80px)] overflow-hidden relative z-10">
          {/* Notes Feed Container */}
          <NotesFeed
            loadingNotes={loadingNotes}
            notes={safeNotes}
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
          />

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

        {/* AI Search/Chat Input (Bottom Fixed) */}
        <ChatInput
          inputVal={inputVal}
          onChange={setInputVal}
          isStreaming={isStreaming}
          onSubmit={handleSearchSubmit}
        />
      </main>

      {/* Note Modal Dialog */}
      <CreateNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSubmit={handleCreateNote}
        loading={noteCreationLoading}
      />
      <ViewNote
        isOpen={isNoteViewOpen}
        setView={setNoteViewOpen}
        loading={noteViewLoading}
        noteid={noteViewId}
        setid={setNoteViewId}
        notes={notes}
        onSubmit={handleEditNote}
      />
      <Upload
        isOpen={isUploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUploading}
        loading={uploading}
        setLoading={setUploading}
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
    </div>
  );
}
