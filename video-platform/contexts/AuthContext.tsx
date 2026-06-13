'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange, signOut as supabaseSignOut } from '@/lib/supabase/auth';
import { updateLastActive } from '@/lib/supabase/fraud';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActiveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getSession().then(({ session }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) updateLastActive(session.user.id).catch(() => {});
    });

    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) updateLastActive(session.user.id).catch(() => {});
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Update last_active_at every 5 minutes while user is logged in
  useEffect(() => {
    if (lastActiveInterval.current) clearInterval(lastActiveInterval.current);
    if (user) {
      lastActiveInterval.current = setInterval(() => {
        updateLastActive(user.id).catch(() => {});
      }, 5 * 60 * 1000);
    }
    return () => {
      if (lastActiveInterval.current) clearInterval(lastActiveInterval.current);
    };
  }, [user]);

  const signOut = async () => {
    await supabaseSignOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}




