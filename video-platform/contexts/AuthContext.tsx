'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange, signOut as supabaseSignOut } from '@/lib/supabase/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { session: initialSession } = await getSession();
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user ?? null);
        }
      } catch (err: any) {
        console.error('Error initializing session:', err);
        // Don't set error state on initial load if it's a refresh token issue
        // just proceed without session
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Clear error when session updates successfully
      if (session) {
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabaseSignOut();
      setUser(null);
      setSession(null);
      setError(null);
    } catch (err: any) {
      console.error('Error signing out:', err);
      // Still clear the state even if sign out fails
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}




