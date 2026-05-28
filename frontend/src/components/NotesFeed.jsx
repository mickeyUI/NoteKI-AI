import React from 'react';
import { Plus, RefreshCw, FileText, Pin, Calendar } from 'lucide-react';

export default function NotesFeed({
  loadingNotes = false,
  notes = [],
  pinnedNotes = [],
  standardNotes = [],
  pinnedIds = [],
  onTogglePin,
  onSelectTag,
  onOpenCreateNoteModal,
  isSearchActive = false,
  formatDate
}) 
{

  return (
    <section className={`h-full overflow-y-auto px-6 md:px-8 py-8 transition-all duration-500 ease-in-out flex flex-col ${
      isSearchActive ? 'w-full lg:w-[calc(100%-450px)]' : 'w-full'
    }`}>
      
      {/* Upper title menu */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">My Knowledge Base</h1>
          <p className="text-xs text-slate-400 font-medium">Browse, create, and search your personal AI-augmented memory cards</p>
        </div>
        <button
          onClick={onOpenCreateNoteModal}
          className="py-2.5 px-4 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.2)] text-xs flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {loadingNotes ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
          <span className="text-sm font-medium">Retrieving saved memories...</span>
        </div>
      ) : notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto select-none">
          <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl mb-4 text-slate-400">
            <FileText className="w-10 h-10 mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Saved Memories</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Start populating your Lore knowledge database by creating notes or import documents. You can also converse with AI to generate responses.
          </p>
          <button
            onClick={onOpenCreateNoteModal}
            className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-semibold rounded-xl transition-colors cursor-pointer text-xs"
          >
            Create Your First Card
          </button>
        </div>
      ) : (
        /* Notes grid / masonry layout */
        <div className={`grid gap-6 transition-all duration-500 ease-in-out ${
          isSearchActive 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {[...pinnedNotes, ...standardNotes].map((note) => {
            if (!note) return null;
            const isPinned = pinnedIds.includes(note.id);
            console.log(`Rendering note ID ${note.id} - Pinned: ${isPinned}`);
            return (
              <div
                key={note.id}
                className={`glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between min-h-[190px] relative group select-none ${
                  isPinned ? 'border-amber-400 border-2' : ''
                }`}
              >
                {/* Pinned Card Action */}
                <button
                  onClick={() => onTogglePin(note.id)}
                  className={`absolute top-4 right-4 p-1.5 rounded-lg border transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer ${
                    isPinned 
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 opacity-100' 
                      : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'
                  }`}
                  title={isPinned ? 'Unpin card' : 'Pin card'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>

                {/* Header details */}
                <div>
                  <h3 className="text-base font-bold text-white mb-2 pr-8 group-hover:text-purple-300 transition-colors">
                    {note.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    {note.content}
                  </p>
                </div>

                {/* Pill tags and calendar */}
                <div>
                  {(() => {
                    const tagsArr = Array.isArray(note.tags) 
                      ? note.tags 
                      : (typeof note.tags === 'string' ? note.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
                    if (tagsArr.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5 mb-3.5">
                        {tagsArr.map((tag, tagIdx) => (
                          <span
                            key={tagIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTag(tag);
                            }}
                            className="text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full cursor-pointer hover:bg-purple-500/20 transition-all"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
