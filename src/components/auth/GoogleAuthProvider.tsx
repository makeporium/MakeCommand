// components/auth/GoogleAuthProvider.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Assuming you have supabase client initialized
import { useAuth } from '@/components/auth/AuthProvider'; // Your existing AuthProvider

interface GoogleAuthContextType {
  isSignedIn: boolean;
  handleGoogleSignIn: () => void;
  handleGoogleSignOut: () => void;
  getGoogleAccessToken: () => Promise<string | null>;
  googleTasksApi: GoogleTasksApi | null;
}

interface GoogleTasksApi {
  listTaskLists: () => Promise<any[]>;
  listTasks: (taskListId: string) => Promise<any[]>;
  createTask: (taskListId: string, task: GoogleTaskPayload) => Promise<any>;
  updateTask: (taskListId: string, taskId: string, task: GoogleTaskPayload) => Promise<any>;
  deleteTask: (taskListId: string, taskId: string) => Promise<void>;
}

interface GoogleTaskPayload {
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp
  status?: 'needsAction' | 'completed';
  starred?: boolean; // Google Tasks API doesn't have a direct 'starred' field. We'll map 'urgent' to notes.
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID; // Make sure to set this in your .env.local

export const GoogleAuthProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth(); // Get current Supabase user
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    // Attempt to load existing token from Supabase user metadata or local storage
    const loadToken = async () => {
      if (user) {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        if (currentUser && currentUser.user_metadata?.google_access_token) {
          setAccessToken(currentUser.user_metadata.google_access_token as string);
          setIsSignedIn(true);
        }
      }
    };
    loadToken();
  }, [user]);

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
         scopes: 'https://www.googleapis.com/auth/tasks', // Changed from array to single string
          redirectTo: window.location.origin, // Or a specific redirect URL
        },
      });

      if (error) {
        console.error('Error signing in with Google:', error);
        alert('Error signing in with Google: ' + error.message);
      } else if (data?.url) {
        // Redirect user to Google for authorization
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('Unexpected error during Google sign-in:', e);
    }
  };

  const handleGoogleSignOut = async () => {
    // In a real app, you might revoke the token or just clear local state.
    // For Supabase, signing out means clearing the session entirely.
    // Here, we just clear the local state to indicate signed out from Google Tasks.
    setAccessToken(null);
    setIsSignedIn(false);
    if (user) {
      await supabase.auth.updateUser({
        data: {
          google_access_token: null, // Clear token from Supabase user metadata
        }
      });
    }
    alert('Signed out from Google Tasks.');
  };

  const getGoogleAccessToken = async (): Promise<string | null> => {
    if (accessToken) return accessToken;
    
    // If accessToken is null, try to refresh or get it from Supabase session
    if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.provider_token) {
            // Supabase's provider_token for Google is typically the access token
            setAccessToken(session.provider_token);
            setIsSignedIn(true);
            return session.provider_token;
        }
    }
    return null;
  };

  // Google Tasks API Wrapper
  const googleTasksApi: GoogleTasksApi = {
    listTaskLists: async () => {
      const token = await getGoogleAccessToken();
      if (!token) throw new Error('Not authenticated with Google Tasks.');
      const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch task lists: ${response.statusText}`);
      const data = await response.json();
      return data.items || [];
    },

    listTasks: async (taskListId: string) => {
      const token = await getGoogleAccessToken();
      if (!token) throw new Error('Not authenticated with Google Tasks.');
      const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showHidden=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      const data = await response.json();
      return data.items || [];
    },

    createTask: async (taskListId: string, task: GoogleTaskPayload) => {
      const token = await getGoogleAccessToken();
      if (!token) throw new Error('Not authenticated with Google Tasks.');
      const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });
      if (!response.ok) throw new Error(`Failed to create task: ${response.statusText}`);
      return response.json();
    },

    updateTask: async (taskListId: string, taskId: string, task: GoogleTaskPayload) => {
      const token = await getGoogleAccessToken();
      if (!token) throw new Error('Not authenticated with Google Tasks.');
      const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
        method: 'PATCH', // PATCH for partial updates
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });
      if (!response.ok) throw new Error(`Failed to update task: ${response.statusText}`);
      return response.json();
    },

    deleteTask: async (taskListId: string, taskId: string) => {
      const token = await getGoogleAccessToken();
      if (!token) throw new Error('Not authenticated with Google Tasks.');
      const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to delete task: ${response.statusText}`);
    },
  };

  // Handle OAuth redirect from Google
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && session.provider_token && session.provider_refresh_token && user) {
        setAccessToken(session.provider_token);
        setIsSignedIn(true);
        // Store these tokens securely with the user in your database if you want to
        // maintain Google session across app restarts without re-authenticating Google.
        // For Supabase, you might update user_metadata.
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            google_access_token: session.provider_token,
            google_refresh_token: session.provider_refresh_token,
          }
        });
        if (updateError) {
          console.error('Error updating user metadata with Google tokens:', updateError);
        }
      }
    };

    handleOAuthRedirect();
  }, [user]);


  return (
    <GoogleAuthContext.Provider value={{ isSignedIn, handleGoogleSignIn, handleGoogleSignOut, getGoogleAccessToken, googleTasksApi }}>
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (context === undefined) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
};