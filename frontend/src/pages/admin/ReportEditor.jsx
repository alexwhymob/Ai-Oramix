import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Mail, Sparkles, CheckCircle2, Loader2, FileText, Settings2 } from 'lucide-react';
import { exportReportPDF } from '@/lib/exportPdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ReportSectionEditor from '@/components/ReportSectionEditor';
import { useCurrentUser } from '@/lib/useCurrentUser';
import ReportVisuals from '@/components/ReportVisuals';
import ReportVisualsExport from '@/components/ReportVisualsExport';
import SubAssessmentVisualsExport from '@/components/SubAssessmentVisualsExport';


const SECTIONS_PT = ['Sumário Executivo','Metodologia','Resultados por Pilar','Radar de Maturidade','Mapa de Gaps','Quick Wins','Roadmap','Recomendação de Casos de Uso','Próximos Passos'];
const SECTIONS_EN = ['Executive Summary','Methodology','Results by Pillar','Maturity Radar','Gap Map','Quick Wins','Roadmap','Use Case Recommendations','Next Steps'];

export default function AdminReportEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAiConsultant } = useCurrentUser();
  const [regenerating, setRegenerating] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [reportLang, setReportLang] = useState('pt');
  const [showPdfPicker, setShowPdfPicker] = useState(false);
  const [pdfSections, setPdfSections] = useState([1,2,3,4,5,6,7,8,9]);
  const [pdfVisuals, setPdfVisuals] = useState(true);

  const { data: report, isLoading } = useQuery({ queryKey: ['report_detail', id], queryFn: () => base44.entities.Report.get(id) });
  const { data: assessment, refetch: refetchAssessment } = useQuery({ queryKey: ['assessment_r', report?.assessment_id], queryFn: () => base44.entities.Assessment.get(report.assessment_id), enabled: !!report?.assessment_id });
  const { data: customer } = useQuery({ queryKey: ['customer_r', assessment?.customer_id], queryFn: () => base44.entities.Customer.get(assessment.customer_id), enabled: !!assessment?.customer_id });
  const { data: pillars = [] } = useQuery({ queryKey: ['pillars'], queryFn: () => base44.entities.Pillar.list('order') });
  const { data: templateList = [] } = useQuery({
    queryKey: ['report_template', assessment?.assessment_template_id],
    queryFn: () => base44.entities.AssessmentTemplate.filter({ id: assessment.assessment_template_id }),
    enabled: !!assessment?.assessment_template_id
  });
  const { data: consultantNotes = [] } = useQuery({ queryKey: ['notes_report', report?.assessment_id], queryFn: () => base44.entities.ConsultantNote.filter({ assessment_id: report.assessment_id }), enabled: !!report?.assessment_id });
  const { data: subAssessments = [] } = useQuery({ queryKey: ['sub_assessments_r', report?.assessment_id], queryFn: () => base44.entities.Assessment.filter({ parent_assessment_id: report.assessment_id }), enabled: !!report?.assessment_id });
  const subAssessment = subAssessments[0];
  const template = templateList[0] || null;
  const subPillarScores = useMemo(() => { try { return JSON.parse(subAssessment?.pillar_scores || '[]'); } catch { return []; } }, [subAssessment?.pillar_scores]);
  const subPillars = useMemo(() => pillars.filter(p => p.assessment_type === 'sub_assessment'), [pillars]);
  const mainPillars = useMemo(() => pillars.filter((pillar) => {
    if (pillar.assessment_type === 'sub_assessment') return false;
    if (assessment?.assessment_template_id) {
      return pillar.assessment_template_id === assessment.assessment_template_id;
    }
    return !pillar.assessment_template_id;
  }), [pillars, assessment?.assessment_template_id]);
  const pillarScores = useMemo(() => {
    try {
      const parsed = JSON.parse(assessment?.pillar_scores || '[]');
      const pillarMap = new Map(mainPillars.map((pillar) => [pillar.code, pillar]));

      return parsed
        .map((score) => {
          const pillar = pillarMap.get(score.code);
          if (!pillar) return null;

          return {
            ...score,
            name_pt: pillar.name_pt,
            name_en: pillar.name_en,
            weight: pillar.weight
          };
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }, [assessment?.pillar_scores, mainPillars]);

  const handleToggleReviewed = async () => {
    await base44.entities.Assessment.update(report.assessment_id, { reviewed_by_consultant: !assessment?.reviewed_by_consultant });
    refetchAssessment();
    toast.success(assessment?.reviewed_by_consultant ? 'Marked as not reviewed' : 'Marked as reviewed by consultant');
  };
  const sectionTitles = reportLang === 'en' ? SECTIONS_EN : SECTIONS_PT;

  const updateSection = async (sectionKey, value) => {
    await base44.entities.Report.update(id, { [sectionKey]: value });
    qc.invalidateQueries({ queryKey: ['report_detail', id] });
    toast.success('Section saved');
  };

  const handleFinalize = async () => {
    await base44.entities.Report.update(id, { status: 'final', finalized_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ['report_detail', id] });
    toast.success('Report marked as final!');
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await base44.functions.invoke('generateReport', { assessmentId: report.assessment_id, language: reportLang });
      if (res.data?.success) {
        qc.invalidateQueries({ queryKey: ['report_detail', id] });
        toast.success('Report regenerated successfully!');
      } else {
        toast.error('Generation failed: ' + (res.data?.error || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Generation failed: ' + (error?.data?.message || error?.message || 'Unknown error'));
    } finally {
      setRegenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!report || !assessment || !customer) return;
    setShowPdfPicker(false);
    toast.info('Building PDF…');
    let visualImages = [];
    if (pdfVisuals) {
      const ids = ['vx-score', 'vx-radar', 'vx-bar', 'vx-grid'];
      for (const id of ids) {
        const elem = document.getElementById(id);
        if (elem) {
          const img = await html2canvas(elem, { backgroundColor: '#0f1d2e', scale: 2, useCORS: true, logging: false }).then(c => c.toDataURL('image/png'));
          visualImages.push(img);
        }
      }
    }
    let subVisualImages = [];
    if (subAssessment?.status === 'completed' && subPillarScores.length > 0) {
      const subIds = ['vx-sub-score', 'vx-sub-radar', 'vx-sub-bar', 'vx-sub-grid'];
      for (const sid of subIds) {
        const elem = document.getElementById(sid);
        if (elem) {
          const img = await html2canvas(elem, { backgroundColor: '#1a1508', scale: 2, useCORS: true, logging: false }).then(c => c.toDataURL('image/png'));
          subVisualImages.push(img);
        }
      }
    }
    await exportReportPDF(report, assessment, customer, pdfSections, pdfVisuals, visualImages, consultantNotes, subAssessment, subPillarScores, subPillars, subVisualImages, template);
    toast.success('PDF exported!');
  };

  const handleSendEmail = async () => {
    setEmailing(true);
    try {
      const res = await base44.functions.invoke('sendReport', { assessmentId: report.assessment_id });
      if (res.data?.success) {
        toast.success(`Report notification sent to ${customer?.email}`);
      } else {
        toast.error('Failed to send email: ' + (res.data?.error || 'Unknown error'));
      }
    } catch (err) {
      toast.error('Failed to send email: ' + (err?.data?.message || err.message));
    }
    setEmailing(false);
  };

  if (isLoading) return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  if (!report) return <div className="p-6 text-white/50 text-sm">Report not found</div>;

  const completedSections = [1,2,3,4,5,6,7,8,9].filter(n => report[`section_${n}`]).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/assessment/${report.assessment_id}`)} className="text-white/50 hover:text-white gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Report Editor
              {report.status === 'final' && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">✓ Final</span>}
            </h1>
            <div className="text-xs text-white/40">{customer?.company} · {completedSections}/9 sections generated</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Select value={reportLang} onValueChange={setReportLang}>
            <SelectTrigger className="bg-[#152233] border-white/10 text-white h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="pt">🇵🇹 PT</SelectItem><SelectItem value="en">🇬🇧 EN</SelectItem></SelectContent>
          </Select>

          <Button size="sm" onClick={handleRegenerate} disabled={regenerating} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {regenerating ? 'Generating...' : 'Generate with AI'}
          </Button>

          {completedSections > 0 && !isAiConsultant && (
            <Button size="sm" onClick={() => setShowPdfPicker(true)} variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export PDF
            </Button>
          )}

          {!isAiConsultant && (
            <Button size="sm" onClick={handleSendEmail} disabled={emailing} variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-1.5">
              {emailing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Send Email
            </Button>
          )}

          {assessment && (
            <Button
              size="sm"
              onClick={handleToggleReviewed}
              variant="outline"
              className={assessment.reviewed_by_consultant
                ? 'border-green-500/50 text-green-400 bg-green-500/10 hover:bg-green-500/20 gap-1.5'
                : 'border-white/20 text-white/50 hover:text-white hover:bg-white/10 gap-1.5'}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {assessment.reviewed_by_consultant ? 'Reviewed ✓' : 'Mark as Reviewed'}
            </Button>
          )}
          {report.status !== 'final' && completedSections > 0 && (
            <Button size="sm" onClick={handleFinalize} className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Final
            </Button>
          )}
        </div>
      </div>

      {/* PDF Section Picker */}
      <Dialog open={showPdfPicker} onOpenChange={setShowPdfPicker}>
        <DialogContent className="bg-[#152233] border border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Settings2 className="w-4 h-4 text-blue-400" /> Select Sections to Export</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors mb-3 border-b border-white/10 pb-3">
            <input type="checkbox" checked={pdfVisuals} onChange={e => setPdfVisuals(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            <span className="text-sm text-white/80">📊 Include Assessment Visuals</span>
          </label>
          <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40">{pdfSections.length} of 9 sections</span>
              <div className="flex gap-3">
                <button onClick={() => setPdfSections([1,2,3,4,5,6,7,8,9])} className="text-xs text-blue-400 hover:text-blue-300">All</button>
                <button onClick={() => setPdfSections([])} className="text-xs text-white/40 hover:text-white/70">None</button>
              </div>
            </div>
            {sectionTitles.map((title, i) => {
              const n = i + 1;
              const hasContent = !!report[`section_${n}`];
              return (
                <label key={n} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                  <input type="checkbox" checked={pdfSections.includes(n)} onChange={e => setPdfSections(prev => e.target.checked ? [...prev, n].sort((a,b)=>a-b) : prev.filter(k => k !== n))} className="w-4 h-4 accent-blue-500" disabled={!hasContent} />
                  <span className={`text-sm ${hasContent ? 'text-white/80' : 'text-white/25 line-through'}`}>{n}. {title}</span>
                  {!hasContent && <span className="text-[10px] text-white/25 ml-auto">empty</span>}
                </label>
              );
            })}
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowPdfPicker(false)} className="text-white/50">Cancel</Button>
            <Button size="sm" onClick={handleExportPDF} disabled={pdfSections.length === 0} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export {pdfSections.length} Section{pdfSections.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {regenerating && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center text-blue-400 text-sm">
          <Sparkles className="w-4 h-4 inline mr-2 animate-pulse" />
          AI is generating your report... This may take 30-60 seconds. Please wait.
        </div>
      )}

      {/* Visuals */}
      {assessment && (
        <>
          <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '900px' }}>
            <ReportVisualsExport
              pillarScores={pillarScores}
              globalScore={assessment.global_score}
              lang={reportLang}
              customer={customer}
              template={template}
            />
            {subAssessment?.status === 'completed' && subPillarScores.length > 0 && (
              <SubAssessmentVisualsExport
                subPillarScores={subPillarScores}
                subAssessment={subAssessment}
                lang={reportLang}
                pillars={subPillars}
              />
            )}
          </div>
          <ReportVisuals
            pillarScores={pillarScores}
            globalScore={assessment.global_score}
            lang={reportLang}
            customer={customer}
            template={template}
          />
        </>
      )}

      {/* Report sections */}
      <div className="space-y-3">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <ReportSectionEditor
            key={n}
            number={n}
            title={sectionTitles[n - 1]}
            content={report[`section_${n}`]}
            onSave={(value) => updateSection(`section_${n}`, value)}
            sectionKey={`section_${n}`}
            extraData={n === 6 ? { consultantNotes } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
