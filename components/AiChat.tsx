
import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, Bot, User, Copy, ArrowLeftCircle, Wand2 } from 'lucide-react';
import { createScenarioChat } from '../services/geminiService';
import { ScenarioData, ChatMessage } from '../types';
import { GenerateContentResponse } from '@google/genai';
import ReactMarkdown from 'react-markdown';

interface Props {
  stepLabel: string;
  scenarioData: ScenarioData;
  onApplyContent: (content: string) => void;
}

const AiChat: React.FC<Props> = ({ stepLabel, scenarioData, onApplyContent }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat when step changes
  useEffect(() => {
    setMessages([{
      id: 'intro',
      role: 'model',
      text: `Hello! I'm your AI Editor (powered by Gemini 3 Pro). Let's brainstorm the **${stepLabel}**. What are your initial thoughts?`
    }]);
    
    try {
      chatRef.current = createScenarioChat(stepLabel, scenarioData);
    } catch (e) {
      console.error("Failed to init chat", e);
    }
  }, [stepLabel]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !chatRef.current) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text
    };

    setMessages(prev => [...prev, userMsg]);
    if (text === input) setInput('');
    setLoading(true);

    try {
      const result = await chatRef.current.sendMessageStream({ message: text });
      
      let fullText = '';
      const botMsgId = (Date.now() + 1).toString();
      
      // Add placeholder for streaming
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '', isThinking: true }]);

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullText += c.text;
          setMessages(prev => prev.map(m => 
            m.id === botMsgId ? { ...m, text: fullText, isThinking: false } : m
          ));
        }
      }
    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: "I encountered an error connecting to the creative network. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendClick = () => sendMessage(input);

  const handleMagicDraft = () => {
    sendMessage(`Please draft the entire content for the "${stepLabel}" section creatively based on the project context. Do everything for me! Make it detailed and ready to use.`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-slate-800 p-4 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2 text-indigo-400 font-bold">
          <Bot className="w-5 h-5" />
          <span>AI Co-Pilot (Gemini 3 Pro)</span>
        </div>
        <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">Thinking Mode: ON (32k)</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'
            }`}>
              {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
            </div>
            
            <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
            }`}>
              {msg.isThinking && msg.text === '' ? (
                 <div className="flex items-center gap-2 text-emerald-400/70 italic">
                   <Loader2 className="w-3 h-3 animate-spin" />
                   Thinking...
                 </div>
              ) : (
                <div className="markdown-prose">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
              
              {msg.role === 'model' && !msg.isThinking && msg.text.length > 20 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-end">
                   <button 
                     onClick={() => onApplyContent(msg.text)}
                     className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider transition-colors"
                   >
                     <Copy className="w-3 h-3" /> Apply to Editor
                   </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-800 border-t border-slate-700 space-y-3">
        {/* Magic Actions */}
        {!loading && (
          <div className="flex justify-center">
             <button
               onClick={handleMagicDraft}
               className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transition-transform hover:scale-105"
             >
               <Wand2 className="w-3 h-3" />
               Magic Auto-Draft: Do Everything for me!
             </button>
          </div>
        )}

        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Discuss ideas, ask for suggestions..."
            className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-4 pr-12 py-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-14 max-h-32 shadow-inner"
          />
          <button
            onClick={handleSendClick}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiChat;
