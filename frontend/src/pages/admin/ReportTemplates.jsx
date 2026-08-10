import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, FileText, Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReportTemplateEditor from '@/components/ReportTemplateEditor';

export default function AdminReportTemplates() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => base44.entities.ReportTemplate.list('order', 50)
  });

  const { data: allSections = [] } = useQuery({
    queryKey: ['all-report-sections'],
    queryFn: () => base44.entities.ReportSection.list('order', 200)
  });

  const { data: editingSections = [] } = useQuery({
    queryKey: ['report-sections', editing?.id],
    queryFn: () => editing?.id ? base44.entities.ReportSection.filter({ report_template_id: editing.id }, 'order') : [],
    enabled: !!editing?.id
  });

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (data.is_default) {
        const currentDefaults = templates.filter((template) => template.is_default && template.id !== editing?.id);
        for (const template of currentDefaults) {
          await base44.entities.ReportTemplate.update(template.id, { is_default: false });
        }
      }

      const { sections, ...templateData } = data;
      let templateId = editing?.id;

      if (editing?.id) {
        await base44.entities.ReportTemplate.update(editing.id, templateData);
      } else {
        const created = await base44.entities.ReportTemplate.create(templateData);
        templateId = created.id;
      }

      const existingSections = await base44.entities.ReportSection.filter({ report_template_id: templateId });
      const keptIds = new Set((sections || []).filter((section) => section.id).map((section) => section.id));

      for (const section of existingSections) {
        if (!keptIds.has(section.id)) {
          await base44.entities.ReportSection.delete(section.id);
        }
      }

      for (let index = 0; index < (sections || []).length; index += 1) {
        const section = sections[index];
        const payload = {
          report_template_id: templateId,
          key: section.key,
          title: section.title || section.key,
          prompt: section.prompt || '',
          context_keys: JSON.stringify(section.context_keys || ['org', 'score', 'pillars', 'answers']),
          json_schema: section.json_schema || '',
          order: index + 1
        };

        if (section.id) {
          await base44.entities.ReportSection.update(section.id, payload);
        } else {
          await base44.entities.ReportSection.create(payload);
        }
      }

      toast.success(editing?.id ? 'Template updated' : 'Template created');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['report-templates'] });
      qc.invalidateQueries({ queryKey: ['all-report-sections'] });
      qc.invalidateQueries({ queryKey: ['report-sections'] });
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete "${template.name}"?`)) return;

    try {
      const sections = await base44.entities.ReportSection.filter({ report_template_id: template.id });
      for (const section of sections) {
        await base44.entities.ReportSection.delete(section.id);
      }
      await base44.entities.ReportTemplate.delete(template.id);
      toast.success('Template deleted');
      qc.invalidateQueries({ queryKey: ['report-templates'] });
      qc.invalidateQueries({ queryKey: ['all-report-sections'] });
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleDuplicate = async (template) => {
    try {
      const created = await base44.entities.ReportTemplate.create({
        name: `${template.name} (copy)`,
        code: `${template.code}-copy`,
        description: template.description,
        system_prompt: template.system_prompt,
        style_guide: template.style_guide,
        is_default: false,
        is_active: true,
        order: (templates.length || 0) + 1
      });

      const sections = await base44.entities.ReportSection.filter({ report_template_id: template.id });
      for (const section of sections) {
        await base44.entities.ReportSection.create({
          report_template_id: created.id,
          key: section.key,
          title: section.title,
          prompt: section.prompt,
          context_keys: section.context_keys,
          json_schema: section.json_schema,
          order: section.order
        });
      }

      toast.success('Template duplicated');
      qc.invalidateQueries({ queryKey: ['report-templates'] });
      qc.invalidateQueries({ queryKey: ['all-report-sections'] });
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  if (isLoading) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  if (editing) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)} className="text-white/50 hover:text-white">
            Back
          </Button>
          <h1 className="text-xl font-bold text-white">{editing.id ? 'Edit Template' : 'New Template'}</h1>
        </div>
        <ReportTemplateEditor
          template={editing.id ? editing : null}
          sections={editingSections}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-bold text-white">Report Templates</h1>
        </div>
        <Button size="sm" onClick={() => setEditing({})} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      <p className="text-sm text-white/40 max-w-2xl">
        Manage the AI report generation templates. The active default template is used by the backend when generating reports. If no custom template is configured, the current built-in Oramix fallback remains in place.
      </p>

      <div className="space-y-3">
        {templates.map((template) => {
          const sectionCount = allSections.filter((section) => section.report_template_id === template.id).length;
          return (
            <div key={template.id} className="bg-[#152233] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{template.name}</span>
                      {template.is_default && (
                        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-2.5 h-2.5" /> Default
                        </span>
                      )}
                      {!template.is_active && <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Inactive</span>}
                    </div>
                    <div className="text-xs text-white/40 flex items-center gap-2 mt-0.5">
                      <code className="text-blue-400/70">{template.code}</code>
                      <span>·</span>
                      <span>{sectionCount} sections</span>
                      {template.description ? <><span>·</span><span className="truncate">{template.description}</span></> : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                  <button onClick={() => handleDuplicate(template)} title="Duplicate" className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(template)} title="Delete" className="p-1.5 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditing(template)} title="Edit" className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-blue-400 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
