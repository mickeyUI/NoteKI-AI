import React, { useEffect, useState, useRef } from "react";
import { X, RefreshCw, Link, Plus } from "lucide-react";
import { api } from "../services/api";
import Markdown from "react-markdown";
function AIAnswerPanel({
  isSearchActive = false,
  searchQuery = "",
  aiResponse = "",
  isStreaming = false,
  citations = [],
  onClose,
  convo,
  userRes,
  aiRes = "",
  setNoteViewId,
  setNoteViewOpen,
  onStartNewChat,
}) {
  const [messages, setMessages] = useState([]);
  const handleMessageRetrival = async (uuid) => {
    if (!uuid) {
      setMessages([]);
      return;
    }
    try {
      const data = await api.getMessages(uuid);
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err) {
      console.error("Message retrieval error:", err);
    }
  };

  const convoID = convo ? convo.id : "";
  useEffect(() => {
    handleMessageRetrival(convoID);
  }, [convoID]);

  useEffect(() => {
    if (!isStreaming && userRes && aiRes) {
      setMessages((prev) => {
        const hasUser = prev.some((m) => m.id === userRes.id);
        const hasAi = prev.some((m) => m.id === aiRes.id);
        const toAdd = [];
        if (!hasUser && userRes.content) toAdd.push(userRes);
        if (!hasAi && aiRes.content) toAdd.push(aiRes);
        return [...prev, ...toAdd];
      });
    }
  }, [isStreaming, userRes, aiRes]);

  const toggleView = (id) => {
    setNoteViewOpen(true);
    setNoteViewId(id);
  };

  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isStreaming, aiResponse, messages]);

  return (
    <section
      className={`fixed bg-black top-0 bottom-0 right-0 z-40 lg:z-20 w-full lg:w-[450px] border-l border-white/5 bg-1 lg:bg-slate-950/50 backdrop-blur-2xl h-full flex flex-col shadow-2xl transition-transform duration-1000 ease-in-out overflow-hidden transform ${
        isSearchActive ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header info */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-950/60 flex-none">
        <div className="flex flex-col gap-0.5 max-w-[300px]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider internal">
              Lore Synthesis
            </span>
          </div>
          {convo?.title && (
            <span className="text-[11px] text-slate-400 truncate font-medium">
              {convo.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onStartNewChat && (
            <button
              onClick={onStartNewChat}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Start New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Dismiss Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Response body scroll content */}
      <div className="flex-1 overflow-y-auto scroll-smooth p-6 space-y-6">
        {/* Streaming Content */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-bold internal tracking-wider">
            Conversation
          </p>
          <div className="text-sm internal leading-relaxed whitespace-pre-wrap flex flex-col gap-2 justify-center">
            {messages.map((m, idx) => (
              <div
                key={m.id || idx}
                className={`rounded-2xl w-fit py-2 px-3 ${m.role === "user" ? "self-end max-w-80 bg-[#1a1a1a]" : "self-start max-w-[90%] bg-white/5"}`}
              >
                <Markdown>{m.content}</Markdown>
              </div>
            ))}
            {isStreaming && (
              <>
                {searchQuery &&
                  !messages.some((m) => m.content === searchQuery) && (
                    <div className="rounded-2xl w-fit py-2 px-3 self-end max-w-80 bg-[#1a1a1a]">
                      <p>{searchQuery}</p>
                    </div>
                  )}
                {aiResponse ? (
                  <div className="rounded-2xl w-fit py-2 px-3 self-start max-w-[90%] bg-white/5 border border-white/10">
                    <Markdown>{aiResponse}</Markdown>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-slate-500 italic py-8">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>AI is synthesizing memory stream...</span>
                  </div>
                )}
              </>
            )}
          </div>
          <div ref={bottomRef}></div>
        </div>

        {/* Citation/Sources list */}
        {citations.length > 0 && (
          <div className="pt-4 border-t border-white/5 space-y-3">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Cited Sources
            </p>
            <div className="space-y-2">
              {citations.map((cite, idx) => (
                <div
                  onClick={() => toggleView(cite[0])}
                  key={idx}
                  href={"#"}
                  rel="noreferrer"
                  className="block p-3 bg-slate-900/30 hover:bg-slate-900/50 border border-white/5 hover:border-purple-500/20 rounded-xl transition-all duration-200 select-none group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-300 group-hover:text-purple-200 truncate pr-2">
                      {cite[1]}
                    </span>
                    <Link className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {cite[2]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Panel footer bar */}
      <div className="p-4 border-t border-white/5 bg-slate-950/60 text-center flex-none">
        <span className="text-[10px] text-slate-500 font-medium">
          Powered by Lore AI Core Services
        </span>
      </div>
    </section>
  );
}

export default React.memo(AIAnswerPanel);
