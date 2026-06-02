import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Sparkles, Plus, Trash2, Loader2, ChevronDown, ChevronUp, Settings2, Database, CheckCircle2 } from 'lucide-react';
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
  const ALL_SECTIONS = [
    { key: 'section_1', label: '1. Executive Summary' },
    { key: 'section_2', label: '2. Methodology' },
    { key: 'section_3', label: '3. Results by Pillar' },
    { key: 'section_4', label: '4. Maturity Radar' },
    { key: 'section_5', label: '5. Gap Map' },
    { key: 'section_6', label: '6. Quick Wins' },
    { key: 'section_7', label: '7. Roadmap' },
    { key: 'section_8', label: '8. Use Case Recommendations' },
    { key: 'section_9', label: '9. Next Steps' },
  ];
  const [selectedSections, setSelectedSections] = useState(ALL_SECTIONS.map(s => s.key));

  const { data: assessment, refetch: refetchAssessment } = useQuery({ queryKey: ['assessment', id], queryFn: () => base44.entities.Assessment.get(id) });
  const { data: customers = [] } = useQuery({ queryKey: ['customer_a', assessment?.customer_id], queryFn: () => base44.entities.Customer.filter({ id: assessment.customer_id }), enabled: !!assessment?.customer_id });
  const { data: pillars = [] } = useQuery({ queryKey: ['pillars'], queryFn: () => base44.entities.Pillar.list('order') });
  const { data: allQuestions = [] } = useQuery({ queryKey: ['questions'], queryFn: () => base44.entities.Question.list('order') });
  const { data: answers = [] } = useQuery({ queryKey: ['answers', id], queryFn: () => base44.entities.AssessmentAnswer.filter({ assessment_id: id }) });
  const { data: notes = [] } = useQuery({ queryKey: ['notes', id], queryFn: () => base44.entities.ConsultantNote.filter({ assessment_id: id }) });
  const { data: reports = [] } = useQuery({ queryKey: ['report', id], queryFn: () => base44.entities.Report.filter({ assessment_id: id }) });
  const { data: subAssessments = [] } = useQuery({ queryKey: ['sub_assessment', id], queryFn: () => base44.entities.Assessment.filter({ parent_assessment_id: id }) });
  const subAssessment = subAssessments[0];
  const { data: subAnswers = [] } = useQuery({ queryKey: ['sub_answers', subAssessment?.id], queryFn: () => base44.entities.AssessmentAnswer.filter({ assessment_id: subAssessment.id }), enabled: !!subAssessment?.id });

  const customer = customers[0];
  const report = reports[0];
  const allPillarScores = useMemo(() => { try { return JSON.parse(assessment?.pillar_scores || '[]'); } catch { return []; } }, [assessment?.pillar_scores]);
  const pillarScores = useMemo(() => allPillarScores.filter(ps => !ps.code.startsWith('ds_')), [allPillarScores]);
  const mainPillars = useMemo(() => pillars.filter(p => !p.code.startsWith('ds_')), [pillars]);
  const mainQuestions = useMemo(() => allQuestions.filter(q => !q.pillar_code.startsWith('ds_')), [allQuestions]);
  const dsPillars = useMemo(() => pillars.filter(p => p.code.startsWith('ds_')), [pillars]);
  const dsQuestions = useMemo(() => allQuestions.filter(q => q.pillar_code.startsWith('ds_')), [allQuestions]);
  const subPillarScores = useMemo(() => { try { return JSON.parse(subAssessment?.pillar_scores || '[]'); } catch { return []; } }, [subAssessment?.pillar_scores]);
  const subAnswersMap = useMemo(() => { const m = {}; subAnswers.forEach(a => { m[a.question_id] = a; }); return m; }, [subAnswers]);
  // Recalculate global score from filtered pillar scores (normalised by actual weight sum)
  const globalScore = useMemo(() => {
    if (!pillarScores.length) return assessment?.global_score;
    const totalWeight = pillarScores.reduce((s, p) => s + (p.weight || 0), 0);
    if (!totalWeight) return assessment?.global_score;
    const weighted = pillarScores.reduce((s, p) => s + p.score * (p.weight / totalWeight), 0);
    return Math.round(weighted * 100) / 100;
  }, [pillarScores, assessment?.global_score]);
  const answersMap = useMemo(() => { const m = {}; answers.forEach(a => { m[a.question_id] = a; }); return m; }, [answers]);

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
    const pillar = pillars.find(p => p.code === noteForm.pillar_code);
    const ps = pillarScores.find(p => p.code === noteForm.pillar_code);
    const pillarAnswers = answers.filter(a => a.pillar_code === noteForm.pillar_code);
    const pillarQs = allQuestions.filter(q => q.pillar_code === noteForm.pillar_code);
    const qaContext = pillarQs.map(q => {
      const ans = pillarAnswers.find(a => a.question_id === q.id);
      return `- ${q.text_pt}: ${ans?.value ?? 'N/A'}/5 (${ans?.value ? q[`anchor_${ans.value}_pt`] : '—'})`;
    }).join('\n');
    const prompt = field === 'gap_description'
      ? `You are an AI readiness consultant. For the pillar "${pillar?.name_pt}" (score: ${ps?.score?.toFixed(2)}/5) of company "${customer?.company}" (sector: ${customer?.sector}), analyze these question scores and write a concise, professional gap description (2-3 sentences) identifying the main weaknesses:\n\n${qaContext}\n\nRespond only with the gap description text in Portuguese.`
      : `You are an AI readiness consultant. For the pillar "${pillar?.name_pt}" (score: ${ps?.score?.toFixed(2)}/5) of company "${customer?.company}", given this gap: "${noteForm.gap_description || 'General maturity gaps in this pillar'}", write 2-3 concrete mitigation measures as a short paragraph in Portuguese. Focus on practical, actionable steps.`;
      const result = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gpt-5.4' });
      setNoteForm(prev => ({ ...prev, [field]: result }));
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
                <button onClick={() => setSelectedSections(ALL_SECTIONS.map(s => s.key))} className="text-xs text-blue-400 hover:text-blue-300">All</button>
                <button onClick={() => setSelectedSections([])} className="text-xs text-white/40 hover:text-white/70">None</button>
              </div>
            </div>
            {ALL_SECTIONS.map(s => (
              <label key={s.key} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                <input type="checkbox" checked={selectedSections.includes(s.key)} onChange={e => setSelectedSections(prev => e.target.checked ? [...prev, s.key] : prev.filter(k => k !== s.key))} className="w-4 h-4 accent-blue-500" />
                <span className="text-sm text-white/80">{s.label}</span>
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

      {generating && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center text-blue-400 text-sm">
          <Sparkles className="w-4 h-4 inline mr-2 animate-pulse" />
          Generating AI report with OpenAI... This may take 30-60 seconds.
        </div>
      )}

      {/* ── Main Assessment ── */}
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
            <ScoreBadge score={globalScore} lang="en" size="lg" />
          </div>
        </div>
        <div className="bg-[#152233] border border-white/10 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Maturity Radar</h3>
          <AssessmentRadar pillarScores={pillarScores} lang="en" dark />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {pillarScores.map(ps => {
          const pillar = mainPillars.find(p => p.code === ps.code) || ps;
          return <PillarScoreCard key={ps.code} pillar={pillar} score={ps.score} lang="en" dark />;
        })}
      </div>

      {/* Per-pillar questions */}
      <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 text-sm font-semibold text-white/70">Answer Breakdown</div>
        <div className="divide-y divide-white/5">
          {mainPillars.map(pillar => {
            const pqs = mainQuestions.filter(q => q.pillar_code === pillar.code).sort((a, b) => a.order - b.order);
            const open = expandedPillar === pillar.code;
            const ps = pillarScores.find(p => p.code === pillar.code);
            return (
              <div key={pillar.code}>
                <button onClick={() => setExpandedPillar(open ? null : pillar.code)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">{pillar.name_pt}</span>
                    <span className="text-xs text-white/40">{pillar.weight}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-brand-blue">{ps?.score?.toFixed(2) || '—'}/5</span>
                    {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                  </div>
                </button>
                {open && (
                  <div className="px-5 pb-4 space-y-2">
                    {pqs.map(q => {
                      const ans = answersMap[q.id];
                      const v = ans?.value;
                      const colors = ['','#ef4444','#f97316','#eab308','#22c55e','#3b82f6'];
                      return (
                        <div key={q.id} className="flex gap-3 py-2 border-t border-white/5 first:border-0">
                          <span className="text-xs text-white/30 flex-shrink-0 pt-0.5 w-8">{q.code}</span>
                          <div className="flex-1">
                            <div className="text-xs text-white/70 mb-1">{q.text_pt}</div>
                            {v ? (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold" style={{ color: colors[v] }}>{v}</span>
                                <span className="text-xs text-white/40">{q[`anchor_${v}_pt`]}</span>
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

      {/* ── Data Sub-Assessment ── */}
      {subAssessment && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-px flex-1 bg-orange-500/20" />
              <span className="text-xs font-semibold uppercase tracking-widest text-orange-400/60">Data Sub-Assessment</span>
              <div className="h-px flex-1 bg-orange-500/20" />
            </div>
            {subAssessment.status !== 'completed' && (
              <Link to={`/sub-quiz/${subAssessment.id}`}>
                <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 gap-1.5 flex-shrink-0">
                  <Database className="w-3.5 h-3.5" /> Access Assessment
                </Button>
              </Link>
            )}
          </div>
          <SubAssessmentSummary subAssessment={subAssessment} />
          {subAssessment.status === 'completed' && subPillarScores.length > 0 && (
            <div className="bg-[#152233] border border-orange-500/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-orange-400/60 uppercase tracking-wider mb-2">Data Maturity Radar</h3>
              <AssessmentRadar
                pillarScores={subPillarScores.map(ps => ({ ...ps, name_pt: dsPillars.find(p => p.code === ps.code)?.name_pt || ps.code, name_en: dsPillars.find(p => p.code === ps.code)?.name_en || ps.code }))}
                lang="pt"
                dark
              />
            </div>
          )}
        </>
      )}

      {/* Data Sub-Assessment Answer Breakdown */}
      {subAssessment?.status === 'completed' && dsPillars.length > 0 && (
        <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 text-sm font-semibold text-white/70">Data Sub-Assessment Answer Breakdown</div>
          <div className="divide-y divide-white/5">
            {dsPillars.map(pillar => {
              const pqs = dsQuestions.filter(q => q.pillar_code === pillar.code).sort((a, b) => a.order - b.order);
              const open = expandedSubPillar === pillar.code;
              const ps = subPillarScores.find(p => p.code === pillar.code);
              return (
                <div key={pillar.code}>
                  <button onClick={() => setExpandedSubPillar(open ? null : pillar.code)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white">{pillar.name_pt}</span>
                      {pillar.weight && <span className="text-xs text-white/40">{pillar.weight}%</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-orange-400">{ps?.score?.toFixed(2) || '—'}/5</span>
                      {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                    </div>
                  </button>
                  {open && (
                    <div className="px-5 pb-4 space-y-2">
                      {pqs.map(q => {
                        const ans = subAnswersMap[q.id];
                        const v = ans?.value;
                        const colors = ['','#ef4444','#f97316','#eab308','#22c55e','#3b82f6'];
                        return (
                          <div key={q.id} className="flex gap-3 py-2 border-t border-white/5 first:border-0">
                            <span className="text-xs text-white/30 flex-shrink-0 pt-0.5 w-8">{q.code}</span>
                            <div className="flex-1">
                              <div className="text-xs text-white/70 mb-1">{q.text_pt}</div>
                              {v ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold" style={{ color: colors[v] }}>{v}</span>
                                  <span className="text-xs text-white/40">{q[`anchor_${v}_pt`]}</span>
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

      {/* ── Consultant Notes ── */}
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
                <Select value={noteForm.pillar_code} onValueChange={v => setNoteForm(p => ({ ...p, pillar_code: v }))}>
                  <SelectTrigger className="bg-[#152233] border-white/10 text-white h-8 text-xs"><SelectValue placeholder="Select pillar" /></SelectTrigger>
                  <SelectContent>{pillars.map(p => <SelectItem key={p.code} value={p.code}>{p.name_pt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Priority</label>
                <Select value={noteForm.priority} onValueChange={v => setNoteForm(p => ({ ...p, priority: v }))}>
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
              <textarea value={noteForm.gap_description} onChange={e => setNoteForm(p => ({ ...p, gap_description: e.target.value }))} className="w-full bg-[#152233] border border-white/10 rounded-lg p-2.5 text-sm text-white/80 resize-none h-20 focus:outline-none focus:border-blue-500/50" placeholder="Describe the identified gap..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-white/40">Mitigation Measures</label>
                <button onClick={() => generateWithAI('mitigation')} disabled={!noteForm.pillar_code || generatingField === 'mitigation'} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {generatingField === 'mitigation' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {generatingField === 'mitigation' ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
              <textarea value={noteForm.mitigation} onChange={e => setNoteForm(p => ({ ...p, mitigation: e.target.value }))} className="w-full bg-[#152233] border border-white/10 rounded-lg p-2.5 text-sm text-white/80 resize-none h-20 focus:outline-none focus:border-blue-500/50" placeholder="Proposed mitigation actions..." />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAddingNote(false)} className="text-white/50">Cancel</Button>
              <Button size="sm" onClick={addNote} disabled={!noteForm.pillar_code || !noteForm.gap_description} className="bg-blue-500 hover:bg-blue-600 text-white">Save Note</Button>
            </div>
          </div>
        )}

        <div className="divide-y divide-white/5">
          {notes.map(note => {
            const pillar = pillars.find(p => p.code === note.pillar_code);
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
