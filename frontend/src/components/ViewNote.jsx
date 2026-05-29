import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Loader2 } from 'lucide-react';

export default function ViewNote({ isOpen, setView, onSubmit, loading, noteid, setid, notes }) {
    const [id, setId]= useState('')
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [creation, setCreated] = useState('');
    
    // When noteid changes, find and populate the note data
    useEffect(() => {
        if (noteid && notes.length > 0) {
            const selectedNote = notes.find(note => note.id == noteid);
            if (selectedNote) {
                setId(selectedNote.id)
                setTitle(selectedNote.title || '');
                setContent(selectedNote.content || '');
                setTags(selectedNote.tags || '');
                setSourceUrl(selectedNote.source_url || '');
                setCreated(selectedNote.created_at || '');
                
            }
        }
    }, [noteid, notes, isOpen]);
    
    if (!isOpen) return null;
  
    const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  })
}
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !content) return;

    // Split tags by comma, trim white spaces, filter out empty fields
    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSubmit({
        id,
      title,
      content,
      tags: tagArray.toString(),
      sourceUrl
    });

  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop mask */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={() => setView(false)}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setView(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400">
            <Plus className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">View Note</h2>
            <p className="text-xs text-slate-400 font-medium">Add a note or resource to your AI knowledge base</p>
          </div>
        </div>

        {/* Fields */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full py-3 px-4 text-white placeholder-slate-600 rounded-xl text-sm"
              placeholder="e.g. Core architectural principles of React"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="glass-input w-full min-h-[120px] max-h-[240px] py-3 px-4 text-white placeholder-slate-600 rounded-xl text-sm resize-none"
              placeholder="Write the core details, ideas, or insights..."
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="glass-input w-full py-3 px-4 text-white placeholder-slate-600 rounded-xl text-sm"
              placeholder="e.g. frontend, react, tips"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Source URL (Optional)
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="glass-input w-full py-3 px-4 text-white placeholder-slate-600 rounded-xl text-sm"
              placeholder="https://example.com/docs"
            />
          </div>
              <span className='text-sm'>created at: {formatDate(creation)}</span>

          {/* Form Actions */}
          <div className="flex gap-4 pt-3">
            <button
              type="button"
              onClick={() => setView(false)}
              className="flex-1 py-3 px-4 bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-white/10 text-slate-300 font-semibold rounded-xl transition-all duration-200 cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save Memory</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
