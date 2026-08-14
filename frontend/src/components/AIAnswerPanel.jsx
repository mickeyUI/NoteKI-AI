import React, { useEffect, useState, useRef } from "react";
import { X, RefreshCw, Link } from "lucide-react";
import { api } from "../services/api";

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
}) {
  const [messages, setMessages] = useState([]);
  const handleMessageRetrival = async (uuid) => {
    if (!uuid) return;
    const data = await api.getMessages(uuid);
    if (data) {
      const filteredData = data.filter(
        (msg) => msg.conversation_id == convo.id,
      );
      setMessages(filteredData);
    } else {
      alert("no data returned");
    }
  };
  const convoID = convo ? convo.id : "";
  useEffect(() => {
    handleMessageRetrival(convoID);
  }, [convoID]);
  useEffect(() => {
    if (aiResponse) {
      setMessages((prev) => [...prev, userRes, aiRes]);
    }
  }, [isStreaming]);

  const toggleView = (id) => {
    setNoteViewOpen(true);
    setNoteViewId(id);
  };

  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isStreaming, aiRes]);

  return (
    <section
      className={`fixed bg-black top-0 bottom-0 right-0 z-40 lg:z-20 w-full lg:w-[450px] border-l border-white/5 bg-1 lg:bg-slate-950/50 backdrop-blur-2xl h-full flex flex-col shadow-2xl transition-transform duration-1000 ease-in-out overflow-hidden transform ${
        isSearchActive ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header info */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-950/60 flex-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider internal">
            Lore Synthesis
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          title="Dismiss Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Response body scroll content */}
      <div className="flex-1 overflow-y-auto scroll-smooth p-6 space-y-6">
        {/* Question card */}
        {/* <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] uppercase font-bold internal mb-1 tracking-wider">
            Searched Query
          </p>
          <p className="text-sm font-semibold internal opacity-80">
            "{searchQuery}"
          </p>
        </div> */}

        {/* Streaming Content */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-bold internal tracking-wider">
            Generated Response
          </p>
          <div className="text-sm internal leading-relaxed whitespace-pre-wrap flex flex-col gap-2 justify-center">
            {messages.map((m) => (
              <div
                key={m.id}
                className={` rounded-2xl w-fit py-2 px-3  ${m.role == "user" ? "self-end max-w-80 bg-[#1a1a1a]" : ""} `}
              >
                <p className="">{m.content}</p>
              </div>
            ))}
            {!aiResponse && (
              <div className="flex items-center gap-2.5 text-slate-500 italic py-8">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>AI is synthesizing memory stream...</span>
              </div>
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
