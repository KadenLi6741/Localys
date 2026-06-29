'use client';

/**
 * LanguageContext — the active UI language, shared app-wide.
 * Purpose: Holds the current language and exposes setLanguage(), persisting the choice (and syncing it
 *   to the signed-in user's profile) so translated text via useTranslation updates everywhere and sticks
 *   across visits.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '@/lib/translations';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>('en');
  const [loading, setLoading] = useState(true);

  // Load language preference on mount and when user changes
  useEffect(() => {
    if (user) {
      loadLanguagePreference();
    } else {
      // Use localStorage for non-authenticated users
      const savedLanguage = localStorage.getItem('preferredLanguage') as Language | null;
      if (savedLanguage) {
        setLanguageState(savedLanguage);
      }
      setLoading(false);
    }
  }, [user]);

  const loadLanguagePreference = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('language_preference')
        .eq('id', user.id)
        .single();

      if (!error && data && data.language_preference) {
        setLanguageState(data.language_preference as Language);
      } else if (error) {
        console.warn('Failed to load language preference:', {
          message: error.message,
          code: error.code,
        });
        // Default to English if not set
        setLanguageState('en');
      } else {
        // Default to English if not set
        setLanguageState('en');
      }
    } catch (error) {
      console.error('Failed to load language preference:', error);
      setLanguageState('en');
    } finally {
      setLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);

    if (user) {
      try {
        // Save to database
        const { error } = await supabase
          .from('profiles')
          .update({ language_preference: lang, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (error) {
          console.error('Failed to save language preference:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
        }
      } catch (error) {
        console.error('Exception saving language preference:', error);
      }
    } else {
      // Save to localStorage for non-authenticated users
      localStorage.setItem('preferredLanguage', lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
