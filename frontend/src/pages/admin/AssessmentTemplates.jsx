import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Loader2, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

const EMPTY_TEMPLATE = {
  code: '',
  name_pt: '',
  name_en: '',
  tagline_pt: '',
  tagline_en: '',
  description_pt: '',
  description_en: '',
  pitch_pt: '',
  pitch_en: '',
  report_security_pt: '',
  report_security_en: '',
  pillar_count: '',
  active: true,
  order: 0
};

export default function AdminAssessmentTemplates() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_TEMPLATE);
  const [saving, setSaving] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => base44.entities.AssessmentTemplate.list('order')
  });

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_TEMPLATE);
    setOpen(true);
  };

  const openEdit = (template) => {
    setEditing(template);
    setForm({
      ...template,
      pillar_count: template.pillar_count ?? ''
    });
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      pillar_count: form.pillar_count === '' ? 0 : Number(form.pillar_count),
      order: Number(form.order || 0)
    };

    if (editing) {
      await base44.entities.AssessmentTemplate.update(editing.id, payload);
    } else {
      await base44.entities.AssessmentTemplate.create(payload);
    }

    qc.invalidateQueries({ queryKey: ['admin-templates'] });
    qc.invalidateQueries({ queryKey: ['assessment-templates'] });
    setSaving(false);
    setOpen(false);
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Delete this assessment template?')) {
      return;
    }

    await base44.entities.AssessmentTemplate.delete(templateId);
    qc.invalidateQueries({ queryKey: ['admin-templates'] });
    qc.invalidateQueries({ queryKey: ['assessment-templates'] });
  };

  const handleToggle = async (template) => {
    await base44.entities.AssessmentTemplate.update(template.id, {
      active: !template.active
    });
    qc.invalidateQueries({ queryKey: ['admin-templates'] });
    qc.invalidateQueries({ queryKey: ['assessment-templates'] });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Assessment Templates</h1>
          <p className="text-white/50 text-sm mt-1">
            Manage the assessments available on the public landing page.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 bg-blue-500 hover:bg-blue-600 text-white">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-white/50" />
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.length === 0 && (
            <div className="text-center py-16 text-white/40 border border-dashed border-white/10 rounded-2xl">
              No templates yet. Create your first assessment template.
            </div>
          )}

          {templates.map(template => (
            <div key={template.id} className="bg-[#152233] border border-white/10 rounded-2xl p-5 shadow-sm flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-white">{template.name_pt}</span>
                  {template.name_en && <span className="text-white/50 text-sm">/ {template.name_en}</span>}
                  <span className="text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/50">
                    {template.code}
                  </span>
                  {!template.active && (
                    <span className="text-xs bg-yellow-400/15 text-yellow-300 px-1.5 py-0.5 rounded">
                      inactive
                    </span>
                  )}
                </div>
                {template.tagline_pt && <p className="text-sm text-blue-400 mb-1">{template.tagline_pt}</p>}
                {template.pitch_pt && <p className="text-sm text-white/60 line-clamp-2">{template.pitch_pt}</p>}
                <div className="flex gap-4 mt-2 text-xs text-white/40">
                  {template.pillar_count > 0 && <span>{template.pillar_count} pillars</span>}
                  {template.report_security_pt && <span>{template.report_security_pt}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => handleToggle(template)} title={template.active ? 'Deactivate' : 'Activate'}>
                  {template.active
                    ? <ToggleRight className="w-5 h-5 text-green-400" />
                    : <ToggleLeft className="w-5 h-5 text-white/40" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(template)} className="text-white/60 hover:text-white">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="text-white/40 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Assessment Template'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code (slug) *</Label>
                <Input value={form.code} onChange={e => setField('code', e.target.value)} placeholder="ai-readiness" className="mt-1" />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input type="number" value={form.order} onChange={e => setField('order', e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name (PT) *</Label>
                <Input value={form.name_pt} onChange={e => setField('name_pt', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Name (EN)</Label>
                <Input value={form.name_en} onChange={e => setField('name_en', e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tagline (PT)</Label>
                <Input value={form.tagline_pt} onChange={e => setField('tagline_pt', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Tagline (EN)</Label>
                <Input value={form.tagline_en} onChange={e => setField('tagline_en', e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Description (PT)</Label>
                <Textarea value={form.description_pt} onChange={e => setField('description_pt', e.target.value)} rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Description (EN)</Label>
                <Textarea value={form.description_en} onChange={e => setField('description_en', e.target.value)} rows={3} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pitch (PT)</Label>
                <Textarea value={form.pitch_pt} onChange={e => setField('pitch_pt', e.target.value)} rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Pitch (EN)</Label>
                <Textarea value={form.pitch_en} onChange={e => setField('pitch_en', e.target.value)} rows={3} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Report Security Text (PT)</Label>
                <Input value={form.report_security_pt} onChange={e => setField('report_security_pt', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Report Security Text (EN)</Label>
                <Input value={form.report_security_en} onChange={e => setField('report_security_en', e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="w-32">
              <Label>Number of Pillars</Label>
              <Input type="number" value={form.pillar_count} onChange={e => setField('pillar_count', e.target.value)} className="mt-1" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.code || !form.name_pt} className="gap-2 bg-blue-500 hover:bg-blue-600 text-white">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
