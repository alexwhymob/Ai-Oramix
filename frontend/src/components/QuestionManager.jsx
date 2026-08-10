import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronDown, ChevronUp, Pencil, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const EMPTY_PILLAR = {
  code: '',
  name_pt: '',
  name_en: '',
  weight: 0,
  order: 0,
  icon: '',
  description_pt: '',
  description_en: '',
  assessment_type: 'main',
  assessment_template_id: '',
  min_score: '',
  sub_assessment_template_id: ''
};

function PillarForm({ initial = EMPTY_PILLAR, onSave, onCancel, saving, templates = [] }) {
  const [form, setForm] = useState(initial);
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const subAssessmentTemplates = templates.filter((template) => (template.template_type || 'assessment') === 'sub_assessment');
  const selectedTemplate = templates.find((template) => template.id === form.assessment_template_id) || null;
  const resolvedAssessmentType = selectedTemplate
    ? (selectedTemplate.template_type === 'sub_assessment' ? 'sub_assessment' : 'main')
    : (form.assessment_type || 'main');

  return (
    <div className="bg-[#0D1B2A] border border-white/10 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code *" value={form.code} onChange={v => set('code', v)} placeholder="e.g. DATA" />
        <div>
          <label className="text-xs text-white/40 mb-1 block">Pillar Type</label>
          <div className={`w-full rounded-lg border px-3 py-2 text-sm font-medium ${
            resolvedAssessmentType === 'sub_assessment'
              ? 'border-orange-500/20 bg-orange-500/10 text-orange-300'
              : 'border-blue-500/20 bg-blue-500/10 text-blue-300'
          }`}>
            {resolvedAssessmentType === 'sub_assessment' ? 'Sub-Assessment' : 'Main Assessment'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Name (PT) *" value={form.name_pt} onChange={v => set('name_pt', v)} />
        <Field label="Name (EN)" value={form.name_en} onChange={v => set('name_en', v)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Weight (%)" value={form.weight} type="number" onChange={v => set('weight', Number(v))} />
        <Field label="Order" value={form.order} type="number" onChange={v => set('order', Number(v))} />
        <Field label="Icon (emoji)" value={form.icon} onChange={v => set('icon', v)} placeholder="🔬" />
      </div>

      {templates.length > 0 && (
        <div>
          <label className="text-xs text-white/40 mb-1 block">Assessment Template</label>
          <select
            value={form.assessment_template_id || ''}
            onChange={e => {
              const templateId = e.target.value;
              const template = templates.find((item) => item.id === templateId) || null;
              set('assessment_template_id', templateId);
              if (template) {
                set('assessment_type', template.template_type === 'sub_assessment' ? 'sub_assessment' : 'main');
              }
            }}
            className="w-full bg-[#152233] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="">— No template (legacy / shared) —</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                [{(template.template_type || 'assessment') === 'sub_assessment' ? 'SUB' : 'MAIN'}] {template.name_pt}{template.name_en ? ` / ${template.name_en}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {resolvedAssessmentType === 'main' && (
        <div className="border border-orange-500/20 bg-orange-500/5 rounded-lg p-3 space-y-3">
          <p className="text-xs text-orange-400 font-medium">Sub-Assessment Trigger</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Minimum Score (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={form.min_score ?? ''}
                onChange={e => set('min_score', e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 2.5"
                className="w-full bg-[#152233] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Sub-Assessment Template</label>
              <select
                value={form.sub_assessment_template_id || ''}
                onChange={e => set('sub_assessment_template_id', e.target.value)}
                className="w-full bg-[#152233] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
              >
                <option value="">-- None --</option>
                {subAssessmentTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name_pt}{template.name_en ? ` / ${template.name_en}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[10px] text-white/25">
            If the pillar score is below the minimum defined here, a sub-assessment will be created automatically using the selected template.
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-white/50">
          <X className="w-3.5 h-3.5 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={saving || !form.code || !form.name_pt} className="bg-blue-500 hover:bg-blue-600 text-white">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
          Save Pillar
        </Button>
      </div>
    </div>
  );
}

const EMPTY_Q = {
  code: '',
  text_pt: '',
  text_en: '',
  anchor_1_pt: '',
  anchor_2_pt: '',
  anchor_3_pt: '',
  anchor_4_pt: '',
  anchor_5_pt: '',
  anchor_1_en: '',
  anchor_2_en: '',
  anchor_3_en: '',
  anchor_4_en: '',
  anchor_5_en: '',
  subsection_pt: '',
  subsection_en: '',
  order: 0
};

function QuestionForm({ initial = EMPTY_Q, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="bg-[#0a1520] border border-white/10 rounded-xl p-4 space-y-3 ml-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Code *" value={form.code} onChange={v => set('code', v)} placeholder="e.g. Q1.1" />
        <Field label="Order" value={form.order} type="number" onChange={v => set('order', Number(v))} />
        <Field label="Subsection (PT)" value={form.subsection_pt} onChange={v => set('subsection_pt', v)} />
      </div>
      <Field label="Question (PT) *" value={form.text_pt} onChange={v => set('text_pt', v)} multiline />
      <Field label="Question (EN)" value={form.text_en} onChange={v => set('text_en', v)} multiline />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-white/40 mb-2 font-medium">Anchors (PT)</p>
          {[1, 2, 3, 4, 5].map(level => (
            <div key={level} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-white/20 w-3">{level}</span>
              <input
                value={form[`anchor_${level}_pt`]}
                onChange={e => set(`anchor_${level}_pt`, e.target.value)}
                placeholder={`Level ${level} (PT)`}
                className="flex-1 bg-[#152233] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs text-white/40 mb-2 font-medium">Anchors (EN)</p>
          {[1, 2, 3, 4, 5].map(level => (
            <div key={level} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-white/20 w-3">{level}</span>
              <input
                value={form[`anchor_${level}_en`]}
                onChange={e => set(`anchor_${level}_en`, e.target.value)}
                placeholder={`Level ${level} (EN)`}
                className="flex-1 bg-[#152233] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-white/50">
          <X className="w-3.5 h-3.5 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={saving || !form.code || !form.text_pt} className="bg-blue-500 hover:bg-blue-600 text-white">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
          Save Question
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', multiline = false }) {
  const cls = 'w-full bg-[#152233] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50';
  return (
    <div>
      <label className="text-xs text-white/40 mb-1 block">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} className={`${cls} resize-none`} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

function PillarBlock({ pillar, questions, onDeletePillar, onEditPillar, onSaveQuestion, onDeleteQuestion, saving }) {
  const [open, setOpen] = useState(false);
  const [addingQ, setAddingQ] = useState(false);
  const [editingQId, setEditingQId] = useState(null);
  const [expandedQId, setExpandedQId] = useState(null);
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  const isSub = pillar.assessment_type === 'sub_assessment';

  return (
    <div className={`border rounded-xl overflow-hidden ${isSub ? 'border-orange-500/20 bg-[#1a1508]' : 'border-white/10 bg-[#152233]'}`}>
      <div className={`flex items-center justify-between px-4 py-3 ${isSub ? 'border-b border-orange-500/10' : 'border-b border-white/10'}`}>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-3 flex-1 text-left">
          {pillar.icon && <span className="text-lg">{pillar.icon}</span>}
          <div>
            <span className="text-sm font-semibold text-white">{pillar.name_pt}</span>
            {pillar.name_en && <span className="text-xs text-white/30 ml-2">{pillar.name_en}</span>}
          </div>
          <span className="text-xs text-white/30">{pillar.weight}% · {sorted.length} questions</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-1 ${isSub ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {isSub ? 'Sub-Assessment' : 'Main'}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-white/30 ml-auto" /> : <ChevronDown className="w-4 h-4 text-white/30 ml-auto" />}
        </button>
        <div className="flex items-center gap-1 ml-3">
          <button onClick={() => onEditPillar(pillar)} className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-blue-400 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDeletePillar(pillar.id)} className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="p-3 space-y-2">
          {addingQ && (
            <QuestionForm
              onSave={async form => { await onSaveQuestion(form, null, pillar.code); setAddingQ(false); }}
              onCancel={() => setAddingQ(false)}
              saving={saving}
            />
          )}

          {sorted.map(question => (
            <div key={question.id} className="bg-[#0D1B2A] border border-white/5 rounded-lg overflow-hidden">
              {editingQId === question.id ? (
                <div className="p-3">
                  <QuestionForm
                    initial={question}
                    onSave={async form => { await onSaveQuestion(form, question.id, pillar.code); setEditingQId(null); }}
                    onCancel={() => setEditingQId(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <>
                  <button onClick={() => setExpandedQId(expandedQId === question.id ? null : question.id)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-white/30 font-mono flex-shrink-0">{question.code}</span>
                      <span className="text-xs text-white/70 truncate">{question.text_pt}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      <span className="text-xs text-white/20">#{question.order}</span>
                      <button onClick={e => { e.stopPropagation(); setEditingQId(question.id); setAddingQ(false); }} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-blue-400 transition-colors">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); onDeleteQuestion(question.id, pillar.code); }} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {expandedQId === question.id ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
                    </div>
                  </button>
                  {expandedQId === question.id && (
                    <div className="px-4 pb-3 space-y-2 border-t border-white/5">
                      {question.text_en && <p className="text-xs text-white/30 italic pt-2">{question.text_en}</p>}
                      <div className="grid grid-cols-2 gap-3">
                        {['pt', 'en'].map(lang => (
                          <div key={lang}>
                            <p className="text-xs text-white/25 mb-1 font-medium">Anchors ({lang.toUpperCase()})</p>
                            {[1, 2, 3, 4, 5].map(level => question[`anchor_${level}_${lang}`] && (
                              <div key={level} className="flex gap-2 mb-0.5">
                                <span className="text-xs font-bold text-white/20 w-3">{level}</span>
                                <span className="text-xs text-white/40">{question[`anchor_${level}_${lang}`]}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          <button onClick={() => { setAddingQ(true); setEditingQId(null); }} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/10 text-xs text-white/30 hover:text-white/60 hover:border-white/20 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add Question
          </button>
        </div>
      )}
    </div>
  );
}

export default function QuestionManager({ initialTemplateId = 'all' }) {
  const qc = useQueryClient();
  const [addingPillar, setAddingPillar] = useState(false);
  const [editingPillar, setEditingPillar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || 'all');

  const { data: templates = [] } = useQuery({
    queryKey: ['assessment-templates-all'],
    queryFn: () => base44.entities.AssessmentTemplate.list('order', 50),
  });

  const { data: pillars = [], isLoading: loadingPillars } = useQuery({
    queryKey: ['pillars'],
    queryFn: () => base44.entities.Pillar.list('order', 100),
  });

  const { data: questions = [], isLoading: loadingQs } = useQuery({
    queryKey: ['questions_all'],
    queryFn: () => base44.entities.Question.list('order', 500),
  });

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || null;

  const filterByTemplate = (list) => {
    if (selectedTemplateId === 'all') return list;
    if (selectedTemplateId === 'unassigned') return list.filter(pillar => !pillar.assessment_template_id);
    return list.filter(pillar => pillar.assessment_template_id === selectedTemplateId);
  };

  const shownPillars = filterByTemplate([...pillars]).sort((a, b) => a.order - b.order);

  const handleSavePillar = async (form, id = null) => {
    setSaving(true);
    const payload = {
      ...form,
      min_score: form.min_score === '' || form.min_score === null ? null : Number(form.min_score),
      weight: form.weight === '' ? 0 : Number(form.weight),
      order: form.order === '' ? 0 : Number(form.order),
      sub_assessment_template_id: form.sub_assessment_template_id || null,
      assessment_template_id: form.assessment_template_id || null
    };

    if (id) {
      await base44.entities.Pillar.update(id, payload);
      toast.success('Pillar updated');
      setEditingPillar(null);
    } else {
      await base44.entities.Pillar.create(payload);
      toast.success('Pillar created');
      setAddingPillar(false);
    }
    qc.invalidateQueries({ queryKey: ['pillars'] });
    qc.invalidateQueries({ queryKey: ['admin-templates'] });
    setSaving(false);
  };

  const handleDeletePillar = async (id) => {
    await base44.entities.Pillar.delete(id);
    toast.success('Pillar deleted');
    qc.invalidateQueries({ queryKey: ['pillars'] });
    qc.invalidateQueries({ queryKey: ['admin-templates'] });
  };

  const handleSaveQuestion = async (form, id, pillarCode) => {
    setSaving(true);
    if (id) {
      await base44.entities.Question.update(id, form);
      toast.success('Question updated');
    } else {
      await base44.entities.Question.create({ ...form, pillar_code: pillarCode });
      toast.success('Question created');
    }
    qc.invalidateQueries({ queryKey: ['questions_all'] });
    setSaving(false);
  };

  const handleDeleteQuestion = async (id) => {
    await base44.entities.Question.delete(id);
    toast.success('Question deleted');
    qc.invalidateQueries({ queryKey: ['questions_all'] });
  };

  if (loadingPillars || loadingQs) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Template:</span>
          <select
            value={selectedTemplateId}
            onChange={e => setSelectedTemplateId(e.target.value)}
            className="bg-[#152233] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">All Templates</option>
            <option value="unassigned">Unassigned</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name_pt}{template.name_en ? ` / ${template.name_en}` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedTemplate && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            (selectedTemplate.template_type || 'assessment') === 'sub_assessment'
              ? 'bg-orange-500/15 text-orange-300'
              : 'bg-blue-500/15 text-blue-300'
          }`}>
            {(selectedTemplate.template_type || 'assessment') === 'sub_assessment' ? 'Sub-Assessment Template' : 'Assessment Template'}
          </span>
        )}

        <div className="ml-auto">
          <Button size="sm" onClick={() => { setAddingPillar(true); setEditingPillar(null); }} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Pillar
          </Button>
        </div>
      </div>

      {addingPillar && (
        <PillarForm
          initial={{
            ...EMPTY_PILLAR,
            assessment_type: selectedTemplate?.template_type === 'sub_assessment' ? 'sub_assessment' : 'main',
            assessment_template_id: selectedTemplateId !== 'all' && selectedTemplateId !== 'unassigned' ? selectedTemplateId : ''
          }}
          onSave={form => handleSavePillar(form)}
          onCancel={() => setAddingPillar(false)}
          saving={saving}
          templates={templates}
        />
      )}

      {editingPillar && (
        <PillarForm
          initial={editingPillar}
          onSave={form => handleSavePillar(form, editingPillar.id)}
          onCancel={() => setEditingPillar(null)}
          saving={saving}
          templates={templates}
        />
      )}

      {shownPillars.length === 0 ? (
        <div className="bg-[#152233] border border-white/10 rounded-xl px-5 py-12 text-center text-white/25 text-sm">
          No pillars{selectedTemplateId !== 'all' ? ' for this template' : ''}. Add one above.
        </div>
      ) : (
        <div className="space-y-3">
          {shownPillars.map(pillar => (
            <PillarBlock
              key={pillar.id}
              pillar={pillar}
              questions={questions.filter(question => question.pillar_code === pillar.code)}
              onDeletePillar={handleDeletePillar}
              onEditPillar={setEditingPillar}
              onSaveQuestion={handleSaveQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  );
}
