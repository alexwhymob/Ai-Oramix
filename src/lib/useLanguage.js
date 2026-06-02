import { useState, useEffect } from 'react';

const LANG_KEY = 'oramix_lang';

export function useLanguage() {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem(LANG_KEY) || 'pt'; }
    catch { return 'pt'; }
  });

  useEffect(() => {
    const handler = () => setLang(localStorage.getItem(LANG_KEY) || 'pt');
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  const toggleLang = () => {
    const newLang = lang === 'pt' ? 'en' : 'pt';
    localStorage.setItem(LANG_KEY, newLang);
    window.dispatchEvent(new Event('langchange'));
  };

  const tr = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj['pt'] || '';
  };

  return { lang, setLang, toggleLang, tr };
}