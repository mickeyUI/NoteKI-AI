import React from "react";
import {
  Sparkles,
  Pin,
  History,
  Plus,
  MessageSquare,
  DeleteIcon,
  LogOut,
  RefreshCw,
  FolderIcon,
  ArrowLeftIcon,
  Loader2,
} from "lucide-react";

export default function Sidebar({
  pinnedNotes = [],
  chats = [],
  loadingChats = false,
  activeHistoryItem = null,
  onViewHistory,
  onSelectShortcut,
  onTogglePin,
  onLogout,
  onOpenCreateNoteModal,
  toggleDelete,
  handleGrouping,
  handleCollapseSidebar,
  Grouping,
  pullButton,
}) {
  return (
    <aside className="transition-all duration-500 ease-in-out w-40 md:w-64 border-r border-white/5 bg-[#121212] backdrop-blur-md flex flex-col h-full shrink-0 relative z-30 select-none">
      {/* Top brand portion */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <span className="font-extrabold text-lg  internal bg-clip-text text-transparent">
          Lore
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGrouping()}
            className="btn-style cursor-pointer"
            title="Group Notes"
          >
            {Grouping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FolderIcon className="w-4 h-4 " fill="currentColor" />
            )}
          </button>
          <button
            onClick={() => pullButton(true)}
            className=" btn-style cursor-pointer"
            title="Collapse Sidebar"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pinned section */}
      <div className="px-4 py-3 flex-none">
        <div className="flex items-center gap-2 mb-2 px-1 text-slate-400">
          <Pin className="w-3.5 h-3.5 internal shrink-0" fill="currentcolor" />
          <span className="text-xs font-bold uppercase tracking-wider internal">
            Pinned Hubs
          </span>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {pinnedNotes.length === 0 ? (
            <div className="text-[11px] internal px-2 py-1.5 italic">
              No pinned hubs. Click the pin icon on cards to pin.
            </div>
          ) : (
            pinnedNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => onSelectShortcut(note.title)}
                className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#212121] hover:bg-[#302c2c] border-l-2 border-[#cecece] transition-all duration-200 cursor-pointer"
              >
                <span className="truncate pr-2 internal">{note.title}</span>
                <Pin
                  fill="currentcolor"
                  className="w-3 h-3 internal cursor-pointer shrink-0 opacity-85 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(note.id);
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Section (Conversation History) */}
      <div className="flex-1 overflow-y-auto px-4 py-2 border-t border-white/5">
        <div className="flex items-center gap-2 mb-3 px-1 text-slate-400">
          <History className="w-5 h-5 internal shrink-0" />
          <span className="text-xs font-bold uppercase internal tracking-wider">
            History
          </span>
        </div>

        <div className="space-y-1.5">
          {loadingChats ? (
            <div className="text-xs text-slate-500 px-2 py-4 italic flex items-center gap-2 justify-center">
              <RefreshCw className="w-3 h-3 animate-spin internal" />
              <span>Loading history...</span>
            </div>
          ) : chats.length === 0 ? (
            <div className="text-[11px] text-slate-600 px-2 py-4 italic text-center">
              No search history.
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = activeHistoryItem?.id === chat.id;
              return (
                <button
                  key={chat.id}
                  onClick={() => onViewHistory(chat)}
                  className={`w-full internal opacity-80 hover:border-cyan-100/20 flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl group text-left text-xs font-medium transition-all duration-200 border cursor-pointer ${
                    isActive
                      ? "bg-slate-900 internal bg-1"
                      : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <MessageSquare
                    fill="currentcolor"
                    className={`w-3.5 h-3.5 shrink-0  ${isActive ? "internal opacity-100" : "internal"}`}
                  />
                  <span className="truncate flex-1">
                    {chat.title || "Untitled Chat"}
                  </span>
                  <DeleteIcon
                    fill="currentcolor"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDelete(chat.id);
                    }}
                    className={
                      "w-5 h-5 transition-transform shrink-0 translate-x-0.5 internal opacity-0 group-hover:opacity-100 "
                    }
                  />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Profile and Logout info footer */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-white to-black/10 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-lg shadow-purple-500/10">
            U
          </div>
          <span className="text-xs font-semibold text-slate-300 truncate">
            User 0
          </span>
        </div>
        <button
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 cursor-pointer"
          title="Log Out"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </aside>
  );
}
