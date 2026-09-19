import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Database, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DATA_MATURITY = [
  { max: 1, label: 'Raw Data',       color: '#ef4444' },
  { max: 2, label: 'Recognised Data', color: '#f97316' },
  { max: 3, label: 'Managed Data',    color: '#eab308' },
  { max: 4, label: 'Prepared Data',   color: '#22c55e' },
  { max: 5, label: 'AI-ready Data',   color: '#3b82f6' },
];

const DIMENSION_LABELS = {
  ds_qualidade:    'Intrinsic Quality',
  ds_completude:   'Completeness',
  ds_consistencia: 'Consistency',
  ds_atualidade:   'Timeliness',
  ds_acessibilidade:'Accessibility',
  ds_arquitetura:  'Architecture',
  ds_documentacao: 'Documentation',
  ds_privacidade:  'Privacy & Ethics',
};

function scoreColor(s) {
  return s < 2 ? '#ef4444' : s < 3 ? '#f97316' : s < 3.6 ? '#eab308' : s < 4.3 ? '#22c55e' : '#3b82f6';
}

function getDataMaturity(score) {
  return DATA_MATURITY.find(m => score <= m.max) || DATA_MATURITY[DATA_MATURITY.length - 1];
}

export default function SubAssessmentSummary({ subAssessment, title = 'Data AI Readiness Sub-Assessment', dimensionLabels = DIMENSION_LABELS, scoreLabel = 'Data Score /5.0' }) {
  const pillarScores = useMemo(() => {
    try { return JSON.parse(subAssessment?.pillar_scores || '[]'); } catch { return []; }
  }, [subAssessment?.pillar_scores]);

  const maturity = subAssessment?.global_score != null ? getDataMaturity(subAssessment.global_score) : null;
  const isPending = subAssessment.status !== 'completed';

  return (
    <div className="bg-[#152233] border border-orange-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-semibold text-white/70">{title}</span>
          {isPending ? (
            <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" /> Pending
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-orange-300 bg-orange-400/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Completed
            </span>
          )}
        </div>
        {!isPending && (
          <Link to={`/sub-complete/${subAssessment.id}`} target="_blank">
            <Button size="sm" variant="ghost" className="text-orange-400 hover:text-orange-300 gap-1.5 h-7 text-xs">
              Full Results <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        )}
      </div>

      {isPending ? (
        <div className="px-5 py-10 text-center">
          <Clock className="w-8 h-8 text-yellow-400/40 mx-auto mb-3" />
          <p className="text-sm text-white/40">Sub-assessment has been triggered but the customer hasn't completed it yet.</p>
        </div>
      ) : (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Score + Maturity level */}
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <div>
                <div className="text-5xl font-black" style={{ color: maturity?.color }}>
                  {subAssessment.global_score?.toFixed(1)}
                </div>
                <div className="text-xs text-white/40 mt-0.5">{scoreLabel}</div>
              </div>
              <div className="flex-1">
                <div className="inline-block px-3 py-1 rounded-full text-white text-xs font-semibold mb-2" style={{ background: maturity?.color }}>
                  {maturity?.label}
                </div>
                {/* Maturity scale mini */}
                <div className="space-y-1">
                  {DATA_MATURITY.map((m, i) => {
                    const isActive = subAssessment.global_score <= m.max && (i === 0 || subAssessment.global_score > DATA_MATURITY[i - 1].max);
                    return (
                      <div key={i} className={`flex items-center gap-2 px-2 py-0.5 rounded ${isActive ? 'ring-1' : ''}`} style={isActive ? { background: m.color + '20', ringColor: m.color } : {}}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                        <span className={`text-xs ${isActive ? 'text-white font-semibold' : 'text-white/30'}`}>{m.label}</span>
                        {isActive && <span className="ml-auto text-[10px] font-bold" style={{ color: m.color }}>← here</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Dimension bars */}
          <div className="space-y-2.5">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Dimensions</div>
            {pillarScores.map(ps => {
              const col = scoreColor(ps.score);
              const pct = Math.round((ps.score / 5) * 100);
              const label = dimensionLabels[ps.code] || ps.code;
              return (
                <div key={ps.code}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs text-white/60">{label}</span>
                    <span className="text-xs font-bold" style={{ color: col }}>{ps.score?.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
