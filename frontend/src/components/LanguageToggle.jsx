import { useLanguage } from '@/lib/useLanguage';

export default function LanguageToggle({ className = '', dark = false }) {
  const { lang, toggleLang } = useLanguage();
  const base = dark
    ? 'border-white/20 text-white hover:bg-white/10'
    : 'border-border text-foreground hover:bg-accent';

  return (
    <button
      onClick={toggleLang}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${base} ${className}`}
    >
      <span>{lang === 'pt' ? '🇵🇹' : '🇬🇧'}</span>
      <span className="font-semibold">{lang.toUpperCase()}</span>
      <span className="opacity-30 mx-0.5">|</span>
      <span className="opacity-50">{lang === 'pt' ? 'EN' : 'PT'}</span>
    </button>
  );
}