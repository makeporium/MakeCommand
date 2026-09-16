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

            if (providerToken) {
              try {
                sessionStorage.setItem('google_tasks_access_token', providerToken);
              } catch (e) {}
            }

            // 1a. Establish full session in Supabase GoTrue client
            if (refreshToken) {
              try {
                const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

                if (!sessionErr && sessionData?.session?.user) {
                  setUser(sessionData.session.user);
                  localStorage.setItem('supabase_access_token', sessionData.session.access_token);
                  setLoading(false);
                  window.history.replaceState(null, '', window.location.pathname);
                  return;
                }
              } catch (e) {
                console.warn('setSession error during OAuth redirect handling:', e);
              }
            }

            // 1b. Fallback: validate token directly via getUser
            localStorage.setItem('supabase_access_token', accessToken);
            const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
            if (!userError && userData?.user) {
              const currentUser = userData.user;
              setUser(currentUser);

              // Persist session to Supabase local storage key
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

        // 2. Check for existing active session via getSession()
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (!sessionError && sessionData?.session?.user) {
          setUser(sessionData.session.user);
          if (sessionData.session.access_token) {
            localStorage.setItem('supabase_access_token', sessionData.session.access_token);
          }
          setLoading(false);
          return;
        }

        // 3. If session is not active or token expired, attempt refresh using stored refresh token
        const rawStored = localStorage.getItem(SUPABASE_STORAGE_KEY);
        if (rawStored) {
          try {
            const parsed = JSON.parse(rawStored);
            if (parsed?.refresh_token) {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
                refresh_token: parsed.refresh_token,
              });
              if (!refreshError && refreshData?.session?.user) {
                setUser(refreshData.session.user);
                if (refreshData.session.access_token) {
                  localStorage.setItem('supabase_access_token', refreshData.session.access_token);
                }
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.warn('Silent refresh attempt error:', e);
          }
        }

        // 4. Check for existing valid stored access token as last resort
        const storedToken = getStoredAccessToken();
        if (storedToken) {
          const { data: userData, error: userError } = await supabase.auth.getUser(storedToken);
          if (!userError && userData?.user) {
            setUser(userData.user);
            setLoading(false);
            return;
          }
        }

        // 5. If everything failed, reset state
        localStorage.removeItem('supabase_access_token');
        localStorage.removeItem(SUPABASE_STORAGE_KEY);
        setUser(null);
      } catch (err) {
        console.warn('Auth initialization error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    handleAuth();

    // Listen for auth state changes (including automatic TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (session.access_token) {
          localStorage.setItem('supabase_access_token', session.access_token);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('supabase_access_token');
        localStorage.removeItem(SUPABASE_STORAGE_KEY);
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
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
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
