import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Brain, ChevronLeft, ChevronRight, Send, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QuestionCard from '@/components/QuestionCard';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/useLanguage';
import { calculateScores, getMaturityLevel } from '@/lib/scoring';
import { base44 } from '@/api/base44Client';

export default function Quiz() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [currentPillarIdx, setCurrentPillarIdx] = useState(0);
  const [answers, setAnswers] = useState(() => { try { return JSON.parse(localStorage.getItem(`quiz_${token}`) || '{}'); } catch { return {}; } });
  const [customer, setCustomer] = useState(null);
  const [assessmentId, setAssessmentId] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const { data: allPillars = [] } = useQuery({
    queryKey: ['pillars'],
    queryFn: () => base44.entities.Pillar.list('order'),
  });
  const pillars = useMemo(() => {
    const mainPillars = allPillars.filter(
      pillar => !pillar.code.startsWith('ds_') && pillar.assessment_type !== 'sub_assessment'
    );

    if (templateId) {
      return mainPillars.filter(pillar => pillar.assessment_template_id === templateId);
    }

    return mainPillars.filter(pillar => !pillar.assessment_template_id);
  }, [allPillars, templateId]);

  const { data: rawQuestions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list('order'),
  });
  const allQuestions = useMemo(() => {
    const pillarCodes = new Set(pillars.map(pillar => pillar.code));
    return rawQuestions.filter(question => pillarCodes.has(question.pillar_code));
  }, [rawQuestions, pillars]);

  useEffect(() => {
    if (!token) return;
    base44.functions.invoke('quizSession', { action: 'load', token })
      .then(res => {
        const { customer, assessment, existingAnswers } = res.data;
        setCustomer(customer);
        if (assessment.assessment_template_id) {
          setTemplateId(assessment.assessment_template_id);
        }
        if (assessment.status === 'completed') {
          navigate(`/complete/${assessment.id}`);
          return;
        }
        setAssessmentId(assessment.id);
        if (existingAnswers?.length) {
          const m = {};
          existingAnswers.forEach(a => { m[a.question_id] = a.value; });
          setAnswers(prev => ({ ...m, ...prev }));
        }
        setLoadingSession(false);
      })
      .catch(() => {
        setSessionError(true);
        setLoadingSession(false);
      });
  }, [token]);

  useEffect(() => {
    localStorage.setItem(`quiz_${token}`, JSON.stringify(answers));
  }, [answers, token]);

  const currentPillar = pillars[currentPillarIdx];
  const pillarQuestions = useMemo(() => allQuestions.filter(q => q.pillar_code === currentPillar?.code).sort((a, b) => a.order - b.order), [allQuestions, currentPillar]);
  const totalAnswered = allQuestions.filter(q => answers[q.id] > 0).length;
  const progressPct = allQuestions.length > 0 ? Math.round((totalAnswered / allQuestions.length) * 100) : 0;
  const pillarAnswered = pillarQuestions.filter(q => answers[q.id] > 0).length;
  const allAnswered = totalAnswered === allQuestions.length && allQuestions.length > 0;

  const t = (pt, en) => lang === 'pt' ? pt : en;

  const handleSubmit = async () => {
    if (!allAnswered) { setShowValidation(true); return; }
    if (!assessmentId) return;
    setSubmitting(true);
    const { pillarScores, globalScore } = calculateScores(pillars, allQuestions, answers);
    const maturity = getMaturityLevel(globalScore);
    const answerRecords = Object.entries(answers).map(([questionId, value]) => {
      const q = allQuestions.find(q => q.id === questionId);
      return { assessment_id: assessmentId, question_id: questionId, question_code: q?.code, pillar_code: q?.pillar_code, value };
    });
    await base44.functions.invoke('quizSession', {
      action: 'submit',
      assessmentId,
      answers: answerRecords,
      globalScore,
      maturityLevel: maturity.key,
      pillarScores,
    });
    // Trigger sub-assessment creation if data pillar score < 2.5
    const dataScore = pillarScores.find(p => p.code === 'dados')?.score;
    if (dataScore !== undefined && dataScore < 2.5) {
      await base44.functions.invoke('createDataSubAssessment', { event: { entity_id: assessmentId } });
    }
    localStorage.removeItem(`quiz_${token}`);
    navigate(`/complete/${assessmentId}`);
  };

  if (loadingSession) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-blue" /></div>;
  }

  if (sessionError || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center p-8 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('Link inválido', 'Invalid link')}</h2>
          <p className="text-muted-foreground text-sm mb-4">{t('Este QR code não é válido ou já expirou.', 'This QR code is not valid or has expired.')}</p>
          <Button onClick={() => navigate('/')} variant="outline">{t('Voltar ao início', 'Back to home')}</Button>
        </div>
      </div>
    );
  }

  if (!pillars.length || !allQuestions.length) {
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
              <div className="text-xs font-bold text-foreground">Oramix</div>
              <div className="text-[10px] text-muted-foreground">{customer?.company}</div>
            </div>
          </div>
          <div className="flex-1 max-w-sm">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{t('Progresso', 'Progress')}</span>
              <span>{totalAnswered}/{allQuestions.length}</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
          <LanguageToggle />
        </div>
      </header>

      {/* Pillar tabs */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto py-2 scrollbar-hide">
          {pillars.map((p, i) => {
            const pQs = allQuestions.filter(q => q.pillar_code === p.code);
            const pAnswered = pQs.filter(q => answers[q.id] > 0).length;
            const complete = pAnswered === pQs.length && pQs.length > 0;
            return (
              <button
                key={p.code}
                onClick={() => { setCurrentPillarIdx(i); window.scrollTo(0, 0); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  i === currentPillarIdx ? 'bg-blue-500 text-white' : complete ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
              <span className="text-xs font-medium text-blue-500 uppercase tracking-wider">{t('Pilar', 'Pillar')} {currentPillarIdx + 1} {t('de', 'of')} {pillars.length}</span>

            </div>
            <h2 className="text-2xl font-bold text-foreground">{lang === 'en' ? (currentPillar.name_en || currentPillar.name_pt) : currentPillar.name_pt}</h2>
            {currentPillar.description_pt && (
              <p className="text-muted-foreground text-sm mt-1">{lang === 'en' ? (currentPillar.description_en || currentPillar.description_pt) : currentPillar.description_pt}</p>
            )}
          </div>
        )}

        <div className="space-y-8">
          {(() => {
            const offset = pillars.slice(0, currentPillarIdx).reduce((sum, p) => sum + allQuestions.filter(q => q.pillar_code === p.code).length, 0);
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
              {' '}({allQuestions.length - totalAnswered} {t('em falta', 'remaining')})
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button variant="outline" onClick={() => { setCurrentPillarIdx(p => Math.max(0, p - 1)); window.scrollTo(0, 0); }} disabled={currentPillarIdx === 0} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            {t('Anterior', 'Previous')}
          </Button>

          <span className="text-sm text-muted-foreground">
            {pillarAnswered}/{pillarQuestions.length} {t('respondidas', 'answered')}
          </span>

          {currentPillarIdx < pillars.length - 1 ? (
            <Button onClick={() => { setCurrentPillarIdx(p => p + 1); window.scrollTo(0, 0); }} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
              {t('Próximo', 'Next')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('Submeter Avaliação', 'Submit Assessment')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
