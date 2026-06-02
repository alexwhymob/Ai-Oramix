import { getMaturityLevel } from '@/lib/scoring';

export default function ScoreBadge({ score, lang = 'pt', size = 'md' }) {
  const level = getMaturityLevel(score);
  const sizeClass = size === 'lg' ? 'text-base px-4 py-2' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClass} ${level.bg} ${level.text} ${level.border}`}>
      <span>{level.emoji}</span>
      <span>{lang === 'en' ? level.label_en : level.label_pt}</span>
    </span>
  );
}