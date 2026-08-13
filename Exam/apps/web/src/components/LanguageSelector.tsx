import React from 'react';
import { useTranslation, LANGUAGES } from '../context/I18nContext';
import { LanguageCode } from '@repo/types';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as LanguageCode)}
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
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code} style={{ background: '#1e293b', color: '#fff' }}>
          {lang.nativeName} ({lang.name})
        </option>
      ))}
    </select>
  );
};
