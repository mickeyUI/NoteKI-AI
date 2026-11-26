import React, { useEffect, useState, useRef } from "react";
import { X, RefreshCw, Link, Plus, Maximize2, Minimize2 } from "lucide-react";
import { api } from "../services/api";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-white mt-4 mb-1.5 leading-snug">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-white mt-3 mb-1 leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide mt-3 mb-1">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-1 last:mb-0 leading-relaxed text-slate-300">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 pl-4 space-y-1 list-disc marker:text-purple-400">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 pl-4 space-y-1 list-decimal marker:text-purple-400">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-slate-300 leading-relaxed">{children}</li>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="bg-white/10 text-purple-300 font-mono text-[11px] px-1.5 py-0.5 rounded">
        {children}
      </code>
    ) : (
      <pre className="bg-black/40 border border-white/10 rounded-xl p-3 my-2 overflow-x-auto">
        <code className="font-mono text-[11px] text-green-300 leading-relaxed">
          {children}
        </code>
      </pre>
    ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-purple-500 pl-3 my-2 italic text-slate-400">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-purple-400 underline underline-offset-2 hover:text-purple-300 transition-colors"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-300">{children}</em>
  ),
  hr: () => <hr className="border-white/10 my-3" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs w-full border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-white/10 bg-white/5 px-3 py-1.5 text-left font-semibold text-slate-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-white/10 px-3 py-1.5 text-slate-300">
      {children}
    </td>
  ),
};

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
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Collapse back to side-panel mode when dismissing the panel
  const handleClosePanel = () => {
    setIsExpanded(false);
    onClose?.();
  };

  const convoID = convo ? convo.id : "";
  useEffect(() => {
    let active = true;

    // Fetch saved messages for the selected conversation and guard against stale responses
    const loadConversationMessages = async () => {
      if (!convoID) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }
      setMessages([]);
      setLoadingMessages(true);
      try {
        const data = await api.getMessages(convoID);
        if (active && Array.isArray(data)) {
          setMessages(data);
        }
      } catch (err) {
        console.error("Message retrieval error:", err);
      } finally {
        if (active) {
          setLoadingMessages(false);
        }
      }
    };

    void loadConversationMessages();
    return () => {
      active = false;
    };
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
      className={`fixed bg-black top-0 bottom-0 right-0 z-40 ${
        isExpanded
          ? "w-full border-l-0"
          : "w-full lg:w-[450px] border-l border-white/5"
      } bg-1 lg:bg-slate-950/80 backdrop-blur-2xl h-full flex flex-col shadow-2xl transition-all duration-500 ease-in-out overflow-hidden transform ${
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
            onClick={() => setIsExpanded((prev) => !prev)}
            className="hidden lg:inline-flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title={isExpanded ? "Restore Side Panel" : "Expand Full Screen"}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleClosePanel}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Dismiss Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Response body scroll content */}
      <div className="flex-1 overflow-y-auto scroll-smooth p-6 pb-28 space-y-6">
        <div className={isExpanded ? "max-w-3xl mx-auto w-full space-y-6" : "space-y-6"}>
        {/* Streaming Content */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-bold internal tracking-wider">
            Conversation
          </p>
          <div className="text-sm internal leading-relaxed flex flex-col gap-2 justify-center">
            {loadingMessages ? (
              <div className="flex flex-col gap-3 py-1" aria-label="Loading conversation">
                <div className="self-end w-44 rounded-2xl bg-[#1a1a1a] p-3 space-y-1.5 animate-pulse">
                  <div className="h-3 w-full rounded bg-white/10" />
                  <div className="h-3 w-2/3 rounded bg-white/10" />
                </div>
                <div className="self-start w-[85%] rounded-2xl bg-white/5 border border-white/5 p-3.5 space-y-2 animate-pulse">
                  <div className="h-3 w-full rounded bg-white/10" />
                  <div className="h-3 w-11/12 rounded bg-white/10" />
                  <div className="h-3 w-3/5 rounded bg-white/10" />
                </div>
                <div className="self-end w-36 rounded-2xl bg-[#1a1a1a] p-3 animate-pulse">
                  <div className="h-3 w-full rounded bg-white/10" />
                </div>
                <div className="self-start w-[75%] rounded-2xl bg-white/5 border border-white/5 p-3.5 space-y-2 animate-pulse">
                  <div className="h-3 w-full rounded bg-white/10" />
                  <div className="h-3 w-2/3 rounded bg-white/10" />
                </div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className={`rounded-2xl w-fit py-2 px-3 ${m.role === "user" ? "self-end max-w-80 bg-[#1a1a1a]" : "self-start max-w-[90%] bg-white/5"}`}
                >
                  <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{m.content}</Markdown>
                </div>
              ))
            )}
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
                    <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{aiResponse}</Markdown>
                  </div>
                ) : (
                  <div className="self-start w-[85%] rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>AI is synthesizing memory stream...</span>
                    </div>
                    <div className="space-y-2 animate-pulse">
                      <div className="h-3 w-full rounded bg-white/10" />
                      <div className="h-3 w-11/12 rounded bg-white/10" />
                      <div className="h-3 w-3/4 rounded bg-white/10" />
                    </div>
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
