import React, { useState } from 'react';
import { SupabaseConfig } from '../types';
import { SUPABASE_SQL_SCHEMA, saveSupabaseConfig } from '../lib/supabase';
import { 
  Database, 
  X, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  Code, 
  Server,
  Zap
} from 'lucide-react';

interface SupabaseModalProps {
  config: SupabaseConfig;
  onClose: () => void;
  onUpdateConfig: (newConfig: SupabaseConfig) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  config,
  onClose,
  onUpdateConfig
}) => {
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveSupabaseConfig(url.trim(), anonKey.trim());
    onUpdateConfig(updated);
    setSaveStatus('Configuration saved successfully!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl glass-panel border border-gold-500/40 p-6 sm:p-8 shadow-2xl">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-gold-500/10 border border-gold-500/30">
            <Database className="w-6 h-6 text-gold-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                Database Integration
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                config.isConnected ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-gold-900 text-gold-300 border border-gold-700'
              }`}>
                {config.isConnected ? 'Live Supabase Connected' : 'Local Mock Mode (Supabase Ready)'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white font-display">
              Supabase Setup & SQL Schema
            </h2>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-gold-400 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Supabase Anon Public API Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-gold-400 focus:outline-none font-mono"
            />
          </div>

          {saveStatus && (
            <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{saveStatus}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-slate-950 font-bold text-sm hover:brightness-110 shadow-md shadow-gold-500/20"
          >
            Save Supabase Credentials
          </button>
        </form>

        {/* SQL Schema Copy Section */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-gold-400" />
              <span className="text-sm font-bold text-slate-200">
                1-Click Supabase SQL Setup Script
              </span>
            </div>

            <button
              onClick={handleCopySQL}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500/10 border border-gold-500/40 text-gold-300 hover:text-gold-200 text-xs font-semibold transition-all"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied SQL!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL Script</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Copy and paste this SQL into your Supabase Dashboard SQL Editor to automatically create the <code className="text-gold-300">events</code> and <code className="text-gold-300">registrations</code> tables with Row Level Security (RLS).
          </p>

          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-40">
            {SUPABASE_SQL_SCHEMA}
          </pre>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-800"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};