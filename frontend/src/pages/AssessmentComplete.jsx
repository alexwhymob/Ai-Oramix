import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, RotateCcw, Brain, ChevronDown, ChevronUp, Database, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ScoreBadge from '@/components/ScoreBadge';
import AssessmentRadar from '@/components/AssessmentRadar';
import PillarScoreCard from '@/components/PillarScoreCard';
import QuestionCard from '@/components/QuestionCard';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/useLanguage';
import { getMaturityLevel } from '@/lib/scoring';
import { base44 } from '@/api/base44Client';

export default function AssessmentComplete() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [showReview, setShowReview] = useState(false);
  const [expandedPillar, setExpandedPillar] = useState(null);
  const [showSubAssessmentPopup, setShowSubAssessmentPopup] = useState(false);
  const t = (pt, en) => lang === 'pt' ? pt : en;

  const { data: resultData } = useQuery({
    queryKey: ['quiz_result', assessmentId],
    queryFn: () => base44.functions.invoke('quizSession', { action: 'getResult', assessmentId }).then(r => r.data),
    enabled: !!assessmentId,
  });
  const assessment = resultData?.assessment;
  const customer = resultData?.customer;
  const answers = resultData?.answers || [];

  const { data: allPillars = [] } = useQuery({ queryKey: ['pillars'], queryFn: () => base44.entities.Pillar.list('order') });
  const pillars = useMemo(() => allPillars.filter(p => !p.code.startsWith('ds_')), [allPillars]);
  const { data: allQuestions = [] } = useQuery({ queryKey: ['questions'], queryFn: () => base44.entities.Question.list('order') });
  const pillarScores = useMemo(() => { try { return JSON.parse(assessment?.pillar_scores || '[]'); } catch { return []; } }, [assessment?.pillar_scores]);
  const maturity = getMaturityLevel(assessment?.global_score);
  const answersMap = useMemo(() => { const m = {}; answers.forEach(a => { m[a.question_id] = a.value; }); return m; }, [answers]);

  const dataScore = pillarScores.find(p => p.code === 'dados')?.score;
  const needsSubAssessment = dataScore !== undefined && dataScore < 2.5;

  useEffect(() => {
    if (!needsSubAssessment) return;
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowSubAssessmentPopup(true);
        window.removeEventListener('scroll', handleScroll);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [needsSubAssessment]);

  const { data: subData } = useQuery({
    queryKey: ['sub_assessments', assessmentId],
    queryFn: () => base44.functions.invoke('quizSession', { action: 'getSubAssessments', assessmentId }).then(r => r.data),
    enabled: !!assessmentId && needsSubAssessment,
    refetchInterval: (data) => (!data?.subAssessments?.length ? 2000 : false),
    refetchOnWindowFocus: true,
  });
  const subAssessments = subData?.subAssessments || [];
  const subAssessment = subAssessments[0];



  if (!assessment) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" /></div>;

  const subAssessmentPopup = (
    <Dialog open={showSubAssessmentPopup} onOpenChange={setShowSubAssessmentPopup}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <DialogTitle className="text-lg">
              {t('Sub-Avaliação de Dados Recomendada', 'Data AI Readiness Sub-Assessment Required')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            {t(
              `O seu pilar de Dados obteve um score de ${dataScore?.toFixed(1)}/5, abaixo do limiar de 2.5. É importante que preencha a Sub-Avaliação de Maturidade de Dados IA para obter um diagnóstico aprofundado das suas capacidades de dados e receber recomendações específicas.`,
              `Your Data pillar scored ${dataScore?.toFixed(1)}/5, below the 2.5 threshold. It is important that you complete the Data AI Readiness Sub-Assessment to get an in-depth diagnosis of your data capabilities and receive specific recommendations.`
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setShowSubAssessmentPopup(false)}>
            {t('Fechar', 'Dismiss')}
          </Button>
          <Button
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
            disabled={!subAssessment}
            onClick={() => { setShowSubAssessmentPopup(false); navigate(`/sub-quiz/${subAssessment?.id}`); }}
          >
            {!subAssessment ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t('Iniciar Agora', 'Start Now')} <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20">
      {subAssessmentPopup}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center"><Brain className="w-4 h-4 text-white" /></div>
            <span className="font-bold text-sm">Oramix</span>
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Success header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('Avaliação Concluída!', 'Assessment Complete!')}</h1>
          <p className="text-muted-foreground">{t('Obrigado, ', 'Thank you, ')}{customer?.name || ''}. {t('A sua avaliação foi submetida com sucesso.', 'Your assessment has been submitted successfully.')}</p>
        </div>

        {/* Score card */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center flex-shrink-0">
              <div className="text-6xl font-black text-brand-blue">{assessment.global_score?.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">{t('Score Global /5.0', 'Global Score /5.0')}</div>
            </div>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <ScoreBadge score={assessment.global_score} lang={lang} size="lg" />
              <p className="text-sm text-muted-foreground">{lang === 'pt' ? maturity.recommendation_pt : maturity.recommendation_en}</p>
            </div>
          </div>
        </div>

        {/* Radar + pillar scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h3 className="font-semibold text-sm mb-3 text-center text-muted-foreground uppercase tracking-wide">{t('Radar de Maturidade', 'Maturity Radar')}</h3>
            <AssessmentRadar pillarScores={pillarScores} lang={lang} />
          </div>
          <div className="space-y-3">
            {pillarScores.map(ps => {
              const pillar = pillars.find(p => p.code === ps.code) || ps;
              return <PillarScoreCard key={ps.code} pillar={pillar} score={ps.score} lang={lang} />;
            })}
          </div>
        </div>

        {/* Review answers */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <button onClick={() => setShowReview(!showReview)} className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{t('Rever Respostas', 'Review Answers')}</span>
            </div>
            {showReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showReview && (
            <div className="border-t divide-y">
              {pillars.map(pillar => {
                const pqs = allQuestions.filter(q => q.pillar_code === pillar.code).sort((a, b) => a.order - b.order);
                const open = expandedPillar === pillar.code;
                return (
                  <div key={pillar.code}>
                    <button onClick={() => setExpandedPillar(open ? null : pillar.code)} className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50">
                      <span className="font-medium text-sm">{lang === 'en' ? (pillar.name_en || pillar.name_pt) : pillar.name_pt}</span>
                      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {open && (
                      <div className="px-5 pb-5 space-y-6 bg-slate-50/50">
                        {pqs.map(q => (
                          <QuestionCard key={q.id} question={q} value={answersMap[q.id]} lang={lang} readOnly />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sub-assessment CTA */}
        {needsSubAssessment && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Database className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground mb-1">
                  {t('Sub-Avaliação de Dados Recomendada', 'Data Sub-Assessment Recommended')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t(
                    `O seu pilar de Dados obteve um score de ${dataScore?.toFixed(1)}/5, abaixo de 2.5. Recomendamos a realização da Avaliação de Maturidade de Dados IA (8 dimensões · 39 perguntas) para um diagnóstico aprofundado.`,
                    `Your Data pillar scored ${dataScore?.toFixed(1)}/5, below 2.5. We recommend completing the Data AI Maturity Assessment (8 dimensions · 39 questions) for an in-depth diagnosis.`
                  )}
                </p>
                {subAssessment?.status === 'completed' ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-green-600 font-medium">✓ {t('Sub-avaliação concluída', 'Sub-assessment complete')}</span>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/sub-complete/${subAssessment.id}`)} className="gap-1.5">
                      {t('Ver resultados', 'View results')} <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => navigate(`/sub-quiz/${subAssessment?.id}`)}
                    disabled={!subAssessment}
                    className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 disabled:opacity-70"
                    size="sm"
                  >
                    {!subAssessment ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('A preparar...', 'Preparing...')}</>
                    ) : (
                      <>{t('Iniciar Sub-Avaliação de Dados', 'Start Data Sub-Assessment')} <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t('O relatório detalhado será preparado pela equipa Oramix e enviado para ', 'The detailed report will be prepared by the Oramix team and sent to ')}
          <strong>{customer?.email}</strong>.
        </p>
      </div>
    </div>
  );
}