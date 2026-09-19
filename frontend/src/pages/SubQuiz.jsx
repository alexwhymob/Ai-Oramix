import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Brain, ChevronLeft, ChevronRight, Send, AlertCircle, Loader2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QuestionCard from '@/components/QuestionCard';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/useLanguage';
import { calculateScores } from '@/lib/scoring';
import { useMaturityData } from '@/lib/useMaturity';
import { base44 } from '@/api/base44Client';

export default function SubQuiz() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [currentPillarIdx, setCurrentPillarIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [customer, setCustomer] = useState(null);
  const [subAssessment, setSubAssessment] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const draftTimer = useRef(null);
  const accessToken = useMemo(() => new URLSearchParams(window.location.hash.slice(1)).get('access'), []);

  const { resolveLevel } = useMaturityData();

  const t = (pt, en) => lang === 'pt' ? pt : en;
  const subTemplateId = subAssessment?.assessment_template_id || null;

  const { data: allPillars = [] } = useQuery({
    queryKey: ['sub_pillars', subTemplateId],
    queryFn: () => base44.entities.Pillar.list('order'),
    enabled: !!subTemplateId,
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['all_questions', subTemplateId],
    queryFn: () => base44.entities.Question.list('order'),
    enabled: !!subTemplateId,
  });
  const { data: assessmentTemplate } = useQuery({
    queryKey: ['assessment-template', subTemplateId],
    queryFn: () => base44.entities.AssessmentTemplate.get(subTemplateId),
    enabled: !!subTemplateId
  });

  const pillars = useMemo(() => {
    if (!subTemplateId) return [];
    return allPillars.filter((pillar) => pillar.assessment_template_id === subTemplateId);
  }, [allPillars, subTemplateId]);
  const questions = useMemo(() => {
    const pillarCodes = new Set(pillars.map((pillar) => pillar.code));
    return allQuestions.filter((question) => pillarCodes.has(question.pillar_code));
  }, [allQuestions, pillars]);

  useEffect(() => {
    if (!assessmentId || !accessToken || !Object.keys(answers).length) return;
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const draftAnswers = Object.entries(answers).map(([questionId, value]) => {
        const question = allQuestions.find((item) => item.id === questionId);
        return { assessment_id: assessmentId, question_id: questionId, question_code: question?.code, pillar_code: question?.pillar_code, value };
      });
      base44.functions.invoke('quizSession', { action: 'saveDraft', assessmentId, accessToken, answers: draftAnswers }).catch(() => {});
    }, 750);
    return () => clearTimeout(draftTimer.current);
  }, [answers, assessmentId, accessToken, allQuestions]);

  useEffect(() => {
    if (!assessmentId || !accessToken) return;
    base44.functions.invoke('quizSession', { action: 'loadSub', assessmentId, accessToken })
      .then(res => {
        setSubAssessment(res.data.assessment);
        setCustomer(res.data.customer);
        if (res.data.existingAnswers?.length) {
          const answerMap = {};
          res.data.existingAnswers.forEach((answer) => {
            answerMap[answer.question_id] = answer.value;
          });
          setAnswers(answerMap);
        }
        setLoadingSession(false);
      })
      .catch(() => setLoadingSession(false));
  }, [assessmentId, accessToken]);

  const currentPillar = pillars[currentPillarIdx];
  const pillarQuestions = useMemo(() => questions.filter(q => q.pillar_code === currentPillar?.code).sort((a, b) => a.order - b.order), [questions, currentPillar]);
  const totalAnswered = questions.filter(q => answers[q.id] > 0).length;
  const progressPct = questions.length > 0 ? Math.round((totalAnswered / questions.length) * 100) : 0;
  const pillarAnswered = pillarQuestions.filter(q => answers[q.id] > 0).length;
  const allAnswered = totalAnswered === questions.length && questions.length > 0;

  const handleSubmit = async () => {
    if (!allAnswered) { setShowValidation(true); return; }
    setSubmitting(true);
    const { pillarScores, globalScore } = calculateScores(pillars, questions, answers);
    const maturity = resolveLevel(globalScore, assessmentTemplate?.maturity_preset_id);
    const answerRecords = Object.entries(answers).map(([questionId, value]) => {
      const q = questions.find(q => q.id === questionId);
      return { assessment_id: assessmentId, question_id: questionId, question_code: q?.code, pillar_code: q?.pillar_code, value };
    });
    await base44.functions.invoke('quizSession', {
      action: 'submitSub',
      assessmentId,
      accessToken,
      answers: answerRecords,
      globalScore,
      maturityLevel: maturity.key,
      pillarScores,
    });
    navigate(`/sub-complete/${assessmentId}`);
  };

  if (loadingSession || !subAssessment || !pillars.length || !questions.length) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-blue" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-foreground flex items-center gap-1">
                <Database className="w-3 h-3 text-orange-500" />
                {t('Avaliação de Dados IA', 'Data AI Assessment')}
              </div>
              <div className="text-[10px] text-muted-foreground">{customer?.company}</div>
            </div>
          </div>
          <div className="flex-1 max-w-sm">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{t('Progresso', 'Progress')}</span>
              <span>{totalAnswered}/{questions.length}</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
          <LanguageToggle />
        </div>
      </header>

      {/* Intro banner */}
      <div className="bg-orange-50 border-b border-orange-100">
        <div className="max-w-3xl mx-auto px-4 py-2 text-xs text-orange-700 text-center">
          {t('Sub-avaliação específica de Maturidade de Dados — ', 'Data Maturity sub-assessment — ')}
          <strong>{t('8 dimensões · 39 perguntas', '8 dimensions · 39 questions')}</strong>
        </div>
      </div>

      {/* Pillar tabs */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto py-2 scrollbar-hide">
          {pillars.map((p, i) => {
            const pQs = questions.filter(q => q.pillar_code === p.code);
            const pAnswered = pQs.filter(q => answers[q.id] > 0).length;
            const complete = pAnswered === pQs.length && pQs.length > 0;
            return (
              <button
                key={p.code}
                onClick={() => { setCurrentPillarIdx(i); window.scrollTo(0, 0); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  i === currentPillarIdx ? 'bg-orange-500 text-white' : complete ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {complete && <span>✓</span>}
                <span className="hidden sm:inline">{lang === 'en' ? (p.name_en || p.name_pt) : p.name_pt}</span>
                <span className="sm:hidden">{i + 1}</span>
                <span className="opacity-60">{pAnswered}/{pQs.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {currentPillar && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-medium text-orange-500 uppercase tracking-wider">{t('Dimensão', 'Dimension')} {currentPillarIdx + 1} {t('de', 'of')} {pillars.length}</span>

            </div>
            <h2 className="text-2xl font-bold text-foreground">{lang === 'en' ? (currentPillar.name_en || currentPillar.name_pt) : currentPillar.name_pt}</h2>
            {currentPillar.description_pt && (
              <p className="text-muted-foreground text-sm mt-1">{lang === 'en' ? (currentPillar.description_en || currentPillar.description_pt) : currentPillar.description_pt}</p>
            )}
          </div>
        )}

        <div className="space-y-8">
          {(() => {
            const offset = pillars.slice(0, currentPillarIdx).reduce((sum, p) => sum + questions.filter(q => q.pillar_code === p.code).length, 0);
            return pillarQuestions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-2xl border p-6 shadow-sm">
              <QuestionCard
                question={q}
                value={answers[q.id]}
                onChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                lang={lang}
                questionNumber={offset + idx + 1}
              />
            </div>
            ));
          })()}
        </div>

        {showValidation && !allAnswered && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('Por favor responda a todas as perguntas antes de submeter.', 'Please answer all questions before submitting.')}
              {' '}({questions.length - totalAnswered} {t('em falta', 'remaining')})
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button variant="outline" onClick={() => { setCurrentPillarIdx(p => Math.max(0, p - 1)); window.scrollTo(0, 0); }} disabled={currentPillarIdx === 0} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            {t('Anterior', 'Previous')}
          </Button>
          <span className="text-sm text-muted-foreground">{pillarAnswered}/{pillarQuestions.length} {t('respondidas', 'answered')}</span>
          {currentPillarIdx < pillars.length - 1 ? (
            <Button onClick={() => { setCurrentPillarIdx(p => p + 1); window.scrollTo(0, 0); }} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
              {t('Próximo', 'Next')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('Submeter Sub-Avaliação', 'Submit Sub-Assessment')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
