import React, { useState } from 'react';
import { RegistrationEvent } from '../types';
import { generateAIResponse, AIMessage } from '../lib/aiAssistant';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  HelpCircle, 
  Zap, 
  ArrowRight, 
  LayoutTemplate, 
  Table, 
  CheckCircle2 
} from 'lucide-react';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: RegistrationEvent[];
  totalSubmissions: number;
  onSelectAction: (actionType: string, payload?: any) => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  events,
  totalSubmissions,
  onSelectAction
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `👋 Hello! I am **RegiAI Assistant**, your system guide.\n\n` +
            `I can help you build registration sites without coding, summarize registrant analytics, guide you through table filters, or answer deployment questions!`,
      suggestedAction: {
        type: 'open_templates',
        label: 'Guide Me Around System'
      }
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');

  if (!isOpen) return null;

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: now
    };

    const aiMsg = generateAIResponse(query, events, totalSubmissions);

    setMessages(prev => [...prev, userMsg, aiMsg]);
    if (!textToSend) setInputQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md h-full glass-panel border-l border-gold-500/30 flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-gold-500 to-gold-400 text-slate-950 shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-100 text-base font-display">RegiAI Assistant</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[11px] text-gold-300 font-medium">System Guide & Form Generator</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestions */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap gap-1.5 text-xs">
          <button
            onClick={() => handleSendMessage('Guide me around the system')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px]"
          >
            💡 System Walkthrough
          </button>
          <button
            onClick={() => handleSendMessage('Build me a Hackathon registration form')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px]"
          >
            ⚡ Create Hackathon Form
          </button>
          <button
            onClick={() => handleSendMessage('Show me total registration stats')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px]"
          >
            📊 Registration Stats
          </button>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {msg.sender === 'user' ? 'You' : 'RegiAI Assistant'}
                </span>
              </div>

              <div className={`p-4 rounded-2xl text-xs sm:text-sm max-w-[90%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gold-500 text-slate-950 font-medium rounded-br-none shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
              }`}>
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {msg.suggestedAction && (
                  <button
                    onClick={() => onSelectAction(msg.suggestedAction!.type, msg.suggestedAction!.payload)}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/40 text-gold-300 hover:bg-gold-500 hover:text-slate-950 font-bold text-xs transition-all shadow-sm"
                  >
                    <span>{msg.suggestedAction.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask AI assistant to guide or create form..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-gold-400 focus:outline-none"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-slate-950 hover:brightness-110 shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};