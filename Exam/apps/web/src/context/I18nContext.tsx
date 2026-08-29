import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LanguageCode } from '@repo/types';

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  isDefault?: boolean;
}

interface I18nContextType {
  currentLanguage: string;
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string) => string;
  availableLanguages: LanguageInfo[];
  registerLanguage: (lang: LanguageInfo, initialKeys?: Record<string, string>) => Promise<boolean>;
  isLoading: boolean;
}

const API_BASE = 'http://localhost:4043/api/v1';

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<string>('en');
  const [availableLanguages, setAvailableLanguages] = useState<LanguageInfo[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Fetch baseline registered languages from Database API on mount
  useEffect(() => {
    fetchLanguages();
  }, []);

  // 2. Fetch translation dictionary from Database API when language changes
  useEffect(() => {
    fetchTranslations(currentLanguage);
  }, [currentLanguage]);

  const fetchLanguages = async () => {
    try {
      const res = await fetch(`${API_BASE}/i18n/languages`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data) && body.data.length > 0) {
          setAvailableLanguages(body.data);
          return;
        }
      }
    } catch (e) {
      console.warn('API connection offline, using default fallback language list');
    }
    // Fallback baseline
    setAvailableLanguages([
      { code: 'en', name: 'English', nativeName: 'English', isDefault: true },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    ]);
  };

  const fetchTranslations = async (langCode: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/i18n/translations/${langCode}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data?.translations) {
          setTranslations(body.data.translations);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('API connection offline, using client fallback');
    }
    setIsLoading(false);
  };

  const setLanguage = async (code: string) => {
    setCurrentLanguageState(code);
    // Sync user preference to Database API if token exists
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch(`${API_BASE}/users/me/preferences`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ languageCode: code }),
        });
      } catch (e) {
        console.warn('Could not sync language preference to server');
      }
    }
  };

  const registerLanguage = async (
    lang: LanguageInfo,
    initialKeys?: Record<string, string>
  ): Promise<boolean> => {
    const token = localStorage.getItem('token');
    try {
      // 1. Call Database API to persist new language entry in PostgreSQL DB
      const resLang = await fetch(`${API_BASE}/i18n/languages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(lang),
      });

      if (!resLang.ok) {
        const errBody = await resLang.json();
        console.error('Failed to register language in DB:', errBody);
        return false;
      }

      // 2. Persist initial translation keys into Database API
      if (initialKeys) {
        for (const [k, v] of Object.entries(initialKeys)) {
          await fetch(`${API_BASE}/i18n/translations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              languageCode: lang.code,
              key: k,
              value: v,
            }),
          });
        }
      }

      // 3. Refresh language list & switch to newly persisted language
      await fetchLanguages();
      await setLanguage(lang.code);
      return true;
    } catch (err) {
      console.error('Error persisting language to database:', err);
      return false;
    }
  };

  const t = (key: string): string => {
    if (translations[key]) return translations[key];
    // Fallback formatting
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <I18nContext.Provider
      value={{
        currentLanguage,
        language: currentLanguage,
        setLanguage,
        t,
        availableLanguages,
        registerLanguage,
        isLoading,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export const useTranslation = useI18n;

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', isDefault: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
];

