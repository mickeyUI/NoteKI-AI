import React from 'react';
import { Search, Send } from 'lucide-react';

export default function ChatInput({
  inputVal = '',
  onChange,
  isStreaming = false,
  onSubmit
}) {
  return (
    <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-20 flex items-center justify-center">
      <form 
        onSubmit={onSubmit} 
        className="w-[calc(100%-3rem)] max-w-2xl pointer-events-auto relative z-30"
      >
        {/* Colorful Drop Shadow glow */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 rounded-full blur opacity-45 group-hover:opacity-75 transition duration-1000 group-focus-within:opacity-100 shadow-gemini-glow" />
          
          <div className="relative flex items-center bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full px-5 py-3.5 shadow-2xl">
            <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3.5" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Ask your memory, search topics, or synthesize summaries..."
              disabled={isStreaming}
              className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none disabled:opacity-50 pr-4"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isStreaming}
              className="p-1.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-full transition-all duration-300 disabled:opacity-20 cursor-pointer shadow-md disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
