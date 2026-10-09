import { createClient } from '@supabase/supabase-js';

const url = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const publishableKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

export const envReady = Boolean(url && publishableKey);

export const supabase = envReady
  ? createClient(url, publishableKey, {
      db: { schema: 'axe_product' },
      auth: {
        // PKCE keeps access/refresh tokens out of the browser address bar.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
