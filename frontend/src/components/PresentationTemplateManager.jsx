import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileChartColumnIncreasing, Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const EMPTY_TEMPLATE = {
  code: '',
  name: '',
  description: '',
  active: true,
  is_default: false,
  sort_order: 0,
  theme_primary_color: '#2563EB',
  theme_secondary_color: '#0F172A',
  theme_accent_color: '#F59E0B',
  branding_logo_url: '',
  branding_cover_image_url: '',
  branding_footer_text: 'Confidential - Oramix',
  cover_title_pt: 'Relatorio Executivo de Maturidade',
  cover_title_en: 'Executive Readiness Presentation',
  cover_subtitle_pt: 'Resumo executivo da avaliacao',
  cover_subtitle_en: 'Executive summary of the assessment',
  include_summary: true,
  include_global_score: true,
  include_pillar_chart: true,
  include_radar_chart: true,
  include_quick_wins: true,
  include_roadmap: true,
  include_use_cases: true,
  include_consultant_notes: false,
  pillar_chart_type: 'bar',
  score_chart_type: 'doughnut',
  max_summary_bullets: 5,
  max_quick_wins: 4,
  max_use_cases: 3,
  max_consultant_notes: 4
};

export default function PresentationTemplateManager() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const [saving, setSaving] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['presentation_templates'],
    queryFn: () => base44.entities.PresentationTemplate.list('sort_order')
  });

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) || null,
    [templates, selectedId]
  );

  useEffect(() => {
    if (selectedId || templates.length === 0) return;
    const preferred = templates.find((template) => template.is_default) || templates[0];
    if (preferred) {
      startEdit(preferred);
    }
  }, [templates, selectedId]);

  const startCreate = () => {
    setSelectedId(null);
    setDraft({
      ...EMPTY_TEMPLATE,
      code: `ppt-${Date.now()}`
    });
  };

  const startEdit = (template) => {
    setSelectedId(template.id);
    setDraft({
      ...EMPTY_TEMPLATE,
      ...template
    });
  };

  const setField = (key, value) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  const handleSave = async () => {
    if (!draft.code || !draft.name) {
      toast.error('Code and name are required');
      return;
    }

    setSaving(true);
    try {
      let savedRecord;
      if (selectedId) {
        savedRecord = await base44.entities.PresentationTemplate.update(selectedId, draft);
      } else {
        savedRecord = await base44.entities.PresentationTemplate.create(draft);
      }
      await qc.invalidateQueries({ queryKey: ['presentation_templates'] });
      await qc.invalidateQueries({ queryKey: ['presentation_templates_active'] });
      if (savedRecord?.id) {
        setSelectedId(savedRecord.id);
        setDraft({
          ...EMPTY_TEMPLATE,
          ...savedRecord
        });
      }
      toast.success('Presentation template saved');
    } catch (error) {
      toast.error(error?.data?.message || error?.message || 'Failed to save presentation template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileChartColumnIncreasing className="w-5 h-5 text-blue-400" /> Presentation Templates
          </h2>
          <p className="text-sm text-white/40 mt-1">
            Configure the executive PowerPoint layouts used by report export.
          </p>
        </div>
        <Button type="button" onClick={startCreate} className="bg-blue-500 hover:bg-blue-600 text-white gap-2">
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
        <div className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-white/70">
            Available Templates
          </div>
          {isLoading ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => startEdit(template)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedId === template.id ? 'bg-blue-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-white">{template.name}</div>
                    <div className="flex gap-2">
                      {template.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Default</span>}
                      {!template.active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">Inactive</span>}
                    </div>
                  </div>
                  <div className="text-xs text-white/40 mt-1">{template.code}</div>
                </button>
              ))}
              {templates.length === 0 && (
                <div className="px-4 py-8 text-sm text-center text-white/35">
                  No presentation templates yet.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#152233] border border-white/10 rounded-xl p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Code" value={draft.code} onChange={(value) => setField('code', value)} placeholder="executive-default" />
            <Field label="Name" value={draft.name} onChange={(value) => setField('name', value)} placeholder="Executive Default" />
            <Field label="Description" value={draft.description} onChange={(value) => setField('description', value)} placeholder="Short description" />
            <Field label="Sort Order" value={draft.sort_order} onChange={(value) => setField('sort_order', Number(value) || 0)} type="number" placeholder="0" />
            <Field label="Primary Color" value={draft.theme_primary_color} onChange={(value) => setField('theme_primary_color', value)} placeholder="#2563EB" />
            <Field label="Secondary Color" value={draft.theme_secondary_color} onChange={(value) => setField('theme_secondary_color', value)} placeholder="#0F172A" />
            <Field label="Accent Color" value={draft.theme_accent_color} onChange={(value) => setField('theme_accent_color', value)} placeholder="#F59E0B" />
            <Field label="Footer Text" value={draft.branding_footer_text} onChange={(value) => setField('branding_footer_text', value)} placeholder="Confidential - Oramix" />
            <Field label="Logo URL" value={draft.branding_logo_url} onChange={(value) => setField('branding_logo_url', value)} placeholder="https://..." />
            <Field label="Cover Image URL" value={draft.branding_cover_image_url} onChange={(value) => setField('branding_cover_image_url', value)} placeholder="https://..." />
            <Field label="Cover Title PT" value={draft.cover_title_pt} onChange={(value) => setField('cover_title_pt', value)} placeholder="Relatorio Executivo de Maturidade" />
            <Field label="Cover Title EN" value={draft.cover_title_en} onChange={(value) => setField('cover_title_en', value)} placeholder="Executive Readiness Presentation" />
            <Field label="Cover Subtitle PT" value={draft.cover_subtitle_pt} onChange={(value) => setField('cover_subtitle_pt', value)} placeholder="Resumo executivo da avaliacao" />
            <Field label="Cover Subtitle EN" value={draft.cover_subtitle_en} onChange={(value) => setField('cover_subtitle_en', value)} placeholder="Executive summary of the assessment" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="text-sm font-medium text-white/70">Slides</div>
              <CheckRow label="Summary" checked={draft.include_summary} onChange={(value) => setField('include_summary', value)} />
              <CheckRow label="Global score" checked={draft.include_global_score} onChange={(value) => setField('include_global_score', value)} />
              <CheckRow label="Pillar chart" checked={draft.include_pillar_chart} onChange={(value) => setField('include_pillar_chart', value)} />
              <CheckRow label="Radar chart" checked={draft.include_radar_chart} onChange={(value) => setField('include_radar_chart', value)} />
              <CheckRow label="Quick wins" checked={draft.include_quick_wins} onChange={(value) => setField('include_quick_wins', value)} />
              <CheckRow label="Roadmap" checked={draft.include_roadmap} onChange={(value) => setField('include_roadmap', value)} />
              <CheckRow label="Use cases" checked={draft.include_use_cases} onChange={(value) => setField('include_use_cases', value)} />
              <CheckRow label="Consultant notes" checked={draft.include_consultant_notes} onChange={(value) => setField('include_consultant_notes', value)} />
              <CheckRow label="Active" checked={draft.active} onChange={(value) => setField('active', value)} />
              <CheckRow label="Default template" checked={draft.is_default} onChange={(value) => setField('is_default', value)} />
            </div>

            <div className="space-y-4">
              <SelectField
                label="Pillar Chart Type"
                value={draft.pillar_chart_type}
                onChange={(value) => setField('pillar_chart_type', value)}
                options={[
                  { value: 'bar', label: 'Horizontal Bar' },
                  { value: 'column', label: 'Column' }
                ]}
              />
              <SelectField
                label="Score Chart Type"
                value={draft.score_chart_type}
                onChange={(value) => setField('score_chart_type', value)}
                options={[
                  { value: 'doughnut', label: 'Doughnut' },
                  { value: 'bar', label: 'Bar' }
                ]}
              />
              <Field label="Max Summary Bullets" value={draft.max_summary_bullets} onChange={(value) => setField('max_summary_bullets', Number(value) || 0)} type="number" placeholder="5" />
              <Field label="Max Quick Wins" value={draft.max_quick_wins} onChange={(value) => setField('max_quick_wins', Number(value) || 0)} type="number" placeholder="4" />
              <Field label="Max Use Cases" value={draft.max_use_cases} onChange={(value) => setField('max_use_cases', Number(value) || 0)} type="number" placeholder="3" />
              <Field label="Max Consultant Notes" value={draft.max_consultant_notes} onChange={(value) => setField('max_consultant_notes', Number(value) || 0)} type="number" placeholder="4" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Template
            </Button>
          </div>

          {!selectedTemplate && (
            <div className="text-xs text-amber-300/80">
              Select an existing template or click <span className="text-white/70">New Template</span> before saving.
            </div>
          )}

          {selectedTemplate && (
            <div className="text-xs text-white/35">
              Editing template <span className="text-white/60">{selectedTemplate.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-white/50 mb-1.5">{label}</div>
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0D1B2A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-white/50 mb-1.5">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-[#0D1B2A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 text-sm text-white/75">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        className="w-4 h-4 accent-blue-500"
      />
      <span>{label}</span>
    </label>
  );
}
