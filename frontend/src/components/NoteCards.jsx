import { Plus, RefreshCw, FileText, Pin, Calendar, Trash2Icon } from 'lucide-react';

export default function NoteCards({
  note,
  isPinned = false,
  onTogglePin,
  onSelectTag,
  formatDate,
  handleDeleteNote,
  setNoteViewId,
  setNoteViewOpen
}) {
    const toggleVisable = (id) => {
        setNoteViewOpen(true);
        setNoteViewId(id);
      
    }
    return (
        
              <div
                key={note.id}
                onClick={(e) => { 
                    e.stopPropagation();
                    toggleVisable(note.id);}}
                className={`glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between min-h-[190px] relative group select-none ${
                  isPinned ? 'border-amber-400 border-2' : ''
                }`}
              >
                
                {/* Pinned Card Action */}
                <div className = "flex  justify-between -mt-2.5">
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(note.id);
                  }}
                  className={` p-1.5 rounded-lg border transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer ${
                    isPinned 
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 opacity-100' 
                      : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'
                  }`}
                  title={isPinned ? 'Unpin card' : 'Pin card'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>

                <button
                onClick={(e)=> 
                    {   e.stopPropagation();
                        handleDeleteNote(note.id);}}
                 className=' p-1.5 rounded-lg bg-purple-950 border transition-all duration-200 opacity-0 group-hover:opacity-100  cursor-pointer'>
                  <Trash2Icon className="w-3.5 h-3.5 text-purple-200 hover:text-red-400" />
                </button>
                  </div>
                {/* Header details */}
                <div>
                  <h3 className="text-base font-bold text-white mb-2 pr-8 group-hover:text-purple-300 transition-colors">
                    {note.title}
                  </h3>
                  {note.note_type === 'text'? 
                   <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    {note.content}
                  </p>:
                   <img src={note.content} alt={note.title} className="rounded-lg mb-4 max-h-40 object-cover"/>}
                 
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
                      {formatDate(note.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            
    )
}