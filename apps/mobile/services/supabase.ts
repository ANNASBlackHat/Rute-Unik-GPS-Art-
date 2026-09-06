import { createClient } from '@supabase/supabase-js';

// Polyfill WebSocket for Node.js test runner environment if needed
if (typeof window === 'undefined' && typeof (globalThis as any).WebSocket === 'undefined') {
  try {
    const ws = require('ws');
    (globalThis as any).WebSocket = ws;
  } catch {
    // Ignore in environments where ws is unavailable
  }
}

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://xtzqtjtksaqsgtyfcexf.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0enF0anRrc2Fxc2d0eWZjZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNzk3NTAsImV4cCI6MjEwMzY1NTc1MH0.dAUcldiZeizPEs7PektT8z6YxFN5uTsPA-ENLXalgvM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
