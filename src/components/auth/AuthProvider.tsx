import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, SUPABASE_STORAGE_KEY, getStoredAccessToken } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // 1. Check for OAuth redirect hash in URL or sessionStorage backup
        const rawHash = (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token='))
          ? window.location.hash
          : (typeof window !== 'undefined' ? sessionStorage.getItem('supabase_auth_hash') || '' : '');

        if (rawHash && rawHash.includes('access_token=')) {
          const cleanHash = rawHash.startsWith('#') ? rawHash.substring(1) : rawHash;
          const params = new URLSearchParams(cleanHash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const providerToken = params.get('provider_token');
          const expiresIn = params.get('expires_in');

          if (accessToken) {
            try {
              sessionStorage.removeItem('supabase_auth_hash');
            } catch (e) {}

            // Store access token for the fetch interceptor
            localStorage.setItem('supabase_access_token', accessToken);

            // Validate token and fetch user details
            const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
            if (!userError && userData?.user) {
              const currentUser = userData.user;
              setUser(currentUser);

              // Persist full session to Supabase local storage key
              try {
                const sessionPayload = {
                  access_token: accessToken,
                  refresh_token: refreshToken || '',
                  expires_in: expiresIn ? parseInt(expiresIn, 10) : 3600,
                  expires_at: Math.floor(Date.now() / 1000) + (expiresIn ? parseInt(expiresIn, 10) : 3600),
                  token_type: 'bearer',
                  user: currentUser,
                };
                localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(sessionPayload));
              } catch (e) {}

              setLoading(false);
              window.history.replaceState(null, '', window.location.pathname);
              return;
            }
          }
        }

        // 2. Check for existing stored access token
        const storedToken = getStoredAccessToken();
        if (storedToken) {
          const { data: userData, error: userError } = await supabase.auth.getUser(storedToken);
          if (!userError && userData?.user) {
            setUser(userData.user);
            setLoading(false);
            return;
          } else {
            // Token is expired or invalid, clear it
            localStorage.removeItem('supabase_access_token');
            localStorage.removeItem(SUPABASE_STORAGE_KEY);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    handleAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (session.access_token) {
          localStorage.setItem('supabase_access_token', session.access_token);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data?.session) {
      if (data.session.access_token) {
        localStorage.setItem('supabase_access_token', data.session.access_token);
      }
      try {
        localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(data.session));
      } catch (e) {}
      setUser(data.user);
    }
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data?.session) {
      if (data.session.access_token) {
        localStorage.setItem('supabase_access_token', data.session.access_token);
      }
      try {
        localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(data.session));
      } catch (e) {}
      setUser(data.user);
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Supabase signOut error:', error);
    } finally {
      setUser(null);
      try {
        localStorage.removeItem('supabase_access_token');
        localStorage.removeItem(SUPABASE_STORAGE_KEY);
        sessionStorage.clear();
      } catch (e) {}
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
