import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, Eye, Loader2, Mail, Pencil, Send, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import EmailPreviewDialog from '@/components/EmailPreviewDialog';

const TRIGGER_INFO = {
  immediate: { label: 'Immediate', icon: Send, cls: 'text-blue-400 bg-blue-400/10' },
  scheduled_24h: { label: 'Auto - 24h', icon: Clock, cls: 'text-orange-400 bg-orange-400/10' },
  manual: { label: 'Manual - Admin', icon: User, cls: 'text-green-400 bg-green-400/10' },
  scheduled_96h: { label: 'Auto - 96h', icon: Clock, cls: 'text-purple-400 bg-purple-400/10' },
  report_ready: { label: 'Auto - Report', icon: Mail, cls: 'text-cyan-400 bg-cyan-400/10' }
};

const TEMPLATE_VARS = {
  completion: ['customer_name', 'company', 'global_score', 'maturity_label', 'quiz_link', 'booking_url'],
  assessment_started: ['customer_name', 'company', 'quiz_link', 'access_expires_at'],
  incomplete_reminder: ['customer_name', 'company', 'quiz_link', 'access_expires_at', 'booking_url'],
  final_report: ['customer_name', 'company', 'global_score', 'maturity_label', 'booking_url'],
  presentation_scheduling: ['customer_name', 'company', 'am_name', 'booking_url'],
  report_ready: ['customer_name', 'company', 'global_score', 'maturity_label', 'booking_url', 'app_access_line']
};

export default function NotificationManager() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [preview, setPreview] = useState({ open: false, body: '', lang: 'pt' });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => base44.entities.NotificationTemplate.list('order', 50)
  });

  const handleEdit = (template) => {
    setEditingId(template.id);
    setEditForm({
      subject_pt: template.subject_pt || '',
      subject_en: template.subject_en || '',
      body_pt: template.body_pt || '',
      body_en: template.body_en || '',
      from_email: template.from_email || '',
      is_active: template.is_active
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.NotificationTemplate.update(editingId, editForm);
      toast.success('Notification template updated');
      setEditingId(null);
      setEditForm(null);
      qc.invalidateQueries({ queryKey: ['notification-templates'] });
    } catch (error) {
      toast.error(`Error while saving: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (template) => {
    await base44.entities.NotificationTemplate.update(template.id, { is_active: !template.is_active });
    qc.invalidateQueries({ queryKey: ['notification-templates'] });
    toast.success(template.is_active ? 'Notification disabled' : 'Notification enabled');
  };

  const setField = (key, value) => setEditForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => {
        const isEditing = editingId === template.id;
        const triggerInfo = TRIGGER_INFO[template.trigger_type] || TRIGGER_INFO.immediate;
        const vars = TEMPLATE_VARS[template.key] || [];
        const TriggerIcon = triggerInfo.icon;

        return (
          <div key={template.id} className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${triggerInfo.cls}`}>
                  <TriggerIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    {template.name}
                    {!template.is_active && <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Inactive</span>}
                  </div>
                  <div className="text-xs text-white/40 truncate">{template.description}</div>
                </div>
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${triggerInfo.cls} hidden sm:inline-flex items-center gap-1`}>
                  {triggerInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <button
                  onClick={() => handleToggle(template)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${template.is_active ? 'bg-green-500' : 'bg-white/10'}`}
                  title={template.is_active ? 'Disable' : 'Enable'}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${template.is_active ? 'left-4' : 'left-0.5'}`} />
                </button>
                {isEditing ? (
                  <button onClick={() => { setEditingId(null); setEditForm(null); }} className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button onClick={() => handleEdit(template)} className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-blue-400 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="px-4 py-3 space-y-3">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Subject (PT) *" value={editForm.subject_pt} onChange={(value) => setField('subject_pt', value)} />
                    <Field label="Subject (EN)" value={editForm.subject_en} onChange={(value) => setField('subject_en', value)} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-white/40">HTML Body (PT) *</label>
                      <button onClick={() => setPreview({ open: true, body: editForm.body_pt, lang: 'pt' })} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                    </div>
                    <textarea value={editForm.body_pt} onChange={(event) => setField('body_pt', event.target.value)} rows={10} className="w-full bg-[#0D1B2A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-none font-mono text-xs" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-white/40">HTML Body (EN)</label>
                      <button onClick={() => setPreview({ open: true, body: editForm.body_en, lang: 'en' })} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                    </div>
                    <textarea value={editForm.body_en} onChange={(event) => setField('body_en', event.target.value)} rows={10} className="w-full bg-[#0D1B2A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-none font-mono text-xs" />
                  </div>
                  <Field label="From email" value={editForm.from_email} onChange={(value) => setField('from_email', value)} placeholder="Oramix <readiness@oramix.pt>" />

                  {vars.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-xs text-white/30">Available variables:</span>
                      {vars.map((variable) => (
                        <code key={variable} className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono">{`{{${variable}}}`}</code>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditForm(null); }} className="text-white/50">
                      <X className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />} Save
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-white/25 mb-1">Subject (PT)</p>
                      <p className="text-xs text-white/60">{template.subject_pt}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/25 mb-1">Subject (EN)</p>
                      <p className="text-xs text-white/60">{template.subject_en}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPreview({ open: true, body: template.body_pt, lang: 'pt' })} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                      <Eye className="w-3 h-3" /> Preview PT
                    </button>
                    <button onClick={() => setPreview({ open: true, body: template.body_en, lang: 'en' })} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                      <Eye className="w-3 h-3" /> Preview EN
                    </button>
                  </div>
                  {vars.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center pt-1">
                      <span className="text-xs text-white/30">Variables:</span>
                      {vars.map((variable) => (
                        <code key={variable} className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono">{`{{${variable}}}`}</code>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {templates.length === 0 && (
        <div className="bg-[#152233] border border-white/10 rounded-xl px-5 py-12 text-center text-white/25 text-sm">
          No notification templates found.
        </div>
      )}

      <EmailPreviewDialog
        open={preview.open}
        onClose={() => setPreview((prev) => ({ ...prev, open: false }))}
        bodyHtml={preview.body}
        lang={preview.lang}
      />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  const className = 'w-full bg-[#0D1B2A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50';

  return (
    <div>
      <label className="text-xs text-white/40 mb-1 block">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={className} />
    </div>
  );
}
