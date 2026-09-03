
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
        // 1. Check if OAuth tokens exist in the URL hash OR in sessionStorage backup
        const rawHash = (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token='))
          ? window.location.hash
          : (typeof window !== 'undefined' ? sessionStorage.getItem('supabase_auth_hash') || '' : '');

        if (rawHash && rawHash.includes('access_token=')) {
          const cleanHash = rawHash.startsWith('#') ? rawHash.substring(1) : rawHash;
          const params = new URLSearchParams(cleanHash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken) {
            try {
              sessionStorage.removeItem('supabase_auth_hash');
            } catch (e) {}

            // Try to setSession
            try {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });

              if (!error && data?.session?.user) {
                setUser(data.session.user);
                setLoading(false);
                window.history.replaceState(null, '', window.location.pathname);
                return;
              }
            } catch (sessionErr) {
              console.warn('setSession error, falling back to getUser:', sessionErr);
            }

            // Fallback: validate token directly via getUser
            const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
            if (!userError && userData?.user) {
              setUser(userData.user);
              setLoading(false);
              window.history.replaceState(null, '', window.location.pathname);
              return;
            }
          }
        }

        // 2. Standard getSession check
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          setUser(sessionData.session.user);
        } else {
          // Check if getUser has an active user
          const { data: uData } = await supabase.auth.getUser();
          if (uData?.user) {
            setUser(uData.user);
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Auth check error:', err);
      } finally {
        setLoading(false);
      }
    };

    handleAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
