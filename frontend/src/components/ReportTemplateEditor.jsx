import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronUp, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SECTION_KEYS = ['section_1', 'section_2', 'section_3', 'section_4', 'section_5', 'section_6', 'section_7', 'section_8', 'section_9'];
const CONTEXT_OPTIONS = [
  { key: 'org', label: 'Org Info' },
  { key: 'score', label: 'Global Score' },
  { key: 'pillars', label: 'Pillar Scores' },
  { key: 'answers', label: 'Detailed Answers' }
];

export default function ReportTemplateEditor({ template, sections: dbSections = [], onSave, onCancel }) {
  const formatSections = (sections) => (sections || []).map((section) => {
    let contextKeys = section.context_keys;
    if (typeof contextKeys === 'string') {
      try {
        contextKeys = JSON.parse(contextKeys);
      } catch {
        contextKeys = ['org', 'score', 'pillars', 'answers'];
      }
    }

    return {
      ...section,
      context_keys: Array.isArray(contextKeys) ? contextKeys : ['org', 'score', 'pillars', 'answers']
    };
  }).sort((left, right) => (left.order || 0) - (right.order || 0));

  const [form, setForm] = useState({
    name: template?.name || '',
    code: template?.code || '',
    description: template?.description || '',
    system_prompt: template?.system_prompt || '',
    style_guide: template?.style_guide || '',
    is_default: template?.is_default || false,
    is_active: template?.is_active ?? true,
    order: template?.order || 0
  });
  const [sections, setSections] = useState(() => formatSections(dbSections));
  const [saving, setSaving] = useState(false);
  const [schemaExpanded, setSchemaExpanded] = useState({});

  useEffect(() => {
    setSections(formatSections(dbSections));
  }, [dbSections]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addSection = () => {
    const used = new Set(sections.map((section) => section.key));
    const nextKey = SECTION_KEYS.find((key) => !used.has(key)) || `section_${sections.length + 1}`;
    setSections((prev) => [
      ...prev,
      {
        key: nextKey,
        title: '',
        prompt: '',
        context_keys: ['org', 'score', 'pillars', 'answers'],
        json_schema: ''
      }
    ]);
  };

  const updateSection = (index, field, value) => {
    setSections((prev) => prev.map((section, currentIndex) => (
      currentIndex === index ? { ...section, [field]: value } : section
    )));
  };

  const removeSection = (index) => {
    setSections((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const moveSection = (index, direction) => {
    setSections((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const toggleContext = (index, key) => {
    setSections((prev) => prev.map((section, currentIndex) => {
      if (currentIndex !== index) return section;
      const currentKeys = section.context_keys || [];
      return {
        ...section,
        context_keys: currentKeys.includes(key)
          ? currentKeys.filter((item) => item !== key)
          : [...currentKeys, key]
      };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        order: Number(form.order || 0),
        sections
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-[#0D1B2A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50';

  return (
    <div className="bg-[#152233] border border-white/10 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 mb-1 block">Name *</label>
          <input value={form.name} onChange={(event) => setField('name', event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1 block">Code *</label>
          <input value={form.code} onChange={(event) => setField('code', event.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
        <div>
          <label className="text-xs text-white/40 mb-1 block">Description</label>
          <input value={form.description} onChange={(event) => setField('description', event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1 block">Order</label>
          <input type="number" value={form.order} onChange={(event) => setField('order', event.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="text-xs text-white/40 mb-1 block">System Prompt *</label>
        <textarea value={form.system_prompt} onChange={(event) => setField('system_prompt', event.target.value)} rows={4} className={`${inputClass} resize-none font-mono text-xs`} />
      </div>

      <div>
        <label className="text-xs text-white/40 mb-1 block">Style Guide</label>
        <textarea value={form.style_guide} onChange={(event) => setField('style_guide', event.target.value)} rows={6} className={`${inputClass} resize-none font-mono text-xs`} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-white/40">Sections ({sections.length})</label>
          <button onClick={addSection} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded-lg">
            <Plus className="w-3 h-3" /> Add Section
          </button>
        </div>

        <div className="space-y-2">
          {sections.map((section, index) => (
            <div key={section.id || `${section.key}-${index}`} className="bg-[#0D1B2A] border border-white/10 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <select value={section.key} onChange={(event) => updateSection(index, 'key', event.target.value)} className="bg-[#152233] border border-white/10 rounded px-2 py-1 text-xs text-white">
                  {SECTION_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
                </select>
                <input value={section.title} onChange={(event) => updateSection(index, 'title', event.target.value)} className="flex-1 bg-[#152233] border border-white/10 rounded px-2 py-1 text-xs text-white" placeholder="Section title" />
                <button onClick={() => moveSection(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-white/10 text-white/30 disabled:opacity-20">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1} className="p-1 rounded hover:bg-white/10 text-white/30 disabled:opacity-20">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => removeSection(index)} className="p-1 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <textarea value={section.prompt} onChange={(event) => updateSection(index, 'prompt', event.target.value)} rows={3} className="w-full bg-[#152233] border border-white/10 rounded px-2 py-1.5 text-xs text-white/80 font-mono resize-none" placeholder="Prompt for this section" />

              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-white/30">Context:</span>
                {CONTEXT_OPTIONS.map((option) => {
                  const active = (section.context_keys || []).includes(option.key);
                  return (
                    <button
                      key={option.key}
                      onClick={() => toggleContext(index, option.key)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${active ? 'bg-green-500/15 text-green-400 border border-green-500/25' : 'bg-white/5 text-white/30 border border-white/10'}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div>
                <button
                  onClick={() => setSchemaExpanded((prev) => ({ ...prev, [index]: !prev[index] }))}
                  className="flex items-center gap-1 text-[10px] text-white/30 hover:text-blue-400"
                >
                  <ChevronRight className={`w-3 h-3 transition-transform ${schemaExpanded[index] ? 'rotate-90' : ''}`} />
                  JSON Schema {section.json_schema ? '(defined)' : '(optional)'}
                </button>

                {schemaExpanded[index] && (
                  <textarea value={section.json_schema || ''} onChange={(event) => updateSection(index, 'json_schema', event.target.value)} rows={6} className="w-full mt-1 bg-[#152233] border border-white/10 rounded px-2 py-1.5 text-[10px] text-white/60 font-mono resize-none" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_default} onChange={(event) => setField('is_default', event.target.checked)} className="w-4 h-4 accent-blue-500" />
          <span className="text-sm text-white/70">Default template</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={(event) => setField('is_active', event.target.checked)} className="w-4 h-4 accent-blue-500" />
          <span className="text-sm text-white/70">Active</span>
        </label>
      </div>

      <div className="flex gap-2 pt-2 border-t border-white/5">
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-white/50">
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !form.name || !form.code || !form.system_prompt} className="bg-blue-500 hover:bg-blue-600 text-white">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />} Save Template
        </Button>
      </div>
    </div>
  );
}
