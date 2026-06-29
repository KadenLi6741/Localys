/**
 * useTranslation — convenience hook for translating UI text.
 * Purpose: Reads the active language from LanguageContext and returns a `t(key)` function that looks up
 *   the localized string, so components can write `t('common.loading')` without touching the context.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';

// Returns { t, language }: t(key) resolves a translation for the current language.
export function useTranslation() {
  const { language } = useLanguage();

  return {
    t: (key: string) => getTranslation(language, key),
    language,
  };
}
