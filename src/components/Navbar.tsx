import React from 'react';
import { 
  Calendar, 
  LayoutTemplate, 
  Database, 
  Archive, 
  Wand2, 
  Plus, 
  CheckCircle2 
} from 'lucide-react';

import { SupabaseConfig } from '../types';
import ayosLogo from '../assets/AYOS LOGO.png';

interface NavbarProps {
  activeTab: 'events' | 'templates' | 'submissions' | 'archive' | 'supabase';
  setActiveTab: (
    tab: 'events' | 'templates' | 'submissions' | 'archive' | 'supabase'
  ) => void;
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
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand / Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('events')}
          >
            <div className="h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform">
              <img
                src={ayosLogo}
                alt="AYOS Youth Camp"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-lg tracking-wide text-white">
                  MYRRH
                </span>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gold-300/10 text-gold-300 border border-gold-300/20">
                  REGISTRY
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Event Registration System
              </p>
            </div>
          </div>

          {/* Center Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'events'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Events ({eventsCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'templates'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Templates</span>
            </button>

            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'submissions'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Submissions</span>
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'archive'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
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
              title={
                supabaseConfig.isConnected
                  ? 'Connected to Supabase'
                  : 'Running in Local Mode (Click to connect Supabase)'
              }
              className={`hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                supabaseConfig.isConnected
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  supabaseConfig.isConnected
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-slate-500'
                }`}
              />

              <span>
                {supabaseConfig.isConnected
                  ? 'Supabase Connected'
                  : 'Supabase Ready'}
              </span>

              {supabaseConfig.isConnected && (
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
              )}
            </button>

            <button
              onClick={onToggleAIAssistant}
              className="px-3.5 py-2 text-xs font-bold text-gold-300 bg-gold-300/10 hover:bg-gold-300/20 rounded-lg border border-gold-300/20 transition flex items-center gap-2"
            >
              <Wand2 className="w-3.5 h-3.5 text-gold-300" />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>

            <button
              onClick={onOpenNewEvent}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-md shadow-amber-500/20 transition flex items-center gap-2"
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