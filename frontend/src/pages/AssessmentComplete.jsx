import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  RotateCcw,
  Brain,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertTriangle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScoreBadge from '@/components/ScoreBadge';
import AssessmentRadar from '@/components/AssessmentRadar';
import PillarScoreCard from '@/components/PillarScoreCard';
import QuestionCard from '@/components/QuestionCard';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/useLanguage';
import { useMaturityData } from '@/lib/useMaturity';
import { base44 } from '@/api/base44Client';

export default function AssessmentComplete() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [showReview, setShowReview] = useState(false);
  const [expandedPillar, setExpandedPillar] = useState(null);
  const [showScrollPopup, setShowScrollPopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const t = (pt, en) => (lang === 'pt' ? pt : en);
  const { resolveLevel } = useMaturityData();

  const { data: resultData } = useQuery({
    queryKey: ['quiz_result', assessmentId],
    queryFn: () => base44.functions.invoke('quizSession', { action: 'getResult', assessmentId }).then((response) => response.data),
    enabled: !!assessmentId
  });

  const assessment = resultData?.assessment;
  const customer = resultData?.customer;
  const answers = resultData?.answers || [];
  const templateId = assessment?.assessment_template_id || null;

  const { data: allPillars = [] } = useQuery({
    queryKey: ['pillars'],
    queryFn: () => base44.entities.Pillar.list('order')
  });

  const pillars = useMemo(() => {
    const mainPillars = allPillars.filter((pillar) => pillar.assessment_type !== 'sub_assessment');

    if (templateId) {
      return mainPillars.filter((pillar) => pillar.assessment_template_id === templateId);
    }

    return mainPillars.filter((pillar) => !pillar.assessment_template_id);
  }, [allPillars, templateId]);

  const { data: assessmentTemplate } = useQuery({
    queryKey: ['assessment-template', templateId],
    queryFn: () => base44.entities.AssessmentTemplate.get(templateId),
    enabled: !!templateId
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list('order')
  });

  const mainQuestions = useMemo(() => {
    const pillarCodes = new Set(pillars.map((pillar) => pillar.code));
    return allQuestions.filter((question) => pillarCodes.has(question.pillar_code));
  }, [allQuestions, pillars]);

  const pillarScores = useMemo(() => {
    try {
      return JSON.parse(assessment?.pillar_scores || '[]');
    } catch {
      return [];
    }
  }, [assessment?.pillar_scores]);

  const maturity = resolveLevel(assessment?.global_score, assessmentTemplate?.maturity_preset_id);
  const answersMap = useMemo(() => {
    const map = {};
    answers.forEach((answer) => {
      map[answer.question_id] = answer.value;
    });
    return map;
  }, [answers]);

  const { data: subData } = useQuery({
    queryKey: ['sub_assessments', assessmentId],
    queryFn: () => base44.functions.invoke('quizSession', { action: 'getSubAssessments', assessmentId }).then((response) => response.data),
    enabled: !!assessmentId && !!assessment,
    refetchInterval: (query) => {
      const pending = query?.state?.data?.subAssessments?.some((item) => item.status !== 'completed');
      return pending ? 5000 : false;
    },
    refetchOnWindowFocus: true
  });

  const subAssessments = subData?.subAssessments || [];
  const pendingSubAssessments = subAssessments.filter((item) => item.status !== 'completed');
  const popupSubAssessment = pendingSubAssessments[0] || null;

  const popupPillar = allPillars.find((pillar) => pillar.code === popupSubAssessment?.sub_assessment_for_pillar);
  const popupPillarName = popupPillar
    ? (lang === 'en' ? (popupPillar.name_en || popupPillar.name_pt) : popupPillar.name_pt)
    : popupSubAssessment?.sub_assessment_for_pillar;

  useEffect(() => {
    if (!popupSubAssessment || popupDismissed) return undefined;

    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowScrollPopup(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [popupSubAssessment, popupDismissed]);

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">Oramix</span>
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('Avaliacao concluida!', 'Assessment complete!')}</h1>
          <p className="text-muted-foreground">
            {t('Obrigado, ', 'Thank you, ')}
            {customer?.name || ''}
            . {t('A sua avaliacao foi submetida com sucesso.', 'Your assessment has been submitted successfully.')}
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center flex-shrink-0">
              <div className="text-6xl font-black text-brand-blue">{assessment.global_score?.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">{t('Score global /5.0', 'Global score /5.0')}</div>
            </div>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <ScoreBadge score={assessment.global_score} lang={lang} size="lg" presetId={assessmentTemplate?.maturity_preset_id} />
              <p className="text-sm text-muted-foreground">
                {lang === 'pt' ? maturity.recommendation_pt : maturity.recommendation_en}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h3 className="font-semibold text-sm mb-3 text-center text-muted-foreground uppercase tracking-wide">
              {t('Radar de maturidade', 'Maturity radar')}
            </h3>
            <AssessmentRadar pillarScores={pillarScores} lang={lang} />
          </div>
          <div className="space-y-3">
            {pillarScores.map((score) => {
              const pillar = pillars.find((item) => item.code === score.code) || score;
              return <PillarScoreCard key={score.code} pillar={pillar} score={score.score} lang={lang} presetId={assessmentTemplate?.maturity_preset_id} />;
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
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
                const pillarQuestions = mainQuestions
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

        {subAssessments.length > 0 && (
          <div className="mt-6 space-y-4">
            {subAssessments.map((subAssessment) => {
              const pillar = allPillars.find((item) => item.code === subAssessment.sub_assessment_for_pillar);
              const pillarName = pillar
                ? (lang === 'en' ? (pillar.name_en || pillar.name_pt) : pillar.name_pt)
                : subAssessment.sub_assessment_for_pillar;
              const isCompleted = subAssessment.status === 'completed';
              const isInProgress = subAssessment.status === 'in_progress';

              return (
                <div
                  key={subAssessment.id}
                  className={`rounded-2xl border-2 p-6 ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-300'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {!isCompleted ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">
                          {t('Proximo passo recomendado', 'Recommended next step')}
                        </span>
                      </div>
                    ) : <div />}

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isCompleted
                          ? 'bg-green-100 text-green-700'
                          : isInProgress
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCompleted ? 'bg-green-500' : isInProgress ? 'bg-orange-500' : 'bg-slate-400'
                        }`}
                      />
                      {isCompleted ? t('Concluida', 'Completed') : isInProgress ? t('Em curso', 'In progress') : t('Por iniciar', 'Not started')}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-foreground mb-1">
                    {isCompleted
                      ? t(`Sub-avaliacao de ${pillarName} concluida`, `${pillarName} sub-assessment completed`)
                      : t(`Sub-avaliacao aprofundada: ${pillarName}`, `In-depth sub-assessment: ${pillarName}`)}
                  </h3>

                  <p className="text-sm text-muted-foreground mb-4">
                    {isCompleted
                      ? t(
                          'Consulte os resultados detalhados desta sub-avaliacao para conhecer as recomendacoes especificas desta area.',
                          'View the detailed results of this sub-assessment to see the specific recommendations for this area.'
                        )
                      : t(
                          `A avaliacao principal identificou oportunidades de melhoria em ${pillarName}. Esta sub-avaliacao aprofunda o diagnostico e ajuda-nos a produzir recomendacoes mais concretas e priorizadas.`,
                          `The main assessment identified improvement opportunities in ${pillarName}. This sub-assessment deepens the diagnosis and helps us produce more concrete, prioritized recommendations.`
                        )}
                  </p>

                  {isCompleted ? (
                    <Button variant="outline" onClick={() => navigate(`/sub-complete/${subAssessment.id}`)} className="gap-1.5">
                      {t('Ver resultados detalhados', 'View detailed results')} <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button onClick={() => navigate(`/sub-quiz/${subAssessment.id}`)} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
                      {t(`Iniciar sub-avaliacao de ${pillarName}`, `Start ${pillarName} sub-assessment`)} <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t(
            'O relatorio detalhado sera preparado pela equipa Oramix e enviado para ',
            'The detailed report will be prepared by the Oramix team and sent to '
          )}
          <strong>{customer?.email}</strong>.
        </p>
      </div>

      {showScrollPopup && !popupDismissed && popupSubAssessment && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white border-2 border-orange-400 rounded-2xl shadow-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground leading-tight">
                {t(`Sub-avaliacao de ${popupPillarName} por concluir`, `${popupPillarName} sub-assessment pending`)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('Complete para obter recomendacoes mais precisas.', 'Complete it to get more precise recommendations.')}
              </p>
            </div>
            <Button size="sm" onClick={() => navigate(`/sub-quiz/${popupSubAssessment.id}`)} className="bg-orange-500 hover:bg-orange-600 text-white gap-1 flex-shrink-0">
              {t('Iniciar', 'Start')} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
            <button
              onClick={() => {
                setShowScrollPopup(false);
                setPopupDismissed(true);
              }}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
