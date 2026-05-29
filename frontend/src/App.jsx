import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import AuthPage from './components/AuthPage';
import CreateNoteModal from './components/CreateNoteModal';
import Sidebar from './components/Sidebar';
import NotesFeed from './components/NotesFeed';
import AIAnswerPanel from './components/AIAnswerPanel';
import ChatInput from './components/ChatInput';
import ViewNote from './components/ViewNote';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [notes, setNotes] = useState([]);
  const [chats, setChats] = useState([]);
  
  // UI states
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isNoteViewOpen, setNoteViewOpen] = useState(false);
  const [noteCreationLoading, setNoteCreationLoading] = useState(false);
  const [noteViewLoading, setViewLoading] = useState(false);
  const [noteViewId, setNoteViewId] = useState('');
  const [pinnedIds, setPinnedIds] = useState(() => {
    const saved = localStorage.getItem('pinned_notes');
    return saved ? JSON.parse(saved) : [];
  });

  // AI Streaming States
  const [searchQuery, setSearchQuery] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [citations, setCitations] = useState([]);
  
  // History viewing state
  const [activeHistoryItem, setActiveHistoryItem] = useState(null);
  
  // General status indicators
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);

  // Sync token to localStorage and load data
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      loadDashboardData();
    } else {
      localStorage.removeItem('token');
      setNotes([]);
      setChats([]);
    }
  }, [token]);

  // Auth failure listener (to handle 401 redirects from the fetch API client)
  useEffect(() => {
    const handleAuthFailed = () => {
      setToken(null);
    };
    window.addEventListener('auth-failed', handleAuthFailed);
    return () => window.removeEventListener('auth-failed', handleAuthFailed);
  }, []);

  const loadDashboardData = async () => {
    setLoadingNotes(true);
    setLoadingChats(true);
    try {
      // Parallel fetch as required: /GetNotes and /Chats
      const [fetchedNotes, fetchedChats] = await Promise.all([
        api.getNotes().catch(err => {
          console.error("Notes load error", err);
          return [];
        }),
        api.getChats().catch(err => {
          console.error("Chats load error", err);
          return [];
        })
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
    if (Array.isArray(notes)) return notes;
    if (notes.notes && Array.isArray(notes.notes)) return notes.notes;
    if (notes.data && Array.isArray(notes.data)) return notes.data;
    return [];
  };

  const getSafeChats = () => {
    if (!chats) return [];
    if (Array.isArray(chats)) return chats;
    if (chats.chats && Array.isArray(chats.chats)) return chats.chats;
    if (chats.data && Array.isArray(chats.data)) return chats.data;
    return [];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  const handleCreateNote = async (noteData) => {
    setNoteCreationLoading(true);
    try {
      const newNote = await api.addNote(noteData);
      // Optimistically append note if backend returns it, else refetch list
      if (newNote && newNote.id) {
        setNotes(prev => {
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

  const handleEditNote = async (noteData) => {
    try {
      setViewLoading(true)
      const newNote = await api.editNote(noteData);
      // Optimistically append note if backend returns it, else refetch list
      if (newNote && newNote.id) {
        const modified = notes.filter(note => note.id != newNote.id);
        setNotes([newNote, ...modified])
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
      const newNote = notes.filter( note => note.id != noteID);
      setNotes(newNote);
    } else {
      alert("error")
    }
  }
  const togglePin = (noteId) => {
    const nextPinned = pinnedIds.includes(noteId)
      ? pinnedIds.filter(id => id !== noteId)
      : [...pinnedIds, noteId];
    setPinnedIds(nextPinned);
    localStorage.setItem('pinned_notes', JSON.stringify(nextPinned));
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const query = inputVal;
    setInputVal('');
    setSearchQuery(query);
    setActiveHistoryItem(null); // clear viewing past chats
    setIsSearchActive(true); // compress notes grid, slide out panel
    setAiResponse('');
    setIsStreaming(true);

    const safeNotesList = getSafeNotes();
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const relatedNotes = safeNotesList.filter(note => {
      if (!note) return false;
      const matchTitle = (note.title || '').toLowerCase();
      const matchContent = (note.content || '').toLowerCase();
      //const matchTags = note.tags ? note.tags.some(t => query.toLowerCase().includes(t.toLowerCase())) : false;
      //return keywords.some(k => matchTitle.includes(k) || matchContent.includes(k)) || matchTags;
    }).slice(0, 3); // cap citations to 3 items

    setCitations(relatedNotes.map(n => ({
      title: n.title,
      source_url: n.source_url || `Note Reference: ${n.title}`,
      excerpt: n.content.substring(0, 100) + '...'
    })));

    try {
      const response = await fetch(`${api.baseUrl}/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ question: query })
      });

      if (!response.ok) {
        throw new Error(`AI Streaming failed: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponseText = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          fullResponseText += chunk;
          setAiResponse(fullResponseText);
        }
      }

      // Streaming completed successfully, trigger logs on the backend
      try {
        const chatResult = await api.addChat(query);
        const chatId = chatResult?.id || chatResult?.chat_id || 1;
        await api.addMessage(chatId, query, fullResponseText);
        // Refresh Chats list in the sidebar
        await api.getChats().then(setChats);
      } catch (logErr) {
        console.error("Failed to log chat conversation:", logErr);
      }

    } catch (err) {
      console.error(err);
      setAiResponse(`An error occurred while generating the response: ${err.message}`);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleDismissSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
    setAiResponse('');
    setActiveHistoryItem(null);
    setCitations([]);
  };

  const handleViewHistoryChat = (chatItem) => {
    setActiveHistoryItem(chatItem);
    setSearchQuery(chatItem.title || 'Conversation');
    
    // Find recorded message inside chat logs
    let responseContent = chatItem.response || chatItem.answer || chatItem.content || '';
    if (!responseContent && chatItem.messages && chatItem.messages.length > 0) {
      const lastMsg = chatItem.messages[chatItem.messages.length - 1];
      responseContent = lastMsg.response || lastMsg.answer || lastMsg.content || '';
    }

    setAiResponse(responseContent || "This conversation summary was recorded. No detailed message body was stored.");
    setCitations([]);
    setIsSearchActive(true); // Compresses notes grid, slides out panel
  };

  if (!token) {
    return <AuthPage onAuthSuccess={setToken} />;
  }

  const safeNotes = getSafeNotes();
  const safeChats = getSafeChats();
  

  const pinnedNotes = safeNotes.filter(n => n && n.id && pinnedIds.includes(n.id));
  const standardNotes = safeNotes.filter(n => n && n.id && !pinnedIds.includes(n.id));

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Sidebar - Left Panel */}
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
      />

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
            pinnedNotes={pinnedNotes}
            standardNotes={standardNotes}
            pinnedIds={pinnedIds}
            onTogglePin={togglePin}
            onSelectTag={(tag) => setInputVal(`#${tag}`)}
            onOpenCreateNoteModal={() => setIsNoteModalOpen(true)}
            isSearchActive={isSearchActive}
            formatDate={formatDate}
            handleDeleteNote= {handleDeleteNote}
            setNoteViewId = {setNoteViewId}
            setNoteViewOpen= {setNoteViewOpen}
            />

          {/* AI Answer Panel - Slide out layout */}
          <AIAnswerPanel
            isSearchActive={isSearchActive}
            searchQuery={searchQuery}
            aiResponse={aiResponse}
            isStreaming={isStreaming}
            citations={citations}
            onClose={handleDismissSearch}
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
        setView ={setNoteViewOpen}
        loading={noteViewLoading}
        noteid= {noteViewId}
        setid= {setNoteViewId}
        notes= {notes}
        onSubmit= {handleEditNote}
        
      />
    </div>
  );
}
