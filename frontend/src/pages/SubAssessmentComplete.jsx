import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Brain, Database, ArrowLeft, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QuestionCard from '@/components/QuestionCard';
import { useLanguage } from '@/lib/useLanguage';
import { base44 } from '@/api/base44Client';

const DATA_MATURITY = [
  { max: 1, label_pt: 'Dados Brutos', label_en: 'Raw Data', color: '#ef4444' },
  { max: 2, label_pt: 'Dados Reconhecidos', label_en: 'Recognised Data', color: '#f97316' },
  { max: 3, label_pt: 'Dados Geridos', label_en: 'Managed Data', color: '#eab308' },
  { max: 4, label_pt: 'Dados Preparados', label_en: 'Prepared Data', color: '#22c55e' },
  { max: 5, label_pt: 'Dados AI-ready', label_en: 'AI-ready Data', color: '#3b82f6' }
];

function getDataMaturity(score) {
  return DATA_MATURITY.find((item) => score <= item.max) || DATA_MATURITY[DATA_MATURITY.length - 1];
}

function scoreColor(score) {
  return score < 2 ? '#ef4444' : score < 3 ? '#f97316' : score < 3.6 ? '#eab308' : score < 4.3 ? '#22c55e' : '#3b82f6';
}

export default function SubAssessmentComplete() {
  const { assessmentId } = useParams();
  const { lang } = useLanguage();
  const [showReview, setShowReview] = useState(false);
  const [expandedPillar, setExpandedPillar] = useState(null);
  const t = (pt, en) => (lang === 'pt' ? pt : en);

  const { data: sessionData } = useQuery({
    queryKey: ['sub_result', assessmentId],
    queryFn: () => base44.functions.invoke('quizSession', { action: 'getSubResult', assessmentId }).then((response) => response.data),
    enabled: !!assessmentId
  });

  const subAssessment = sessionData?.assessment;
  const customer = sessionData?.customer;
  const answers = sessionData?.answers || [];

  const { data: allPillars = [] } = useQuery({
    queryKey: ['all_pillars'],
    queryFn: () => base44.entities.Pillar.list('order')
  });

  const pillarScores = useMemo(() => {
    try {
      return JSON.parse(subAssessment?.pillar_scores || '[]');
    } catch {
      return [];
    }
  }, [subAssessment?.pillar_scores]);

  const pillars = useMemo(() => {
    const scoreCodes = pillarScores.map((score) => score.code);
    if (scoreCodes.length > 0) {
      return allPillars.filter((pillar) => scoreCodes.includes(pillar.code));
    }

    if (subAssessment?.assessment_template_id) {
      return allPillars.filter((pillar) => pillar.assessment_template_id === subAssessment.assessment_template_id);
    }

    return allPillars.filter((pillar) => pillar.assessment_type === 'sub_assessment');
  }, [allPillars, pillarScores, subAssessment?.assessment_template_id]);

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list('order')
  });

  const answersMap = useMemo(() => {
    const map = {};
    answers.forEach((answer) => {
      map[answer.question_id] = answer.value;
    });
    return map;
  }, [answers]);

  const maturity = subAssessment ? getDataMaturity(subAssessment.global_score) : null;

  if (!subAssessment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/20">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">Oramix</span>
          </div>
          {subAssessment.parent_assessment_id && (
            <Link to={`/complete/${subAssessment.parent_assessment_id}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('Voltar a avaliacao principal', 'Back to main assessment')}
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-9 h-9 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('Sub-avaliacao concluida!', 'Sub-assessment complete!')}</h1>
          <p className="text-muted-foreground">
            {t('Obrigado, ', 'Thank you, ')}
            {customer?.name || ''}
            . {t('A sua sub-avaliacao foi submetida com sucesso.', 'Your sub-assessment has been submitted successfully.')}
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center flex-shrink-0">
              <div className="text-6xl font-black" style={{ color: maturity?.color }}>
                {subAssessment.global_score?.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">{t('Score /5.0', 'Score /5.0')}</div>
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div
                className="inline-block px-4 py-1.5 rounded-full text-white text-sm font-semibold"
                style={{ background: maturity?.color }}
              >
                {lang === 'en' ? maturity?.label_en : maturity?.label_pt}
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  'Este score reflete a maturidade especifica desta area na sua organizacao.',
                  'This score reflects the specific maturity of this area in your organisation.'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wide">
            {t('Resultados por dimensao', 'Results by dimension')}
          </h3>
          <div className="space-y-3">
            {pillarScores.map((score) => {
              const pillar = pillars.find((item) => item.code === score.code) || score;
              const percentage = Math.round((score.score / 5) * 100);
              const color = scoreColor(score.score);

              return (
                <div key={score.code}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-foreground">
                      {lang === 'en' ? (pillar.name_en || pillar.name_pt) : pillar.name_pt}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{score.weight}%</span>
                      <span className="text-sm font-bold" style={{ color }}>
                        {score.score?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wide">
            {t('Escala de maturidade', 'Maturity scale')}
          </h3>
          <div className="space-y-2">
            {DATA_MATURITY.map((item, index) => {
              const isActive = subAssessment.global_score <= item.max
                && (index === 0 || subAssessment.global_score > DATA_MATURITY[index - 1].max);

              return (
                <div
                  key={item.max}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${isActive ? 'ring-2' : ''}`}
                  style={isActive ? { background: `${item.color}15`, ringColor: item.color } : {}}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: item.color }}
                  >
                    {index + 1}
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'font-bold' : 'text-muted-foreground'}`}>
                    {lang === 'en' ? item.label_en : item.label_pt}
                  </span>
                  {isActive && (
                    <span className="ml-auto text-xs font-semibold" style={{ color: item.color }}>
                      {t('Estado atual', 'Current status')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mt-6">
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{t('Rever respostas', 'Review answers')}</span>
            </div>
            {showReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showReview && (
            <div className="border-t divide-y">
              {pillars.map((pillar) => {
                const pillarQuestions = allQuestions
                  .filter((question) => question.pillar_code === pillar.code)
                  .sort((left, right) => left.order - right.order);
                const isOpen = expandedPillar === pillar.code;

                return (
                  <div key={pillar.code}>
                    <button
                      onClick={() => setExpandedPillar(isOpen ? null : pillar.code)}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50"
                    >
                      <span className="font-medium text-sm">
                        {lang === 'en' ? (pillar.name_en || pillar.name_pt) : pillar.name_pt}
                      </span>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 space-y-6 bg-slate-50/50">
                        {pillarQuestions.map((question) => (
                          <QuestionCard
                            key={question.id}
                            question={question}
                            value={answersMap[question.id]}
                            lang={lang}
                            readOnly
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t(
            'O relatorio detalhado desta sub-avaliacao sera integrado na analise completa da Oramix.',
            'The detailed report for this sub-assessment will be integrated into the full Oramix analysis.'
          )}
        </p>
      </div>
    </div>
  );
}
