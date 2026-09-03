import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const SUPABASE_URL = "https://uawglncthemjdtzrkwbn.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2dsbmN0aGVtamR0enJrd2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjcxNzUsImV4cCI6MjA2NzY0MzE3NX0.HoDEAe3Ryic4s9ndhg50_wt7qb7VW8wsoVqRzvBvN4g";
export const SUPABASE_STORAGE_KEY = "sb-uawglncthemjdtzrkwbn-auth-token";

export const getStoredAccessToken = (): string | null => {
  try {
    const directToken = localStorage.getItem('supabase_access_token') || sessionStorage.getItem('supabase_access_token');
    if (directToken) return directToken;

    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.access_token) return parsed.access_token;
    }
  } catch (e) {
    // Ignore storage parsing errors
  }
  return null;
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: false, // Prevents background 500 loop on token refresh
    detectSessionInUrl: false, // Explicitly handled at entry point for reliability
  },
  global: {
    fetch: async (url, options = {}) => {
      const token = getStoredAccessToken();
      if (token) {
        const headers = new Headers(options.headers || {});
        const currentAuth = headers.get('Authorization');
        if (!currentAuth || currentAuth === `Bearer ${SUPABASE_PUBLISHABLE_KEY}`) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        return fetch(url, { ...options, headers });
      }
      return fetch(url, options);
    },
  },
});