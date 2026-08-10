import { AssessmentTemplate, MaturityLevel, MaturityPreset } from '../models/index.js';

const DEFAULT_PRESET_CODE = 'default-ai-readiness';
const DEFAULT_PRESET_NAME = 'Default AI Readiness';

const DEFAULT_LEVELS = [
  {
    level: 1,
    min_score: 1,
    max_score: 1.99,
    label_pt: 'Nao Preparado',
    label_en: 'Not Ready',
    color: '#ef4444',
    emoji: 'red',
    recommendation_pt: 'Projeto fundacional de dados e governance antes de considerar IA',
    recommendation_en: 'Foundational data and governance project before considering AI',
    order: 1
  },
  {
    level: 2,
    min_score: 2,
    max_score: 2.99,
    label_pt: 'Emergente',
    label_en: 'Emerging',
    color: '#f97316',
    emoji: 'orange',
    recommendation_pt: 'Investir em quick wins de dados + formacao; pilotos so em processos simples',
    recommendation_en: 'Invest in data quick wins + training; pilots only in simple processes',
    order: 2
  },
  {
    level: 3,
    min_score: 3,
    max_score: 3.59,
    label_pt: 'Em Desenvolvimento',
    label_en: 'Developing',
    color: '#eab308',
    emoji: 'yellow',
    recommendation_pt: 'Pilotos focados nos gaps identificados; reforcar seguranca e compliance',
    recommendation_en: 'Pilots focused on identified gaps; reinforce security and compliance',
    order: 3
  },
  {
    level: 4,
    min_score: 3.6,
    max_score: 4.29,
    label_pt: 'Preparado',
    label_en: 'Ready',
    color: '#22c55e',
    emoji: 'green',
    recommendation_pt: 'Projetos de IA com confianca; focar em governance e ROI',
    recommendation_en: 'AI projects with confidence; focus on governance and ROI',
    order: 4
  },
  {
    level: 5,
    min_score: 4.3,
    max_score: 5,
    label_pt: 'Avancado',
    label_en: 'Advanced',
    color: '#3b82f6',
    emoji: 'blue',
    recommendation_pt: 'Escalar, otimizar e inovar; explorar casos de uso avancados',
    recommendation_en: 'Scale, optimise and innovate; explore advanced use cases',
    order: 5
  }
];

function normalizeScore(score) {
  const numericScore = Number(score);
  return Number.isFinite(numericScore) ? numericScore : 0;
}

export function getFallbackMaturityLevel(score) {
  const value = normalizeScore(score);

  if (value < 1) {
    return {
      key: 'unknown',
      label_pt: 'N/A',
      label_en: 'N/A',
      color: '#9ca3af',
      emoji: 'neutral',
      recommendation_pt: null,
      recommendation_en: null
    };
  }

  return DEFAULT_LEVELS.find((level) => value >= level.min_score && value <= level.max_score) || DEFAULT_LEVELS.at(-1);
}

function hasQueryMethod(model, methodName) {
  return Boolean(model && typeof model[methodName] === 'function');
}

function pickModel(providedModel, fallbackModel) {
  return providedModel === undefined ? fallbackModel : providedModel;
}

async function executeMaybeLean(query) {
  if (!query) return null;
  if (typeof query.lean === 'function') {
    return query.lean();
  }
  return query;
}

