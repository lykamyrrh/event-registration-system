import {
  createClient,
  SupabaseClient
} from '@supabase/supabase-js';

import { SupabaseConfig } from '../types';

const STORAGE_KEY_URL = 'aurum_supabase_url';
const STORAGE_KEY_KEY = 'aurum_supabase_anon_key';

// ============================================================
// SINGLE SUPABASE CLIENT INSTANCE
// ============================================================
//
// IMPORTANT:
// Do not create a new Supabase client every time
// getSupabaseClient() is called.
//
// Creating multiple clients in the same browser context can
// create multiple GoTrueClient instances that use the same
// authentication storage key.
//
// Instead, keep one client instance and reuse it.
// ============================================================

let supabaseClient: SupabaseClient | null = null;

// Keep track of which configuration created the current client.
// This allows us to safely recreate the client only when the
// Supabase URL or anon key actually changes.
let activeSupabaseUrl = '';
let activeSupabaseAnonKey = '';


// ============================================================
// GET SAVED SUPABASE CONFIGURATION
// ============================================================

export function getSavedSupabaseConfig(): SupabaseConfig {
  const envUrl =
    import.meta.env.VITE_SUPABASE_URL || '';

  const envKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const savedUrl =
    localStorage.getItem(STORAGE_KEY_URL) ||
    envUrl;

  const savedKey =
    localStorage.getItem(STORAGE_KEY_KEY) ||
    envKey;

  const isConnected = Boolean(
    savedUrl &&
    savedKey &&
    savedUrl.includes('supabase.co')
  );

  return {
    url: savedUrl,
    anonKey: savedKey,
    isConnected
  };
}


// ============================================================
// SAVE SUPABASE CONFIGURATION
// ============================================================

export function saveSupabaseConfig(
  url: string,
  anonKey: string
): SupabaseConfig {
  const cleanUrl = url.trim();
  const cleanAnonKey = anonKey.trim();

  localStorage.setItem(
    STORAGE_KEY_URL,
    cleanUrl
  );

  localStorage.setItem(
    STORAGE_KEY_KEY,
    cleanAnonKey
  );

  // ----------------------------------------------------------
  // Reset the cached client ONLY when the credentials changed.
  //
  // The next call to getSupabaseClient() will create exactly
  // one new client using the new configuration.
  // ----------------------------------------------------------

  if (
    cleanUrl !== activeSupabaseUrl ||
    cleanAnonKey !== activeSupabaseAnonKey
  ) {
    supabaseClient = null;
    activeSupabaseUrl = '';
    activeSupabaseAnonKey = '';
  }

  return getSavedSupabaseConfig();
}


// ============================================================
// GET SUPABASE CLIENT
// ============================================================

export function getSupabaseClient():
  SupabaseClient | null {

  const config = getSavedSupabaseConfig();

  if (!config.isConnected) {
    return null;
  }

  // ----------------------------------------------------------
  // Reuse the existing client when it was created using the
  // same Supabase configuration.
  // ----------------------------------------------------------

  if (
    supabaseClient &&
    activeSupabaseUrl === config.url &&
    activeSupabaseAnonKey === config.anonKey
  ) {
    return supabaseClient;
  }

  try {
    // --------------------------------------------------------
    // Create the client only once for this configuration.
    // --------------------------------------------------------

    supabaseClient = createClient(
      config.url,
      config.anonKey
    );

    activeSupabaseUrl = config.url;
    activeSupabaseAnonKey = config.anonKey;

    return supabaseClient;

  } catch (err) {
    console.warn(
      'Failed to initialize Supabase client:',
      err
    );

    // Make sure a failed initialization is never cached.
    supabaseClient = null;
    activeSupabaseUrl = '';
    activeSupabaseAnonKey = '';

    return null;
  }
}


// ============================================================
// SUPABASE SQL SCHEMA
// ============================================================

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- AURUM REGISTRY - SUPABASE DATABASE SCHEMA SQL
-- Run this script in your Supabase SQL Editor to initialize.
-- ========================================================

-- 1. Create Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'registration', -- 'pre-registration' | 'registration' | 'waitlist'
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  location TEXT,
  event_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'draft' | 'archived'
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_registrations INT,
  submit_button_text TEXT DEFAULT 'Submit Registration',
  success_message TEXT DEFAULT 'Thank you for registering!',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Registrations Submissions Table
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed' | 'pending' | 'checked-in' | 'cancelled'
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT
);

-- 3. Row Level Security Policies (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active registration sites
CREATE POLICY "Public read events" ON public.events 
  FOR SELECT USING (true);

-- Allow public full access for admin management
CREATE POLICY "Public manage events" ON public.events 
  FOR ALL USING (true);

-- Allow public submit registrations
CREATE POLICY "Public insert registrations" ON public.registrations 
  FOR INSERT WITH CHECK (true);

-- Allow public read registrations
CREATE POLICY "Public read registrations" ON public.registrations 
  FOR SELECT USING (true);

-- Allow update registration status (e.g. check-in)
CREATE POLICY "Public update registrations" ON public.registrations 
  FOR UPDATE USING (true);
`;