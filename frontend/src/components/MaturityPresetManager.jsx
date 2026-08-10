import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Edit2, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const EMPTY_PRESET = {
  name: '',
  description: '',
  is_default: false,
  is_active: true,
  order: 0
};

const EMPTY_LEVEL = {
  preset_id: '',
  level: 1,
  min_score: 0,
  max_score: 5,
  label_pt: '',
  label_en: '',
  color: '#3b82f6',
  emoji: '',
  recommendation_pt: '',
  recommendation_en: '',
  order: 1
};

export default function MaturityPresetManager() {
  const qc = useQueryClient();
  const [expandedPreset, setExpandedPreset] = useState(null);
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [presetForm, setPresetForm] = useState(EMPTY_PRESET);
  const [editingLevelId, setEditingLevelId] = useState(null);
  const [levelForm, setLevelForm] = useState(EMPTY_LEVEL);
  const [savingPreset, setSavingPreset] = useState(false);
  const [savingLevel, setSavingLevel] = useState(false);

  const { data: presets = [], isLoading: loadingPresets } = useQuery({
    queryKey: ['maturity-presets'],
    queryFn: () => base44.entities.MaturityPreset.list('order', 100)
  });

  const { data: levels = [], isLoading: loadingLevels } = useQuery({
    queryKey: ['maturity-levels'],
    queryFn: () => base44.entities.MaturityLevel.list('order', 500)
  });

  const sortedPresets = useMemo(
    () => [...presets].sort((left, right) => (left.order || 0) - (right.order || 0)),
    [presets]
  );

  const getPresetLevels = (presetId) =>
    levels
      .filter((level) => level.preset_id === presetId)
      .sort((left, right) => {
        if ((left.order || 0) !== (right.order || 0)) {
          return (left.order || 0) - (right.order || 0);
        }
        return (left.level || 0) - (right.level || 0);
      });

  const setPresetField = (key, value) => setPresetForm((prev) => ({ ...prev, [key]: value }));
  const setLevelField = (key, value) => setLevelForm((prev) => ({ ...prev, [key]: value }));

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['maturity-presets'] }),
      qc.invalidateQueries({ queryKey: ['maturity-levels'] }),
      qc.invalidateQueries({ queryKey: ['admin-templates'] }),
      qc.invalidateQueries({ queryKey: ['assessment-templates'] })
    ]);
  };

  const unsetOtherDefaults = async (currentPresetId) => {
    const updates = sortedPresets
      .filter((preset) => preset.id !== currentPresetId && preset.is_default)
      .map((preset) => base44.entities.MaturityPreset.update(preset.id, { is_default: false }));

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  };

  const openNewPreset = () => {
    setEditingPresetId('new');
    setPresetForm({
      ...EMPTY_PRESET,
      order: sortedPresets.length + 1
    });
  };

  const openEditPreset = (preset) => {
    setEditingPresetId(preset.id);
    setPresetForm({
      name: preset.name || '',
      description: preset.description || '',
      is_default: preset.is_default ?? false,
      is_active: preset.is_active ?? true,
      order: preset.order ?? 0
    });
  };

  const savePreset = async () => {
    setSavingPreset(true);

    try {
      const payload = {
        ...presetForm,
        order: Number(presetForm.order || 0)
      };

      let presetId = editingPresetId;

      if (editingPresetId === 'new') {
        const created = await base44.entities.MaturityPreset.create(payload);
        presetId = created.id;
      } else {
        await base44.entities.MaturityPreset.update(editingPresetId, payload);
      }

      if (payload.is_default) {
        await unsetOtherDefaults(presetId);
      }

      toast.success(editingPresetId === 'new' ? 'Preset criado' : 'Preset atualizado');
      setEditingPresetId(null);
      setPresetForm(EMPTY_PRESET);
      await invalidateAll();
    } catch (error) {
      toast.error(error.message || 'Nao foi possivel guardar o preset');
    } finally {
      setSavingPreset(false);
    }
  };

  const deletePreset = async (presetId) => {
    if (!window.confirm('Apagar este preset e todos os seus niveis?')) {
      return;
    }

    try {
      const presetLevels = getPresetLevels(presetId);
      await Promise.all(presetLevels.map((level) => base44.entities.MaturityLevel.delete(level.id)));
      await base44.entities.MaturityPreset.delete(presetId);
      toast.success('Preset apagado');
      await invalidateAll();
    } catch (error) {
      toast.error(error.message || 'Nao foi possivel apagar o preset');
    }
  };

  const openNewLevel = (presetId) => {
    const presetLevels = getPresetLevels(presetId);
    setEditingLevelId('new');
    setLevelForm({
      ...EMPTY_LEVEL,
      preset_id: presetId,
      level: presetLevels.length + 1,
      order: presetLevels.length + 1
    });
  };

  const openEditLevel = (level) => {
    setEditingLevelId(level.id);
    setLevelForm({
      ...EMPTY_LEVEL,
      ...level
    });
  };

  const saveLevel = async () => {
    setSavingLevel(true);

    try {
      const payload = {
        ...levelForm,
        level: Number(levelForm.level || 0),
        min_score: Number(levelForm.min_score || 0),
        max_score: Number(levelForm.max_score || 0),
        order: Number(levelForm.order || 0)
      };

      if (editingLevelId === 'new') {
        await base44.entities.MaturityLevel.create(payload);
      } else {
        await base44.entities.MaturityLevel.update(editingLevelId, payload);
      }

      toast.success(editingLevelId === 'new' ? 'Nivel criado' : 'Nivel atualizado');
      setEditingLevelId(null);
      setLevelForm(EMPTY_LEVEL);
      await invalidateAll();
    } catch (error) {
      toast.error(error.message || 'Nao foi possivel guardar o nivel');
    } finally {
      setSavingLevel(false);
    }
  };

  const deleteLevel = async (levelId) => {
    try {
      await base44.entities.MaturityLevel.delete(levelId);
      toast.success('Nivel apagado');
      await invalidateAll();
    } catch (error) {
      toast.error(error.message || 'Nao foi possivel apagar o nivel');
    }
  };

  if (loadingPresets || loadingLevels) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-white/40">
          Configure a classificacao de maturidade usada pelos templates. Cada template pode apontar para um preset proprio ou herdar o preset default.
        </p>
        <Button size="sm" onClick={openNewPreset} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Novo Preset
        </Button>
      </div>

      {sortedPresets.length === 0 && (
        <div className="bg-[#152233] border border-white/10 rounded-xl p-6 text-center text-sm text-white/40">
          Nenhum preset encontrado.
        </div>
      )}

      {editingPresetId === 'new' && (
        <PresetForm
          form={presetForm}
          setField={setPresetField}
          onCancel={() => {
            setEditingPresetId(null);
            setPresetForm(EMPTY_PRESET);
          }}
          onSave={savePreset}
          saving={savingPreset}
          title="Novo preset"
        />
      )}

      {sortedPresets.map((preset) => {
        const presetLevels = getPresetLevels(preset.id);
        const isExpanded = expandedPreset === preset.id;
        const isEditingPreset = editingPresetId === preset.id;

        return (
          <div key={preset.id} className="bg-[#152233] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button onClick={() => setExpandedPreset(isExpanded ? null : preset.id)} className="text-white/40 hover:text-white">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
                    <span>{preset.name}</span>
                    {preset.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] bg-yellow-400/10 text-yellow-300">
                        <Star className="w-3 h-3" /> Default
                      </span>
                    )}
                    {preset.is_active === false && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] bg-red-400/10 text-red-300">Inativo</span>
                    )}
                  </div>
                  {preset.description && <div className="text-xs text-white/40">{preset.description}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30">{presetLevels.length} niveis</span>
                <Button variant="ghost" size="icon" onClick={() => openEditPreset(preset)} className="text-white/50 hover:text-white">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deletePreset(preset.id)} className="text-white/40 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {isEditingPreset && (
              <div className="p-4 border-b border-white/5 bg-[#0D1B2A]/40">
                <PresetForm
                  form={presetForm}
                  setField={setPresetField}
                  onCancel={() => {
                    setEditingPresetId(null);
                    setPresetForm(EMPTY_PRESET);
                  }}
                  onSave={savePreset}
                  saving={savingPreset}
                  title="Editar preset"
                  compact
                />
              </div>
            )}

            {isExpanded && (
              <div className="p-4 space-y-3">
                {presetLevels.map((level) => {
                  const isEditingLevel = editingLevelId === level.id;

                  return (
                    <div key={level.id} className="rounded-lg border border-white/10 bg-[#0D1B2A] p-3">
                      {isEditingLevel ? (
                        <LevelForm
                          form={levelForm}
                          setField={setLevelField}
                          onCancel={() => {
                            setEditingLevelId(null);
                            setLevelForm(EMPTY_LEVEL);
                          }}
                          onSave={saveLevel}
                          saving={savingLevel}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: level.color || '#3b82f6' }}>
                            {level.level}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-white font-medium">
                              {level.label_pt}
                              {level.label_en ? <span className="text-white/40"> / {level.label_en}</span> : null}
                            </div>
                            <div className="text-xs text-white/40">
                              {Number(level.min_score).toFixed(2)} ate {Number(level.max_score).toFixed(2)}
                            </div>
                            {level.recommendation_pt && (
                              <div className="text-xs text-white/50 mt-1">{level.recommendation_pt}</div>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => openEditLevel(level)} className="text-white/50 hover:text-white">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteLevel(level.id)} className="text-white/40 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {editingLevelId === 'new' && levelForm.preset_id === preset.id && (
                  <div className="rounded-lg border border-white/10 bg-[#0D1B2A] p-3">
                    <LevelForm
                      form={levelForm}
                      setField={setLevelField}
                      onCancel={() => {
                        setEditingLevelId(null);
                        setLevelForm(EMPTY_LEVEL);
                      }}
                      onSave={saveLevel}
                      saving={savingLevel}
                    />
                  </div>
                )}

                {editingLevelId !== 'new' && (
                  <Button size="sm" variant="outline" onClick={() => openNewLevel(preset.id)} className="border-white/10 text-white/70 hover:bg-white/5 gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Adicionar nivel
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PresetForm({ title, form, setField, onSave, onCancel, saving, compact = false }) {
  return (
    <div className="space-y-3">
      {!compact && <div className="text-sm font-semibold text-white">{title}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-white/50">Nome *</Label>
          <Input value={form.name} onChange={(event) => setField('name', event.target.value)} className="mt-1 bg-[#0D1B2A] border-white/10 text-white" />
        </div>
        <div>
          <Label className="text-xs text-white/50">Descricao</Label>
          <Input value={form.description} onChange={(event) => setField('description', event.target.value)} className="mt-1 bg-[#0D1B2A] border-white/10 text-white" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={form.is_default} onChange={(event) => setField('is_default', event.target.checked)} className="w-4 h-4 accent-blue-500" />
          Default
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={form.is_active} onChange={(event) => setField('is_active', event.target.checked)} className="w-4 h-4 accent-blue-500" />
          Ativo
        </label>
        <div className="w-24">
          <Label className="text-xs text-white/50">Ordem</Label>
          <Input type="number" value={form.order} onChange={(event) => setField('order', event.target.value)} className="mt-1 bg-[#0D1B2A] border-white/10 text-white" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-white/50">Cancelar</Button>
        <Button size="sm" onClick={onSave} disabled={saving || !form.name} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Guardar
        </Button>
      </div>
    </div>
  );
}

function LevelForm({ form, setField, onSave, onCancel, saving }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs text-white/50">Nivel</Label>
          <Input type="number" value={form.level} onChange={(event) => setField('level', event.target.value)} className="mt-1 bg-[#152233] border-white/10 text-white" />
        </div>
        <div>
          <Label className="text-xs text-white/50">Min score</Label>
          <Input type="number" step="0.01" value={form.min_score} onChange={(event) => setField('min_score', event.target.value)} className="mt-1 bg-[#152233] border-white/10 text-white" />
        </div>
        <div>
          <Label className="text-xs text-white/50">Max score</Label>
          <Input type="number" step="0.01" value={form.max_score} onChange={(event) => setField('max_score', event.target.value)} className="mt-1 bg-[#152233] border-white/10 text-white" />
        </div>
        <div>
          <Label className="text-xs text-white/50">Ordem</Label>
          <Input type="number" value={form.order} onChange={(event) => setField('order', event.target.value)} className="mt-1 bg-[#152233] border-white/10 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-white/50">Label PT *</Label>
          <Input value={form.label_pt} onChange={(event) => setField('label_pt', event.target.value)} className="mt-1 bg-[#152233] border-white/10 text-white" />
        </div>
        <div>
          <Label className="text-xs text-white/50">Label EN</Label>
          <Input value={form.label_en} onChange={(event) => setField('label_en', event.target.value)} className="mt-1 bg-[#152233] border-white/10 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-white/50">Cor</Label>
          <div className="flex gap-2 mt-1">
            <input type="color" value={form.color || '#3b82f6'} onChange={(event) => setField('color', event.target.value)} className="w-10 h-10 rounded border border-white/10 bg-transparent" />
            <Input value={form.color} onChange={(event) => setField('color', event.target.value)} className="bg-[#152233] border-white/10 text-white" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-white/50">Emoji ou chave</Label>
          <Input value={form.emoji} onChange={(event) => setField('emoji', event.target.value)} className="mt-1 bg-[#152233] border-white/10 text-white" placeholder="red / orange / green" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-white/50">Recomendacao PT</Label>
          <Textarea value={form.recommendation_pt} onChange={(event) => setField('recommendation_pt', event.target.value)} rows={3} className="mt-1 bg-[#152233] border-white/10 text-white" />
        </div>
        <div>
          <Label className="text-xs text-white/50">Recomendacao EN</Label>
          <Textarea value={form.recommendation_en} onChange={(event) => setField('recommendation_en', event.target.value)} rows={3} className="mt-1 bg-[#152233] border-white/10 text-white" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-white/50">Cancelar</Button>
        <Button size="sm" onClick={onSave} disabled={saving || !form.label_pt} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Guardar nivel
        </Button>
      </div>
    </div>
  );
}
