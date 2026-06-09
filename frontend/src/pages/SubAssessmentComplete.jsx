import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Brain, Database, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/useLanguage';
import { getMaturityLevel } from '@/lib/scoring';
import { base44 } from '@/api/base44Client';

const DATA_MATURITY = [
  { max: 1, label_pt: 'Dados Brutos', label_en: 'Raw Data', color: '#ef4444' },
  { max: 2, label_pt: 'Dados Reconhecidos', label_en: 'Recognised Data', color: '#f97316' },
  { max: 3, label_pt: 'Dados Geridos', label_en: 'Managed Data', color: '#eab308' },
  { max: 4, label_pt: 'Dados Preparados', label_en: 'Prepared Data', color: '#22c55e' },
  { max: 5, label_pt: 'Dados AI-ready', label_en: 'AI-ready Data', color: '#3b82f6' },
];

function getDataMaturity(score) {
  return DATA_MATURITY.find(m => score <= m.max) || DATA_MATURITY[DATA_MATURITY.length - 1];
}

function scoreColor(s) {
  return s < 2 ? '#ef4444' : s < 3 ? '#f97316' : s < 3.6 ? '#eab308' : s < 4.3 ? '#22c55e' : '#3b82f6';
}

export default function SubAssessmentComplete() {
  const { assessmentId } = useParams();
  const { lang } = useLanguage();
  const t = (pt, en) => lang === 'pt' ? pt : en;

  const { data: sessionData } = useQuery({
    queryKey: ['sub_result', assessmentId],
    queryFn: () => base44.functions.invoke('quizSession', { action: 'getSubResult', assessmentId }).then(r => r.data),
    enabled: !!assessmentId,
  });
  const subAssessment = sessionData?.assessment;
  const customer = sessionData?.customer;

  const { data: allPillars = [] } = useQuery({
    queryKey: ['all_pillars'],
    queryFn: () => base44.entities.Pillar.list('order'),
  });
  const pillars = useMemo(() => allPillars.filter(p => p.code.startsWith('ds_')), [allPillars]);

  const pillarScores = useMemo(() => {
    try { return JSON.parse(subAssessment?.pillar_scores || '[]'); } catch { return []; }
  }, [subAssessment?.pillar_scores]);

  const maturity = subAssessment ? getDataMaturity(subAssessment.global_score) : null;

  if (!subAssessment) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/20">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center"><Brain className="w-4 h-4 text-white" /></div>
            <span className="font-bold text-sm">Oramix</span>
          </div>
          {subAssessment.parent_assessment_id && (
            <Link to={`/complete/${subAssessment.parent_assessment_id}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('Voltar à avaliação principal', 'Back to main assessment')}
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-9 h-9 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('Sub-Avaliação de Dados Concluída!', 'Data Sub-Assessment Complete!')}</h1>
          <p className="text-muted-foreground">{t('Obrigado, ', 'Thank you, ')}{customer?.name || ''}. {t('A sua avaliação de maturidade de dados foi submetida.', 'Your data maturity assessment has been submitted.')}</p>
        </div>

        {/* Score card */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center flex-shrink-0">
              <div className="text-6xl font-black" style={{ color: maturity?.color }}>{subAssessment.global_score?.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">{t('Score de Dados /5.0', 'Data Score /5.0')}</div>
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="inline-block px-4 py-1.5 rounded-full text-white text-sm font-semibold" style={{ background: maturity?.color }}>
                {lang === 'en' ? maturity?.label_en : maturity?.label_pt}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('Este score reflecte a maturidade específica dos seus dados para alimentar soluções de IA.', 'This score reflects the specific maturity of your data for powering AI solutions.')}
              </p>
            </div>
          </div>
        </div>

        {/* Dimension scores */}
        <div className="bg-white rounded-2xl border shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wide">{t('Resultados por Dimensão', 'Results by Dimension')}</h3>
          <div className="space-y-3">
            {pillarScores.map(ps => {
              const pillar = pillars.find(p => p.code === ps.code) || ps;
              const pct = Math.round((ps.score / 5) * 100);
              const col = scoreColor(ps.score);
              return (
                <div key={ps.code}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-foreground">{lang === 'en' ? (pillar.name_en || pillar.name_pt) : pillar.name_pt}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{ps.weight}%</span>
                      <span className="text-sm font-bold" style={{ color: col }}>{ps.score?.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: col }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data maturity scale */}
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wide">{t('Escala de Maturidade de Dados', 'Data Maturity Scale')}</h3>
          <div className="space-y-2">
            {DATA_MATURITY.map((m, i) => (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${subAssessment.global_score <= m.max && (i === 0 || subAssessment.global_score > DATA_MATURITY[i-1].max) ? 'ring-2' : ''}`} style={subAssessment.global_score <= m.max && (i === 0 || subAssessment.global_score > DATA_MATURITY[i-1].max) ? { background: m.color + '15', ringColor: m.color } : {}}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: m.color }}>{i + 1}</div>
                <span className={`text-sm font-medium ${subAssessment.global_score <= m.max && (i === 0 || subAssessment.global_score > DATA_MATURITY[i-1].max) ? 'font-bold' : 'text-muted-foreground'}`}>
                  {lang === 'en' ? m.label_en : m.label_pt}
                </span>
                {subAssessment.global_score <= m.max && (i === 0 || subAssessment.global_score > DATA_MATURITY[i-1].max) && (
                  <span className="ml-auto text-xs font-semibold" style={{ color: m.color }}>← {t('Estado atual', 'Actual status')}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t('O relatório detalhado de maturidade de dados será incluído na análise completa da Oramix.', 'The detailed data maturity report will be included in the full Oramix analysis.')}
        </p>
      </div>
    </div>
  );
}