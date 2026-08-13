import React from 'react';
import { useTranslation, LANGUAGES } from '../context/I18nContext';

export const LanguageSelector: React.FC = () => {
  const { currentLanguage, language, setLanguage, availableLanguages } = useTranslation();

  const activeCode = currentLanguage || language || 'en';
  const list = (availableLanguages && availableLanguages.length > 0) ? availableLanguages : LANGUAGES;

  return (
    <select
      value={activeCode}
      onChange={(e) => setLanguage(e.target.value)}
      style={{
        padding: '6px 12px',
        borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(0,0,0,0.4)',
        color: '#fff',
        fontSize: '12px',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {list.map((lang) => (
        <option key={lang.code} value={lang.code} style={{ background: '#1e293b', color: '#fff' }}>
          {lang.nativeName} ({lang.name})
        </option>
      ))}
    </select>
  );
};
