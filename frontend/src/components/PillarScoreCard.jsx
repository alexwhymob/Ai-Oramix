import { getScoreColor } from '@/lib/scoring';
import { getLevelDisplayColor, useMaturityData } from '@/lib/useMaturity';

export default function PillarScoreCard({ pillar, score, lang = 'pt', dark = false, presetId = null }) {
  const { resolveLevel } = useMaturityData();
  const name = lang === 'en' ? pillar.name_en || pillar.name_pt : pillar.name_pt;
  const pct = Math.round(score / 5 * 100);
  const level = resolveLevel(score, presetId);
  const color = getLevelDisplayColor(level, getScoreColor(score));

  if (dark) return (
    <div className="p-4 rounded-xl border border-white/10 bg-[#152233]">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-medium text-sm text-white">{name}</div>
          <div className="text-xs text-white/40">{pillar.weight}% weight</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-white">{score.toFixed(1)}</div>
          <div className="text-xs text-white/40">/5.0</div>
        </div>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-2 text-xs" style={{ color }}>
        {level.emoji} {lang === 'en' ? level.label_en : level.label_pt}
      </div>
    </div>);


  return (
    <div className="p-4 rounded-xl border bg-card">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-medium text-sm text-foreground">{name}</div>
          <div className="text-xs bg-[hsl(var(--background))] text-[hsl(var(--background))]">{pillar.weight}% weight</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-foreground">{score.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">/5.0</div>
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-2 text-xs font-medium" style={{ color }}>
        {level.emoji} {lang === 'en' ? level.label_en : level.label_pt}
      </div>
    </div>);

}
