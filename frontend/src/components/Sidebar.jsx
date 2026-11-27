import {
  Pin,
  History,
  MessageSquare,
  DeleteIcon,
  LogOut,
  RefreshCw,
  FolderIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  Plus,
  MessageSquarePlus,
} from "lucide-react";

/**
 * Application sidebar supporting both full expanded mode (pinned hubs, chat
 * history, user footer) and a compact collapsed icon rail (expand, group,
 * history, and bottom user avatar).
 */
export default function Sidebar({
  pinnedNotes = [],
  chats = [],
  loadingChats = false,
  activeHistoryItem = null,
  userEmail = "",
  onViewHistory,
  onSelectShortcut,
  onTogglePin,
  onLogout,
  toggleDelete,
  handleGrouping,
  Grouping,
  pullButton,
  onStartNewChat,
  isMobile = false,
  collapsed = false,
  onItemClick,
  onOpenFeedback,
}) {
  const displayEmail = userEmail || "User";
  const initial = (displayEmail.trim().charAt(0) || "U").toUpperCase();

  if (collapsed) {
    return (
      <aside className="w-full h-full bg-[#121212] border-r border-white/5 flex flex-col items-center justify-between py-4 shrink-0 relative z-30 select-none shadow-2xl">
        {/* Top quick-action icon rail */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => pullButton(false)}
            className="btn-style cursor-pointer"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleGrouping()}
            className="btn-style cursor-pointer"
            title="Group Notes"
          >
            {Grouping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FolderIcon className="w-4 h-4" fill="currentColor" />
            )}
          </button>

          <button
            type="button"
            onClick={() => pullButton(false)}
            className="btn-style cursor-pointer"
            title="History"
          >
            <History className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom feedback & user icon */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenFeedback?.()}
            className="btn-style cursor-pointer"
            title="Give Feedback"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => pullButton(false)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-white to-black/10 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-lg shadow-purple-500/10 cursor-pointer"
            title={displayEmail}
          >
            {initial}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`w-full ${
        isMobile ? "border-r border-white/10" : "border-r border-white/5"
      } bg-[#121212] backdrop-blur-md flex flex-col h-full shrink-0 relative z-30 select-none shadow-2xl`}
    >
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
            <PanelLeftClose className="w-4 h-4" />
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
                onClick={() => {
                  onSelectShortcut(note.title);
                  onItemClick?.();
                }}
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
        <div className="flex items-center justify-between mb-3 px-1 text-slate-400">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 internal shrink-0" />
            <span className="text-xs font-bold uppercase internal tracking-wider">
              History
            </span>
          </div>
          {onStartNewChat && (
            <button
              onClick={() => {
                onStartNewChat();
                onItemClick?.();
              }}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="New Conversation"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
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
                  onClick={() => {
                    onViewHistory(chat);
                    onItemClick?.();
                  }}
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

      {/* Give Feedback */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => {
            onOpenFeedback?.();
            if (onItemClick) onItemClick();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4 shrink-0" />
          <span>Give Feedback</span>
        </button>
      </div>

      {/* Profile and Logout info footer */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2 overflow-hidden min-w-0 pr-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-white to-black/10 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-lg shadow-purple-500/10">
            {initial}
          </div>
          <span
            className="text-xs font-semibold text-slate-300 truncate"
            title={displayEmail}
          >
            {displayEmail}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 cursor-pointer shrink-0"
          title="Log Out"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </aside>
  );
}
