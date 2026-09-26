import React from 'react';
import { 
  Layers, 
  Calendar, 
  LayoutTemplate, 
  Database, 
  Archive, 
  Wand2, 
  Plus, 
  CheckCircle2 
} from 'lucide-react';
import { SupabaseConfig } from '../types';

interface NavbarProps {
  activeTab: 'events' | 'templates' | 'submissions' | 'archive' | 'supabase';
  setActiveTab: (tab: 'events' | 'templates' | 'submissions' | 'archive' | 'supabase') => void;
  onOpenNewEvent: () => void;
  onToggleAIAssistant: () => void;
  supabaseConfig: SupabaseConfig;
  eventsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewEvent,
  onToggleAIAssistant,
  supabaseConfig,
  eventsCount
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-navy-600/20 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand / Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('events')}
          >
            <div className="h-10 w-10 rounded-xl bg-navy-900 text-white flex items-center justify-center font-black text-xl shadow-md shadow-navy-900/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 stroke-[2.5] text-gold-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-lg tracking-wide text-navy-900">AURUM</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gold-100 text-gold-700 border border-gold-300">
                  REGISTRY
                </span>
              </div>
              <p className="text-xs text-navy-600">No-Code Event System</p>
            </div>
          </div>

          {/* Center Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-ivory-dark p-1.5 rounded-xl border border-navy-600/20">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'events'
                  ? 'bg-navy-900 text-white shadow-md'
                  : 'text-navy-900/80 hover:text-navy-900 hover:bg-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Events ({eventsCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'templates'
                  ? 'bg-navy-900 text-white shadow-md'
                  : 'text-navy-900/80 hover:text-navy-900 hover:bg-white'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Templates</span>
            </button>

            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'submissions'
                  ? 'bg-navy-900 text-white shadow-md'
                  : 'text-navy-900/80 hover:text-navy-900 hover:bg-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Submissions & Data</span>
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'archive'
                  ? 'bg-navy-900 text-white shadow-md'
                  : 'text-navy-900/80 hover:text-navy-900 hover:bg-white'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>
          </nav>

          {/* Right System Indicators & CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('supabase')}
              title={supabaseConfig.isConnected ? 'Connected to Supabase' : 'Running in Local Mode (Click to connect Supabase)'}
              className={`hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                supabaseConfig.isConnected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-navy-100/30 border-navy-600/30 text-navy-900 hover:bg-navy-100/60'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${supabaseConfig.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-navy-600'}`} />
              <span>{supabaseConfig.isConnected ? 'Supabase Connected' : 'Supabase Ready'}</span>
              {supabaseConfig.isConnected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </button>

            <button
              onClick={onToggleAIAssistant}
              className="px-3.5 py-2 text-xs font-bold text-gold-700 bg-gold-50 hover:bg-gold-100 rounded-lg border border-gold-300 transition flex items-center gap-2"
            >
              <Wand2 className="w-3.5 h-3.5 text-gold-600" />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>

            <button
              onClick={onOpenNewEvent}
              className="px-4 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-950 rounded-lg shadow-md transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Event</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};