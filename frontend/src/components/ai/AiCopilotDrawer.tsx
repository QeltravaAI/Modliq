import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2, Play } from 'lucide-react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiCopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Modliq AI Copilot. Ask me anything about OEE, process parameters, supplier risks, or Kaizen targets.' }
  ]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setStreamingText('');

    try {
      const response = await axios.post('/api/ai/chat', {
        message: userMessage,
        messages: messages.slice(-5) // Send last 5 messages for history context
      });

      if (response.data.success) {
        const fullAnswer = response.data.answer;
        
        // Simulating the streaming output word-by-word
        const words = fullAnswer.split(' ');
        let currentText = '';
        let wordIndex = 0;

        const interval = setInterval(() => {
          if (wordIndex < words.length) {
            currentText += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
            setStreamingText(currentText);
            wordIndex++;
          } else {
            clearInterval(interval);
            setMessages(prev => [...prev, { role: 'assistant', content: fullAnswer }]);
            setStreamingText('');
            setLoading(false);
          }
        }, 30); // 30ms per word
      } else {
        const fallback = response.data.message || 'AI Copilot is currently offline. Calculations remain available.';
        setMessages(prev => [...prev, { role: 'assistant', content: fallback }]);
        setLoading(false);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI Copilot could not connect right now. Calculated metrics remain fully functional.' }]);
      setLoading(false);
    }
  };

  const selectSuggested = (query: string) => {
    setInput(query);
  };

  return (
    <>
      {/* Floating Sparkle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#2B70AB] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#1B2A4A] transition-all hover:scale-105 z-50 group border border-[#D0E2F0]"
        title="Ask Modliq AI Copilot"
      >
        <Sparkles className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform" />
      </button>

      {/* Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-[#D0E2F0] animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="px-5 py-4 bg-[#1B2A4A] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
              <div>
                <h3 className="text-sm font-bold leading-none">Ask Modliq</h3>
                 <span className="text-[10px] text-slate-500">AI Manufacturing Copilot</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm shadow-sm leading-relaxed border ${
                  m.role === 'user' 
                    ? 'bg-[#2B70AB] text-white border-[#2B70AB]' 
                    : 'bg-white text-slate-800 border-slate-200'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Streaming Output Bubble */}
            {streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl px-3.5 py-2 text-sm bg-white text-slate-800 border border-slate-200 shadow-sm leading-relaxed">
                  {streamingText}
                  <span className="inline-block w-1.5 h-4 bg-[#2B70AB] ml-0.5 animate-pulse" />
                </div>
              </div>
            )}

            {/* Loading Bubble */}
            {loading && !streamingText && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-500 rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#2B70AB] animate-spin" />
                  <span>Modliq is thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length === 1 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-white space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Questions</p>
              <div className="flex flex-col gap-1.5">
                {[
                  'Explain current OEE and downtime bottlenecks',
                  'Identify raw material quality risks',
                  'What Kaizen improvements should be prioritised?'
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSuggested(q)}
                    className="text-left text-xs text-slate-600 hover:text-[#2B70AB] bg-slate-50 hover:bg-[#F0F6FA] border border-slate-200 p-2 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>{q}</span>
                    <Play className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about yield, OEE, scrap rate..."
              disabled={loading}
              className="flex-1 border border-[#D0E2F0] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2B70AB] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-[#2B70AB] hover:bg-[#1B2A4A] text-white flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