export async function ensureDefaultMaturityPreset(deps = {}) {
  const models = {
    MaturityPreset: pickModel(deps.MaturityPreset, MaturityPreset),
    MaturityLevel: pickModel(deps.MaturityLevel, MaturityLevel)
  };

  if (!hasQueryMethod(models.MaturityPreset, 'findOne') || !hasQueryMethod(models.MaturityLevel, 'find')) {
    return null;
  }

  let preset = await models.MaturityPreset.findOne({
    $or: [{ name: DEFAULT_PRESET_NAME }, { code: DEFAULT_PRESET_CODE }]
  });

  if (!preset) {
    preset = await models.MaturityPreset.create({
      code: DEFAULT_PRESET_CODE,
      name: DEFAULT_PRESET_NAME,
      description: 'Default maturity classification used when no template-specific preset is configured.',
      is_default: true,
      is_active: true,
      order: 1
    });
  } else {
    let shouldSave = false;

    if (!preset.code) {
      preset.code = DEFAULT_PRESET_CODE;
      shouldSave = true;
    }
    if (!preset.is_default) {
      preset.is_default = true;
      shouldSave = true;
    }
    if (!preset.is_active) {
      preset.is_active = true;
      shouldSave = true;
    }
    if (shouldSave) {
      await preset.save();
    }
  }

  await models.MaturityPreset.updateMany(
    { _id: { $ne: preset._id }, is_default: true },
    { $set: { is_default: false } }
  );

  const existingLevels = await models.MaturityLevel.find({ preset_id: preset.id }).sort({ order: 1, level: 1 });
  if (existingLevels.length === 0) {
    await models.MaturityLevel.insertMany(
      DEFAULT_LEVELS.map((level) => ({
        preset_id: preset.id,
        ...level
      }))
    );
  }

  return preset;
}

export async function getDefaultMaturityPreset(deps = {}) {
  const models = {
    MaturityPreset: pickModel(deps.MaturityPreset, MaturityPreset),
    MaturityLevel: pickModel(deps.MaturityLevel, MaturityLevel)
  };

  if (!hasQueryMethod(models.MaturityPreset, 'findOne')) {
    return null;
  }

  const defaultPreset = await models.MaturityPreset.findOne({ is_default: true, is_active: true }).sort({ order: 1 });
  if (defaultPreset) {
    return defaultPreset;
  }

  return ensureDefaultMaturityPreset(models);
}

export async function resolveMaturityLevel(score, options = {}) {
  const models = {
    AssessmentTemplate: pickModel(options.AssessmentTemplate, AssessmentTemplate),
    MaturityPreset: pickModel(options.MaturityPreset, MaturityPreset),
    MaturityLevel: pickModel(options.MaturityLevel, MaturityLevel)
  };
  const fallbackLevel = getFallbackMaturityLevel(score);
  const numericScore = normalizeScore(score);

  if (numericScore < 1) {
    return fallbackLevel;
  }

  let presetId = options.presetId || null;

  if (!presetId) {
    const defaultPreset = await getDefaultMaturityPreset(models);
    presetId = defaultPreset?.id || null;
  }

  if (!presetId || !hasQueryMethod(models.MaturityLevel, 'find')) {
    return fallbackLevel;
  }

  const levels = await executeMaybeLean(
    models.MaturityLevel.find({ preset_id: presetId }).sort({ order: 1, level: 1 })
  );

  const matchedLevel = levels.find((level) => numericScore >= Number(level.min_score) && numericScore <= Number(level.max_score));
  if (!matchedLevel) {
    return fallbackLevel;
  }

  return {
    ...fallbackLevel,
    ...matchedLevel,
    preset_id: presetId
  };
}

export async function resolveMaturityForAssessment({ assessment, assessmentTemplate = null, language = 'pt', models = {} } = {}) {
  const deps = {
    AssessmentTemplate: pickModel(models.AssessmentTemplate, AssessmentTemplate),
    MaturityPreset: pickModel(models.MaturityPreset, MaturityPreset),
    MaturityLevel: pickModel(models.MaturityLevel, MaturityLevel)
  };

  let resolvedTemplate = assessmentTemplate;
  if (!resolvedTemplate && assessment?.assessment_template_id && hasQueryMethod(deps.AssessmentTemplate, 'findOne')) {
    resolvedTemplate = await executeMaybeLean(
      deps.AssessmentTemplate.findOne({ id: assessment.assessment_template_id })
    );
  }

  const level = await resolveMaturityLevel(assessment?.global_score, {
    presetId: resolvedTemplate?.maturity_preset_id || null,
    ...deps
  });

  return {
    level,
    label: language === 'en' ? (level.label_en || level.label_pt) : (level.label_pt || level.label_en),
    assessmentTemplate: resolvedTemplate
  };
}
