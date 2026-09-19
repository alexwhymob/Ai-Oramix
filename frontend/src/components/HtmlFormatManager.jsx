import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Code2, Loader2, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export const DEFAULT_HTML_REPORT_CSS = `body {
  font-family: Arial, Helvetica, sans-serif;
  color: #172033;
  line-height: 1.6;
  max-width: 900px;
  margin: 0 auto;
  padding: 40px;
}
.header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 24px; margin-bottom: 30px; }
.header h1, .section h2 { color: #1d4ed8; }
.meta { color: #64748b; font-size: 13px; margin: 4px 0; }
.score { display: inline-block; margin-top: 16px; padding: 12px 24px; border: 2px solid #2563eb; border-radius: 12px; color: #1d4ed8; font-size: 28px; font-weight: 700; }
.section { margin: 0 0 28px; page-break-inside: avoid; }
.section h2 { border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
.section-body h1 { font-size: 18px; }.section-body h2 { font-size: 16px; }.section-body h3 { font-size: 15px; }
.section-body p { margin: 0 0 10px; }.section-body ul, .section-body ol { margin: 0 0 12px 24px; }
.notes { background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; border-radius: 0 8px 8px 0; }
.footer { border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; margin-top: 40px; padding-top: 16px; text-align: center; }`;

export default function HtmlFormatManager() {
  const queryClient = useQueryClient();
  const [css, setCss] = useState(DEFAULT_HTML_REPORT_CSS);
  const [saving, setSaving] = useState(false);
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['html_report_configs'],
    queryFn: () => base44.entities.HtmlReportConfig.filter({ is_active: true })
  });
  const activeConfig = configs[0];

  useEffect(() => {
    if (activeConfig?.css) setCss(activeConfig.css);
  }, [activeConfig?.id, activeConfig?.css]);

  const save = async () => {
    setSaving(true);
    try {
      if (activeConfig) await base44.entities.HtmlReportConfig.update(activeConfig.id, { css });
      else await base44.entities.HtmlReportConfig.create({ name: 'Default', is_active: true, css });
      await queryClient.invalidateQueries({ queryKey: ['html_report_configs'] });
      toast.success('CSS do relatório HTML guardado.');
    } catch (error) {
      toast.error(error?.data?.message || error?.message || 'Não foi possível guardar o CSS.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <section className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Code2 className="w-4 h-4 text-blue-400" /><h2 className="text-sm font-semibold text-white">Formato HTML do relatório</h2></div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setCss(DEFAULT_HTML_REPORT_CSS)} className="text-white/60 gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Restaurar</Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Guardar CSS</Button>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-white/45 mb-3">Este CSS é aplicado à pré-visualização e ao HTML descarregado pelos relatórios.</p>
        <textarea value={css} onChange={(event) => setCss(event.target.value)} spellCheck={false} className="w-full h-[440px] bg-[#0D1B2A] border border-white/10 rounded-lg p-4 text-xs text-green-300 font-mono resize-y focus:outline-none focus:border-blue-500/50" />
      </div>
    </section>
  );
}
