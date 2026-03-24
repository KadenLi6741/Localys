'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGES, Language } from '@/lib/translations';
import { useTranslation } from '@/hooks/useTranslation';

export function LanguageSettings() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = async (newLanguage: Language) => {
    await setLanguage(newLanguage);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-lg transition-colors text-[var(--text-primary)]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21H9m4-18H9m2 2v8m4 0l4-4m0 0l4 4m-4-4v4m-10 0h10" />
        </svg>
        <span className="text-sm">{LANGUAGES[language].nativeName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-transparent border border-[var(--glass-border)] rounded-lg shadow-lg z-50">
          <div className="p-2">
            <p className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-2 px-2">{t('common.language')}</p>
            {(Object.entries(LANGUAGES) as [Language, typeof LANGUAGES[Language]][]).map(([code, { name, nativeName }]) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  language === code
                    ? 'bg-blue-500 text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)]'
                }`}
              >
                <div className="font-medium">{nativeName}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{name}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
