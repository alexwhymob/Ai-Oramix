import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Sparkles, Plus, Trash2, Loader2, ChevronDown, ChevronUp, Settings2, CheckCircle2, Link as LinkIcon, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ScoreBadge from '@/components/ScoreBadge';
import { useCurrentUser } from '@/lib/useCurrentUser';
import AssessmentRadar from '@/components/AssessmentRadar';
import PillarScoreCard from '@/components/PillarScoreCard';
import SubAssessmentSummary from '@/components/SubAssessmentSummary';

export default function AdminAssessmentDetail() {
  const { id } = useParams();
  const { isAiConsultant } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expandedPillar, setExpandedPillar] = useState(null);
  const [expandedSubPillar, setExpandedSubPillar] = useState(null);
  const [noteForm, setNoteForm] = useState({ pillar_code: '', gap_description: '', mitigation: '', priority: 'medium', impact: 'medium', effort: 'medium' });
  const [addingNote, setAddingNote] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingField, setGeneratingField] = useState(null);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [resultLink, setResultLink] = useState(null);
  const [renewingResultLink, setRenewingResultLink] = useState(false);
  const ALL_SECTIONS = [
    { key: 'section_1', label: '1. Executive Summary' },
    { key: 'section_2', label: '2. Methodology' },
    { key: 'section_3', label: '3. Results by Pillar' },
    { key: 'section_4', label: '4. Maturity Radar' },
    { key: 'section_5', label: '5. Gap Map' },
    { key: 'section_6', label: '6. Quick Wins' },
    { key: 'section_7', label: '7. Roadmap' },
    { key: 'section_8', label: '8. Use Case Recommendations' },
    { key: 'section_9', label: '9. Next Steps' }
  ];
  const [selectedSections, setSelectedSections] = useState(ALL_SECTIONS.map((item) => item.key));

  const { data: assessment, refetch: refetchAssessment } = useQuery({ queryKey: ['assessment', id], queryFn: () => base44.entities.Assessment.get(id) });
  const { data: assessmentTemplate } = useQuery({
    queryKey: ['assessment-template', assessment?.assessment_template_id],
    queryFn: () => base44.entities.AssessmentTemplate.get(assessment.assessment_template_id),
    enabled: !!assessment?.assessment_template_id
  });
  const { data: customers = [] } = useQuery({ queryKey: ['customer_a', assessment?.customer_id], queryFn: () => base44.entities.Customer.filter({ id: assessment.customer_id }), enabled: !!assessment?.customer_id });
  const { data: pillars = [] } = useQuery({ queryKey: ['pillars'], queryFn: () => base44.entities.Pillar.list('order') });
  const { data: allQuestions = [] } = useQuery({ queryKey: ['questions'], queryFn: () => base44.entities.Question.list('order') });
  const { data: answers = [] } = useQuery({ queryKey: ['answers', id], queryFn: () => base44.entities.AssessmentAnswer.filter({ assessment_id: id }) });
  const { data: notes = [] } = useQuery({ queryKey: ['notes', id], queryFn: () => base44.entities.ConsultantNote.filter({ assessment_id: id }) });
  const { data: reports = [] } = useQuery({ queryKey: ['report', id], queryFn: () => base44.entities.Report.filter({ assessment_id: id }) });
  const { data: subAssessments = [] } = useQuery({ queryKey: ['sub_assessment', id], queryFn: () => base44.entities.Assessment.filter({ parent_assessment_id: id }) });
  const { data: subAnswersByAssessment = {} } = useQuery({
    queryKey: ['sub_answers', subAssessments.map((item) => item.id).join('|')],
    queryFn: async () => {
      const entries = await Promise.all(
        subAssessments.map(async (subAssessment) => {
          const answerList = await base44.entities.AssessmentAnswer.filter({ assessment_id: subAssessment.id });
          return [subAssessment.id, answerList];
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: subAssessments.length > 0
  });

  const customer = customers[0];
  const report = reports[0];
  const allPillarScores = useMemo(() => { try { return JSON.parse(assessment?.pillar_scores || '[]'); } catch { return []; } }, [assessment?.pillar_scores]);
  const pillarScores = useMemo(() => allPillarScores.filter((score) => !score.code.startsWith('ds_')), [allPillarScores]);
  const mainPillars = useMemo(() => {
    const available = pillars.filter((pillar) => pillar.assessment_type !== 'sub_assessment');
    if (assessment?.assessment_template_id) {
      return available.filter((pillar) => pillar.assessment_template_id === assessment.assessment_template_id);
    }
    return available.filter((pillar) => !pillar.assessment_template_id);
  }, [pillars, assessment?.assessment_template_id]);
  const mainQuestions = useMemo(() => {
    const pillarCodes = new Set(mainPillars.map((pillar) => pillar.code));
    return allQuestions.filter((question) => pillarCodes.has(question.pillar_code));
  }, [allQuestions, mainPillars]);
  const globalScore = useMemo(() => {
    if (!pillarScores.length) return assessment?.global_score;
    const totalWeight = pillarScores.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (!totalWeight) return assessment?.global_score;
    const weighted = pillarScores.reduce((sum, item) => sum + item.score * (item.weight / totalWeight), 0);
    return Math.round(weighted * 100) / 100;
  }, [pillarScores, assessment?.global_score]);
  const answersMap = useMemo(() => {
    const map = {};
    answers.forEach((answer) => {
      map[answer.question_id] = answer;
    });
    return map;
  }, [answers]);
  const getPillarLabel = (pillarCode) => {
    if (!pillarCode) return 'Detail';
    const pillar = pillars.find((item) => item.code === pillarCode);
    return pillar?.name_pt || pillar?.name_en || pillarCode;
  };
  const subAssessmentDetails = useMemo(() => subAssessments.map((subAssessment) => {
    let subPillarScores = [];
    try {
      subPillarScores = JSON.parse(subAssessment?.pillar_scores || '[]');
    } catch {
      subPillarScores = [];
    }

    const scoreCodes = new Set(subPillarScores.map((score) => score.code));
    const subPillars = pillars.filter((pillar) => {
      if (scoreCodes.size > 0) {
        return scoreCodes.has(pillar.code);
      }
      if (subAssessment.assessment_template_id) {
        return pillar.assessment_template_id === subAssessment.assessment_template_id;
      }
      return pillar.assessment_type === 'sub_assessment';
    });
    const subQuestions = allQuestions.filter((question) => subPillars.some((pillar) => pillar.code === question.pillar_code));
    const answerList = subAnswersByAssessment[subAssessment.id] || [];
    const subAnswersMap = {};
    answerList.forEach((answer) => {
      subAnswersMap[answer.question_id] = answer;
    });

    return { subAssessment, subPillars, subQuestions, subPillarScores, subAnswersMap };
  }), [subAssessments, pillars, allQuestions, subAnswersByAssessment]);

  const addNote = async () => {
    if (!noteForm.pillar_code || !noteForm.gap_description) return;
    await base44.entities.ConsultantNote.create({ ...noteForm, assessment_id: id });
    qc.invalidateQueries({ queryKey: ['notes', id] });
    setNoteForm({ pillar_code: '', gap_description: '', mitigation: '', priority: 'medium', impact: 'medium', effort: 'medium' });
    setAddingNote(false);
  };

  const deleteNote = async (noteId) => {
    await base44.entities.ConsultantNote.delete(noteId);
    qc.invalidateQueries({ queryKey: ['notes', id] });
  };

  const handleGenerateReport = async () => {
    setShowSectionPicker(false);
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateReport', { assessmentId: id, language: customer?.language || 'pt', sections: selectedSections });
      qc.invalidateQueries({ queryKey: ['report', id] });
      if (res.data?.reportId) {
        navigate(`/admin/report/${res.data.reportId}`);
        return;
      }
      toast.error('Report generation did not return a report ID.');
    } catch (error) {
      toast.error(error?.data?.message || error?.message || 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const generateWithAI = async (field) => {
    if (!noteForm.pillar_code) return;
    setGeneratingField(field);
    try {
      const pillar = pillars.find((item) => item.code === noteForm.pillar_code);
      const ps = pillarScores.find((item) => item.code === noteForm.pillar_code);
      const pillarAnswers = answers.filter((answer) => answer.pillar_code === noteForm.pillar_code);
      const pillarQs = allQuestions.filter((question) => question.pillar_code === noteForm.pillar_code);
      const qaContext = pillarQs.map((question) => {
        const answer = pillarAnswers.find((item) => item.question_id === question.id);
        return `- ${question.text_pt}: ${answer?.value ?? 'N/A'}/5 (${answer?.value ? question[`anchor_${answer.value}_pt`] : '—'})`;
      }).join('\n');
      const prompt = field === 'gap_description'
        ? `You are an AI readiness consultant. For the pillar "${pillar?.name_pt}" (score: ${ps?.score?.toFixed(2)}/5) of company "${customer?.company}" (sector: ${customer?.sector}), analyze these question scores and write a concise, professional gap description (2-3 sentences) identifying the main weaknesses:\n\n${qaContext}\n\nRespond only with the gap description text in Portuguese.`
        : `You are an AI readiness consultant. For the pillar "${pillar?.name_pt}" (score: ${ps?.score?.toFixed(2)}/5) of company "${customer?.company}", given this gap: "${noteForm.gap_description || 'General maturity gaps in this pillar'}", write 2-3 concrete mitigation measures as a short paragraph in Portuguese. Focus on practical, actionable steps.`;
      const result = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gpt-5.4' });
      setNoteForm((prev) => ({ ...prev, [field]: result }));
    } catch (error) {
      toast.error(error?.data?.message || error?.message || 'Failed to generate AI text.');
    } finally {
      setGeneratingField(null);
    }
  };

  const handleToggleReviewed = async () => {
    await base44.entities.Assessment.update(id, { reviewed_by_consultant: !assessment?.reviewed_by_consultant });
    refetchAssessment();
  };

  const handleRenewResultLink = async () => {
    setRenewingResultLink(true);
    try {
      const response = await base44.functions.invoke('quizSession', { action: 'renewResultAccess', assessmentId: id });
      const link = `${window.location.origin}/complete/${id}#access=${encodeURIComponent(response.data.resultToken)}`;
      setResultLink(link);
    } catch (error) {
      toast.error(error?.data?.message || error?.message || 'Unable to generate a results link.');
    } finally {
      setRenewingResultLink(false);
    }
  };

  const copyResultLink = async () => {
    await navigator.clipboard.writeText(resultLink);
    toast.success('Results link copied. It is valid for 30 days and can be used once.');
  };

  const priorityColor = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-green-400' };

  if (!assessment) return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="text-white/50 hover:text-white gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{customer?.company || 'Assessment'}</h1>
            <div className="text-xs text-white/40">{customer?.name} · {customer?.role} · {new Date(assessment.completed_at || assessment.created_date).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {report && !isAiConsultant && (
            <Link to={`/admin/report/${report.id}`}>
              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-1.5">
                <FileText className="w-3.5 h-3.5" /> View Report
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            onClick={handleToggleReviewed}
            variant="outline"
            className={assessment?.reviewed_by_consultant
              ? 'border-green-500/50 text-green-400 bg-green-500/10 hover:bg-green-500/20 gap-1.5'
              : 'border-white/20 text-white/50 hover:text-white hover:bg-white/10 gap-1.5'}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {assessment?.reviewed_by_consultant ? 'Reviewed ✓' : 'Mark as Reviewed'}
          </Button>
          {assessment.status === 'completed' && (
            <Button size="sm" onClick={handleRenewResultLink} disabled={renewingResultLink} variant="outline" className="border-blue-400/40 text-blue-300 hover:bg-blue-500/10 gap-1.5">
              {renewingResultLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
              New Results Link
            </Button>
          )}
          <Button size="sm" onClick={() => setShowSectionPicker(true)} disabled={generating} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating...' : report ? 'Regenerate Report' : 'Generate AI Report'}
          </Button>
        </div>
      </div>

      <Dialog open={showSectionPicker} onOpenChange={setShowSectionPicker}>
        <DialogContent className="bg-[#152233] border border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Settings2 className="w-4 h-4 text-blue-400" /> Select Sections to Generate</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40">{selectedSections.length} of {ALL_SECTIONS.length} selected</span>
              <div className="flex gap-3">
                <button onClick={() => setSelectedSections(ALL_SECTIONS.map((item) => item.key))} className="text-xs text-blue-400 hover:text-blue-300">All</button>
                <button onClick={() => setSelectedSections([])} className="text-xs text-white/40 hover:text-white/70">None</button>
              </div>
            </div>
            {ALL_SECTIONS.map((item) => (
              <label key={item.key} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                <input type="checkbox" checked={selectedSections.includes(item.key)} onChange={(event) => setSelectedSections((prev) => event.target.checked ? [...prev, item.key] : prev.filter((key) => key !== item.key))} className="w-4 h-4 accent-blue-500" />
                <span className="text-sm text-white/80">{item.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowSectionPicker(false)} className="text-white/50">Cancel</Button>
            <Button size="sm" onClick={handleGenerateReport} disabled={selectedSections.length === 0} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Generate {selectedSections.length} Section{selectedSections.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resultLink)} onOpenChange={(open) => !open && setResultLink(null)}>
        <DialogContent className="bg-[#152233] border border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">New results link</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60">Share this link only with the assessment respondent. It can be exchanged once for read-only access and expires in 30 days.</p>
          <textarea readOnly value={resultLink || ''} className="w-full min-h-24 bg-[#0f1d2e] border border-white/10 rounded-lg p-3 text-xs text-white/80 break-all" />
          <DialogFooter>
            <Button size="sm" onClick={copyResultLink} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"><Copy className="w-3.5 h-3.5" /> Copy link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {generating && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center text-blue-400 text-sm">
          <Sparkles className="w-4 h-4 inline mr-2 animate-pulse" />
          Generating AI report with OpenAI... This may take 30-60 seconds.
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-semibold uppercase tracking-widest text-white/30">Main Assessment</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#152233] border border-white/10 rounded-xl p-5 flex items-center gap-5">
          <div className="text-5xl font-black text-brand-blue">{globalScore?.toFixed(1)}</div>
          <div>
            <div className="text-white/40 text-xs mb-1">Global Score /5.0</div>
            <ScoreBadge score={globalScore} lang="en" size="lg" presetId={assessmentTemplate?.maturity_preset_id} />
          </div>
        </div>
        <div className="bg-[#152233] border border-white/10 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Maturity Radar</h3>
          <AssessmentRadar pillarScores={pillarScores} lang="en" dark />
        </div>
      </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {pillarScores.map((score) => {
            const pillar = mainPillars.find((item) => item.code === score.code) || score;
          return <PillarScoreCard key={score.code} pillar={pillar} score={score.score} lang="en" dark presetId={assessmentTemplate?.maturity_preset_id} />;
        })}
      </div>

      <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 text-sm font-semibold text-white/70">Answer Breakdown</div>
        <div className="divide-y divide-white/5">
          {mainPillars.map((pillar) => {
            const pillarQuestions = mainQuestions.filter((question) => question.pillar_code === pillar.code).sort((left, right) => left.order - right.order);
            const isOpen = expandedPillar === pillar.code;
            const pillarScore = pillarScores.find((score) => score.code === pillar.code);
            return (
              <div key={pillar.code}>
                <button onClick={() => setExpandedPillar(isOpen ? null : pillar.code)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">{pillar.name_pt}</span>
                    <span className="text-xs text-white/40">{pillar.weight}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-brand-blue">{pillarScore?.score?.toFixed(2) || '—'}/5</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 space-y-2">
                    {pillarQuestions.map((question) => {
                      const answer = answersMap[question.id];
                      const value = answer?.value;
                      const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
                      return (
                        <div key={question.id} className="flex gap-3 py-2 border-t border-white/5 first:border-0">
                          <span className="text-xs text-white/30 flex-shrink-0 pt-0.5 w-8">{question.code}</span>
                          <div className="flex-1">
                            <div className="text-xs text-white/70 mb-1">{question.text_pt}</div>
                            {value ? (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold" style={{ color: colors[value] }}>{value}</span>
                                <span className="text-xs text-white/40">{question[`anchor_${value}_pt`]}</span>
                              </div>
                            ) : <span className="text-xs text-white/20">Not answered</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {subAssessmentDetails.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-orange-500/20" />
            <span className="text-xs font-semibold uppercase tracking-widest text-orange-400/60">Sub-Assessments</span>
            <div className="h-px flex-1 bg-orange-500/20" />
          </div>

          {subAssessmentDetails.map(({ subAssessment, subPillars, subQuestions, subPillarScores, subAnswersMap }, index) => (
            <div key={subAssessment.id} className="space-y-4">
              {subAssessment.status !== 'completed' && (
                <div className="flex justify-end">
                  <span className="text-xs text-white/40">A secure invitation link is issued from the respondent results page.</span>
                </div>
              )}

              <SubAssessmentSummary
                subAssessment={subAssessment}
                title={`Sub-Assessment ${index + 1} - ${getPillarLabel(subAssessment.sub_assessment_for_pillar)}`}
                scoreLabel="Sub-Assessment Score /5.0"
              />

              {subAssessment.status === 'completed' && subPillarScores.length > 0 && (
                <div className="bg-[#152233] border border-orange-500/20 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-orange-400/60 uppercase tracking-wider mb-2">{`${getPillarLabel(subAssessment.sub_assessment_for_pillar)} Radar`}</h3>
                  <AssessmentRadar
                    pillarScores={subPillarScores.map((score) => ({
                      ...score,
                      name_pt: subPillars.find((pillar) => pillar.code === score.code)?.name_pt || score.code,
                      name_en: subPillars.find((pillar) => pillar.code === score.code)?.name_en || score.code
                    }))}
                    lang="pt"
                    dark
                  />
                </div>
              )}

              {subAssessment.status === 'completed' && subPillars.length > 0 && (
                <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/10 text-sm font-semibold text-white/70">{`${getPillarLabel(subAssessment.sub_assessment_for_pillar)} Answer Breakdown`}</div>
                  <div className="divide-y divide-white/5">
                    {subPillars.map((pillar) => {
                      const pillarQuestions = subQuestions.filter((question) => question.pillar_code === pillar.code).sort((left, right) => left.order - right.order);
                      const openKey = `${subAssessment.id}:${pillar.code}`;
                      const isOpen = expandedSubPillar === openKey;
                      const pillarScore = subPillarScores.find((score) => score.code === pillar.code);
                      return (
                        <div key={openKey}>
                          <button onClick={() => setExpandedSubPillar(isOpen ? null : openKey)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-white">{pillar.name_pt}</span>
                              {pillar.weight && <span className="text-xs text-white/40">{pillar.weight}%</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-orange-400">{pillarScore?.score?.toFixed(2) || '—'}/5</span>
                              {isOpen ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                            </div>
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-4 space-y-2">
                              {pillarQuestions.map((question) => {
                                const answer = subAnswersMap[question.id];
                                const value = answer?.value;
                                const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
                                return (
                                  <div key={question.id} className="flex gap-3 py-2 border-t border-white/5 first:border-0">
                                    <span className="text-xs text-white/30 flex-shrink-0 pt-0.5 w-8">{question.code}</span>
                                    <div className="flex-1">
                                      <div className="text-xs text-white/70 mb-1">{question.text_pt}</div>
                                      {value ? (
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg font-bold" style={{ color: colors[value] }}>{value}</span>
                                          <span className="text-xs text-white/40">{question[`anchor_${value}_pt`]}</span>
                                        </div>
                                      ) : <span className="text-xs text-white/20">Not answered</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/70">Consultant Notes &amp; Gap Analysis</span>
          <Button size="sm" variant="ghost" onClick={() => setAddingNote(!addingNote)} className="text-blue-400 hover:text-blue-300 gap-1.5 h-7">
            <Plus className="w-3.5 h-3.5" /> Add Note
          </Button>
        </div>

        {addingNote && (
          <div className="p-5 border-b border-white/10 space-y-3 bg-[#0f1d2e]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Pillar</label>
                <Select value={noteForm.pillar_code} onValueChange={(value) => setNoteForm((prev) => ({ ...prev, pillar_code: value }))}>
                  <SelectTrigger className="bg-[#152233] border-white/10 text-white h-8 text-xs"><SelectValue placeholder="Select pillar" /></SelectTrigger>
                  <SelectContent>{pillars.map((pillar) => <SelectItem key={pillar.code} value={pillar.code}>{pillar.name_pt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Priority</label>
                <Select value={noteForm.priority} onValueChange={(value) => setNoteForm((prev) => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="bg-[#152233] border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-white/40">Gap Description *</label>
                <button onClick={() => generateWithAI('gap_description')} disabled={!noteForm.pillar_code || generatingField === 'gap_description'} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {generatingField === 'gap_description' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {generatingField === 'gap_description' ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
              <textarea value={noteForm.gap_description} onChange={(event) => setNoteForm((prev) => ({ ...prev, gap_description: event.target.value }))} className="w-full bg-[#152233] border border-white/10 rounded-lg p-2.5 text-sm text-white/80 resize-none h-20 focus:outline-none focus:border-blue-500/50" placeholder="Describe the identified gap..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-white/40">Mitigation Measures</label>
                <button onClick={() => generateWithAI('mitigation')} disabled={!noteForm.pillar_code || generatingField === 'mitigation'} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {generatingField === 'mitigation' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {generatingField === 'mitigation' ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
              <textarea value={noteForm.mitigation} onChange={(event) => setNoteForm((prev) => ({ ...prev, mitigation: event.target.value }))} className="w-full bg-[#152233] border border-white/10 rounded-lg p-2.5 text-sm text-white/80 resize-none h-20 focus:outline-none focus:border-blue-500/50" placeholder="Proposed mitigation actions..." />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAddingNote(false)} className="text-white/50">Cancel</Button>
              <Button size="sm" onClick={addNote} disabled={!noteForm.pillar_code || !noteForm.gap_description} className="bg-blue-500 hover:bg-blue-600 text-white">Save Note</Button>
            </div>
          </div>
        )}

        <div className="divide-y divide-white/5">
          {notes.map((note) => {
            const pillar = pillars.find((item) => item.code === note.pillar_code);
            return (
              <div key={note.id} className="px-5 py-4 flex gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-white/70">{pillar?.name_pt || note.pillar_code}</span>
                    <span className={`text-xs font-medium ${priorityColor[note.priority]}`}>● {note.priority}</span>
                  </div>
                  <p className="text-sm text-white/80 mb-1">{note.gap_description}</p>
                  {note.mitigation && <p className="text-xs text-white/50 bg-white/5 rounded-lg p-2.5">{note.mitigation}</p>}
                </div>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-white/30 hover:text-red-400 flex-shrink-0" onClick={() => deleteNote(note.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
          {notes.length === 0 && <div className="px-5 py-6 text-center text-white/25 text-sm">No notes yet. Add observations and gap analysis above.</div>}
        </div>
      </div>
    </div>
  );
}
