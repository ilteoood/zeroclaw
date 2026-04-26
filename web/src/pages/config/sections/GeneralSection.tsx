import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import SectionCard from '../controls/SectionCard';
import FieldRow from '../controls/FieldRow';
import NumberInput from '../controls/NumberInput';
import Slider from '../controls/Slider';
import Select from '../controls/Select';
import { t } from '@/lib/i18n';
import { getProviders, getProviderModels } from '@/lib/api';
import type { ProviderInfo } from '@/types/api';

interface Props {
  config: Record<string, unknown>;
  onUpdate: (field: string, value: unknown) => void;
}

const LOCALE_OPTIONS = [
  { value: '', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'tr', label: 'Türkçe' },
];

const DEFAULT_PROVIDER = 'openrouter';
const DEFAULT_TEMPERATURE = 0.7;

function readFallbackProvider(config: Record<string, unknown>): string {
  const providers = config.providers as Record<string, unknown> | undefined;
  const fallback = providers?.fallback;
  return typeof fallback === 'string' && fallback.length > 0 ? fallback : DEFAULT_PROVIDER;
}

function readFallbackProfile(
  config: Record<string, unknown>,
  provider: string,
): Record<string, unknown> | undefined {
  const providers = config.providers as Record<string, unknown> | undefined;
  const models = providers?.models as Record<string, unknown> | undefined;
  const profile = models?.[provider];
  return typeof profile === 'object' && profile !== null
    ? (profile as Record<string, unknown>)
    : undefined;
}

export default function GeneralSection({ config, onUpdate }: Props) {
  const provider = readFallbackProvider(config);
  const profile = readFallbackProfile(config, provider);
  const currentModel = (profile?.model as string | undefined) ?? '';
  const currentTemperature = profile?.temperature;
  const sliderTemperature =
    typeof currentTemperature === 'number' ? currentTemperature : DEFAULT_TEMPERATURE;
  const currentTimeout = profile?.timeout_secs;

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Fetch the provider catalog from the gateway once on mount.
  useEffect(() => {
    let cancelled = false;
    getProviders()
      .then((list) => {
        if (cancelled) return;
        setProviders(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setProvidersError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the model catalog whenever the selected provider changes.
  useEffect(() => {
    if (!provider) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    setModelsError(null);
    getProviderModels(provider)
      .then((list) => {
        if (cancelled) return;
        setModels(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setModels([]);
        setModelsError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (cancelled) return;
        setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const providerOptions = providers.length > 0
    ? providers.map((p) => ({ value: p.name, label: p.display_name }))
    : [{ value: provider, label: provider }];

  // Make sure the currently selected provider is always selectable, even
  // before the catalog has loaded or when it's a custom alias.
  const hasCurrentProvider = providerOptions.some((o) => o.value === provider);
  const renderedProviderOptions = hasCurrentProvider
    ? providerOptions
    : [{ value: provider, label: provider }, ...providerOptions];

  const modelOptions = models.map((id) => ({ value: id, label: id }));
  const hasCurrentModel = currentModel && modelOptions.some((o) => o.value === currentModel);
  const renderedModelOptions = hasCurrentModel || !currentModel
    ? modelOptions
    : [{ value: currentModel, label: currentModel }, ...modelOptions];

  const handleProviderChange = (next: string) => {
    onUpdate('providers.fallback', next);
  };

  const handleModelChange = (next: string) => {
    onUpdate(`providers.models.${provider}.model`, next);
  };

  const handleTemperatureChange = (next: number) => {
    onUpdate(`providers.models.${provider}.temperature`, next);
  };

  const handleTimeoutChange = (next: number) => {
    onUpdate(`providers.models.${provider}.timeout_secs`, next);
  };

  return (
    <SectionCard
      icon={<Zap className="h-5 w-5" />}
      title={t('config.section.general')}
      defaultOpen
    >
      <FieldRow label={t('config.field.default_provider')} description={t('config.field.default_provider.desc')}>
        <div className="flex flex-col items-end gap-1">
          <Select
            value={provider}
            onChange={handleProviderChange}
            options={renderedProviderOptions}
          />
          {providersError && (
            <span className="text-xs" style={{ color: 'var(--pc-text-secondary)' }}>
              {providersError}
            </span>
          )}
        </div>
      </FieldRow>
      <FieldRow label={t('config.field.default_model')} description={t('config.field.default_model.desc')}>
        <div className="flex flex-col items-end gap-1">
          {modelsLoading ? (
            <input
              type="text"
              value={currentModel}
              onChange={(e) => handleModelChange(e.target.value)}
              placeholder="loading models…"
              className="input-electric text-sm px-3 py-1.5 w-52 font-mono"
              disabled
            />
          ) : renderedModelOptions.length > 0 ? (
            <Select
              value={currentModel}
              onChange={handleModelChange}
              options={renderedModelOptions}
            />
          ) : (
            <input
              type="text"
              value={currentModel}
              onChange={(e) => handleModelChange(e.target.value)}
              placeholder="model name"
              className="input-electric text-sm px-3 py-1.5 w-52 font-mono"
            />
          )}
          {modelsError && (
            <span className="text-xs" style={{ color: 'var(--pc-text-secondary)' }}>
              {modelsError}
            </span>
          )}
        </div>
      </FieldRow>
      <FieldRow label={t('config.field.default_temperature')} description={t('config.field.default_temperature.desc')}>
        <Slider
          value={sliderTemperature}
          onChange={handleTemperatureChange}
          min={0}
          max={2}
          step={0.1}
        />
      </FieldRow>
      <FieldRow label={t('config.field.provider_timeout_secs')} description={t('config.field.provider_timeout_secs.desc')}>
        <NumberInput
          value={(currentTimeout as number | undefined) ?? 120}
          onChange={handleTimeoutChange}
          min={1}
        />
      </FieldRow>
      <FieldRow label={t('config.field.locale')} description={t('config.field.locale.desc')}>
        <Select
          value={(config.locale as string) ?? ''}
          onChange={(v) => onUpdate('locale', v || undefined)}
          options={LOCALE_OPTIONS}
        />
      </FieldRow>
    </SectionCard>
  );
}
