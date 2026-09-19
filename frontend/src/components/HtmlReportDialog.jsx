import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileCode2, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { DEFAULT_HTML_REPORT_CSS } from '@/components/HtmlFormatManager';

export default function HtmlReportDialog({ open, onOpenChange, report, assessment, customer, template, sections, consultantNotes = [] }) {
  const { data: configs = [] } = useQuery({
    queryKey: ['html_report_configs'],
    queryFn: () => base44.entities.HtmlReportConfig.filter({ is_active: true }),
    enabled: open
  });
  const html = useMemo(() => buildReportHtml({ report, assessment, customer, template, sections, consultantNotes, css: configs[0]?.css }), [report, assessment, customer, template, sections, consultantNotes, configs]);

  if (!report) return null;

  const download = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `relatorio-${safeFileName(customer?.company || 'oramix')}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;';
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 1000);
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-gray-200 text-gray-900 max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0"><DialogTitle className="flex items-center gap-2"><FileCode2 className="w-5 h-5 text-blue-600" /> Pré-visualização do relatório HTML</DialogTitle></DialogHeader>
        <iframe title="Pré-visualização do relatório HTML" sandbox="allow-same-origin" srcDoc={html} className="w-full flex-1 min-h-0 border border-gray-200 rounded-lg bg-white" />
        <DialogFooter className="flex-shrink-0 gap-2">
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-600">Fechar</Button>
          <Button size="sm" variant="outline" onClick={print} className="gap-1.5"><Printer className="w-3.5 h-3.5" /> Imprimir / PDF</Button>
          <Button size="sm" onClick={download} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"><Download className="w-3.5 h-3.5" /> Descarregar HTML</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildReportHtml({ report, assessment, customer, template, sections = [], consultantNotes, css }) {
  const language = report?.language === 'en' ? 'en' : 'pt';
  const title = language === 'en' ? 'Maturity Report' : 'Relatório de Maturidade';
  const date = new Date(report?.generated_at || Date.now()).toLocaleDateString(language === 'en' ? 'en-GB' : 'pt-PT', { year: 'numeric', month: 'long', day: 'numeric' });
  const renderedSections = sections.filter((section) => section.content).map((section, index) => `<section class="section"><h2>${index + 1}. ${escapeHtml(section.title)}</h2><div class="section-body">${markdownToHtml(section.content)}</div></section>`).join('');
  const notes = consultantNotes.length ? `<section class="section notes"><h2>${sections.filter((section) => section.content).length + 1}. ${language === 'en' ? 'Consultant Notes' : 'Notas do Consultor'}</h2>${consultantNotes.map((note) => `<p><strong>${escapeHtml(note.pillar_code || '')}</strong> ${escapeHtml(note.gap_description || '')}</p>${note.mitigation ? `<p><strong>${language === 'en' ? 'Mitigation' : 'Mitigação'}:</strong> ${escapeHtml(note.mitigation)}</p>` : ''}`).join('')}</section>` : '';
  const score = Number.isFinite(Number(assessment?.global_score)) ? `<div class="score">${Number(assessment.global_score).toFixed(2)} / 5.0</div>` : '';

  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} - ${escapeHtml(customer?.company || 'Oramix')}</title><style>*{box-sizing:border-box} ${css || DEFAULT_HTML_REPORT_CSS}</style></head><body><header class="header"><h1>${escapeHtml(title)}</h1><p class="meta">${escapeHtml(template?.name_pt || template?.name_en || '')}</p><p class="meta">${escapeHtml(customer?.company || '')} · ${escapeHtml(customer?.name || '')}</p><p class="meta">${date}</p>${score}</header>${renderedSections}${notes}<footer class="footer">Oramix · ${new Date().getFullYear()}</footer></body></html>`;
}

function markdownToHtml(value) {
  const escaped = escapeHtml(value || '');
  return escaped
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .split(/\n{2,}/)
    .map((block) => block.startsWith('<h') ? block : `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function safeFileName(value) {
  return value.replace(/[^a-z0-9_-]/gi, '_').replace(/_+/g, '_');
}
