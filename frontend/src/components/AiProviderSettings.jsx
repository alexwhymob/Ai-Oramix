import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, KeyRound, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const EMPTY_FORM = {
  provider: 'openai',
  model: '',
  apiKey: ''
};

export default function AiProviderSettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ['ai-provider-config'],
    queryFn: () => base44.users.getAiProviderConfig()
  });

  const { data: modelResponse, isLoading: loadingModels } = useQuery({
    queryKey: ['ai-provider-models', form.provider],
    queryFn: () => base44.users.listAiProviderModels(form.provider),
    enabled: Boolean(form.provider)
  });

  useEffect(() => {
    if (!config) return;
    setForm({
      provider: config.provider || 'openai',
      model: config.model || '',
      apiKey: ''
    });
  }, [config]);

  useEffect(() => {
    const models = modelResponse?.models || [];
    if (!models.length) return;
    if (models.some((model) => model.id === form.model)) return;
    setForm((prev) => ({ ...prev, model: models[0].id }));
  }, [modelResponse, form.model]);

  const selectedProviderMeta = useMemo(() => {
    return config?.providers?.find((provider) => provider.value === form.provider) || null;
  }, [config?.providers, form.provider]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.users.updateAiProviderConfig(form);
      toast.success('AI provider configuration saved');
      setForm((prev) => ({ ...prev, apiKey: '' }));
      qc.invalidateQueries({ queryKey: ['ai-provider-config'] });
      qc.invalidateQueries({ queryKey: ['ai-provider-models', form.provider] });
    } finally {
      setSaving(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="bg-[#152233] border border-white/10 rounded-xl p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(config?.providers || []).map((provider) => {
          const selected = provider.value === form.provider;
          return (
            <div
              key={provider.value}
              className={`rounded-xl border p-4 transition-colors ${
                selected
                  ? 'border-blue-500/40 bg-blue-500/10'
                  : 'border-white/10 bg-[#152233]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{provider.label}</div>
                  <div className="text-xs text-white/40 mt-1">
                    {provider.has_api_key ? `API key stored: ${provider.api_key_masked}` : 'No API key stored'}
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${selected ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-white/50'}`}>
                  {selected ? 'Selected' : 'Available'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#152233] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Provider AI</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white/70">Provider</Label>
            <Select value={form.provider} onValueChange={(value) => setForm((prev) => ({ ...prev, provider: value, model: '' }))}>
              <SelectTrigger className="mt-1 bg-[#0D1B2A] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(config?.providers || []).map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>{provider.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white/70">Model</Label>
            <Select value={form.model} onValueChange={(value) => setForm((prev) => ({ ...prev, model: value }))} disabled={loadingModels}>
              <SelectTrigger className="mt-1 bg-[#0D1B2A] border-white/10 text-white">
                <SelectValue placeholder={loadingModels ? 'Loading models...' : 'Select a model'} />
              </SelectTrigger>
              <SelectContent>
                {(modelResponse?.models || []).map((model) => (
                  <SelectItem key={model.id} value={model.id}>{model.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-white/70">API key</Label>
          <Input
            type="password"
            value={form.apiKey}
            onChange={(event) => setForm((prev) => ({ ...prev, apiKey: event.target.value }))}
            placeholder={selectedProviderMeta?.has_api_key ? `Stored key: ${selectedProviderMeta.api_key_masked}` : 'Paste the API key for this provider'}
            className="mt-1 bg-[#0D1B2A] border-white/10 text-white placeholder:text-white/30"
          />
          <div className="mt-2 text-xs text-white/40 flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5" />
            Leave this blank to keep the currently stored key.
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0D1B2A] px-3 py-3 text-xs text-white/50">
          The selected provider and model will be used by the platform AI services. Stored keys are masked after save for security.
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !form.provider || !form.model}
            className="bg-blue-500 hover:bg-blue-600 text-white gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
