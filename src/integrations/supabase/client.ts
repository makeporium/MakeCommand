import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const SUPABASE_URL = "https://uawglncthemjdtzrkwbn.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2dsbmN0aGVtamR0enJrd2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjcxNzUsImV4cCI6MjA2NzY0MzE3NX0.HoDEAe3Ryic4s9ndhg50_wt7qb7VW8wsoVqRzvBvN4g";
export const SUPABASE_STORAGE_KEY = "sb-uawglncthemjdtzrkwbn-auth-token";

export const getStoredAccessToken = (): string | null => {
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.access_token) return parsed.access_token;
    }

    const directToken = localStorage.getItem('supabase_access_token') || sessionStorage.getItem('supabase_access_token');
    if (directToken) return directToken;
  } catch (e) {
    // Ignore storage parsing errors
  }
  return null;
};

let refreshPromise: Promise<string | null> | null = null;

export const refreshSessionToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session?.access_token) {
        localStorage.setItem('supabase_access_token', data.session.access_token);
        return data.session.access_token;
      }
    } catch (e) {
      console.warn('Auto token refresh failed:', e);
    } finally {
      refreshPromise = null;
    }
    return null;
  })();
  return refreshPromise;
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: async (url, options = {}) => {
      const urlStr = typeof url === 'string' ? url : (url instanceof Request ? url.url : String(url));

      // Never tamper with Supabase auth endpoints - GoTrue manages its own auth headers
      if (urlStr.includes('/auth/v1/')) {
        return fetch(url, options);
      }

      let token = getStoredAccessToken();
      const headers = new Headers(options.headers || (options instanceof Request ? options.headers : {}));
      if (token) {
        const currentAuth = headers.get('Authorization');
        if (!currentAuth || currentAuth === `Bearer ${SUPABASE_PUBLISHABLE_KEY}`) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }

      const response = await fetch(url, { ...options, headers });

      // If 401 with JWT expired, attempt automatic session refresh and single retry
      if (response.status === 401 && !urlStr.includes('/auth/v1/')) {
        try {
          const clonedResponse = response.clone();
          const errorData = await clonedResponse.json();
          const isJwtExpired =
            errorData?.message?.toLowerCase().includes('jwt expired') ||
            errorData?.error_description?.toLowerCase().includes('jwt expired') ||
            errorData?.code === 'PGRST301';

          if (isJwtExpired) {
            const newToken = await refreshSessionToken();
            if (newToken) {
              headers.set('Authorization', `Bearer ${newToken}`);
              return fetch(url, { ...options, headers });
            }
          }
        } catch {
          // If response is not JSON or parsing fails, return original response
        }
      }

      return response;
    },
  },
});