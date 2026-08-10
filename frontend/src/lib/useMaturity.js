import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getMaturityLevel } from '@/lib/scoring';

const COLOR_STYLES = {
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', emoji: '🔴' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', emoji: '🟠' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', emoji: '🟡' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', emoji: '🟢' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', emoji: '🔵' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', emoji: '⚪' },
  neutral: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', emoji: '⚪' }
};

const COLOR_HEX = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  gray: '#9ca3af',
  neutral: '#9ca3af'
};

function resolveStyles(level, fallbackLevel) {
  const styleKey = String(level.emoji || fallbackLevel.emoji || level.color || 'gray').toLowerCase();
  return COLOR_STYLES[styleKey] || {
    bg: fallbackLevel.bg,
    text: fallbackLevel.text,
    border: fallbackLevel.border,
    emoji: fallbackLevel.emoji
  };
}

export function getLevelDisplayColor(level, fallbackColor = '#3b82f6') {
  if (!level) {
    return fallbackColor;
  }

  if (level.color && String(level.color).startsWith('#')) {
    return level.color;
  }

  return COLOR_HEX[String(level.color || level.emoji || '').toLowerCase()] || fallbackColor;
}

export function useMaturityData() {
  const { data: presets = [] } = useQuery({
    queryKey: ['maturity-presets'],
    queryFn: () => base44.entities.MaturityPreset.list('order', 100)
  });

  const { data: levels = [] } = useQuery({
    queryKey: ['maturity-levels'],
    queryFn: () => base44.entities.MaturityLevel.list('order', 500)
  });

  const activePresets = useMemo(
    () => presets.filter((preset) => preset.is_active !== false).sort((left, right) => (left.order || 0) - (right.order || 0)),
    [presets]
  );

  const defaultPreset = useMemo(
    () => activePresets.find((preset) => preset.is_default) || activePresets[0] || null,
    [activePresets]
  );

  const levelsByPreset = useMemo(() => {
    const map = new Map();

    levels.forEach((level) => {
      if (!map.has(level.preset_id)) {
        map.set(level.preset_id, []);
      }
      map.get(level.preset_id).push(level);
    });

    map.forEach((presetLevels) => {
      presetLevels.sort((left, right) => {
        if ((left.order || 0) !== (right.order || 0)) {
          return (left.order || 0) - (right.order || 0);
        }
        return (left.level || 0) - (right.level || 0);
      });
    });

    return map;
  }, [levels]);

  const resolvePresetId = (presetId) => presetId || defaultPreset?.id || null;

  const resolveLevel = (score, presetId) => {
    const resolvedPresetId = resolvePresetId(presetId);
    const numericScore = Number(score);

    if (!resolvedPresetId || !Number.isFinite(numericScore)) {
      return getMaturityLevel(score);
    }

    const presetLevels = levelsByPreset.get(resolvedPresetId) || [];
    const matchedLevel = presetLevels.find((level) => numericScore >= Number(level.min_score) && numericScore <= Number(level.max_score));

    if (!matchedLevel) {
      return getMaturityLevel(score);
    }

    const fallbackLevel = getMaturityLevel(score);
    const styles = resolveStyles(matchedLevel, fallbackLevel);

    return {
      ...fallbackLevel,
      ...matchedLevel,
      ...styles,
      key: `preset-${resolvedPresetId}-${matchedLevel.level}`
    };
  };

  return {
    presets: activePresets,
    defaultPreset,
    resolvePresetId,
    resolveLevel
  };
}
