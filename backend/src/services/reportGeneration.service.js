import {
  Assessment,
  AssessmentAnswer,
  AssessmentTemplate,
  Customer,
  Pillar,
  Question,
  Report,
  ReportSection,
  ReportTemplate
} from '../models/index.js';
import { generateStructuredObject } from './llm/llmClient.js';
import { resolveMaturityForAssessment } from './maturity.service.js';

const DEFAULT_SECTIONS = [
  'section_1',
  'section_2',
  'section_3',
  'section_4',
  'section_5',
  'section_6',
  'section_7',
  'section_8',
  'section_9'
];

const SECTION_GROUPS = [
  ['section_1', 'section_2', 'section_3'],
  ['section_4', 'section_5', 'section_6'],
  ['section_7', 'section_8', 'section_9']
];

const SECTION_DESCRIPTIONS = {
  section_1: 'Executive Summary: global score, top 3 strengths, top 3 gaps, and the key recommendation. Return Markdown only.',
  section_2: 'Methodology: pillar descriptions, 1-5 scale explanation, and data collection process. Return Markdown only.',
  section_3: 'Results by Pillar: detailed analysis for each pillar with scores and insights grounded in the actual answers. Return Markdown only.',
  section_4: 'Maturity Radar: written interpretation of the radar, highlighting patterns and outliers. Return Markdown only.',
  section_5: 'Gap Map: prioritized Markdown table with columns Gap | Impact (H/M/L) | Effort (H/M/L) | Priority (1-5).',
  section_6: 'Quick Wins: 3-5 specific actions for the next 0-3 months, each with expected outcome. Return Markdown only.',
  section_7: 'Roadmap: structured plan with milestones for 3, 6, and 12 months. Return Markdown only.',
  section_8: 'AI Use Cases: 2-3 specific justified AI use cases prioritized by the assessment results, with business value. Return Markdown only.',
  section_9: 'Next Steps: concrete engagement proposal and support plan from Oramix. Return Markdown only.'
};
const DEFAULT_REPORT_TEMPLATE = {
  system_prompt: null,
  style_guide: null
};

export const generateReport = createGenerateReport();

export function createGenerateReport(deps = {}) {
  const models = {
    Assessment: deps.Assessment || Assessment,
    AssessmentAnswer: deps.AssessmentAnswer || AssessmentAnswer,
    AssessmentTemplate: deps.AssessmentTemplate || AssessmentTemplate,
    Customer: deps.Customer || Customer,
    MaturityLevel: Object.keys(deps).length > 0 ? (deps.MaturityLevel ?? null) : undefined,
    MaturityPreset: Object.keys(deps).length > 0 ? (deps.MaturityPreset ?? null) : undefined,
    Pillar: deps.Pillar || Pillar,
    Question: deps.Question || Question,
    Report: deps.Report || Report
    ,
    ReportTemplate: deps.ReportTemplate || ReportTemplate,
    ReportSection: deps.ReportSection || ReportSection
  };
  const llm = deps.llm || { generateStructuredObject };
  const now = deps.now || (() => new Date());

  return async function runGenerateReport(payload = {}, options = {}) {
    const actor = options.actor || null;
    assertReportPermissions(actor);

    const assessmentId = payload.assessmentId;
    if (!assessmentId) {
      const error = new Error('assessmentId is required');
      error.code = 'missing_assessment_id';
      error.status = 400;
      throw error;
    }

    const language = normalizeLanguage(payload.language);
    const selectedSections = normalizeSections(payload.sections);

    const assessment = await models.Assessment.findOne({ id: assessmentId }).lean();
    if (!assessment) {
      const error = new Error('Assessment not found');
      error.code = 'not_found';
      error.status = 404;
      throw error;
    }

    if (assessment.status !== 'completed') {
      const error = new Error('Assessment must be completed before generating a report');
      error.code = 'assessment_not_completed';
      error.status = 422;
      throw error;
    }

    const assessmentType = assessment.assessment_type || 'main';
    const [customer, pillars, allQuestions, answers, existingReport, activeReportTemplate, assessmentTemplate] = await Promise.all([
      models.Customer.findOne({ id: assessment.customer_id }).lean(),
      models.Pillar.find({ assessment_type: assessmentType }).sort({ order: 1 }).lean(),
      models.Question.find({}).sort({ order: 1 }).lean(),
      models.AssessmentAnswer.find({ assessment_id: assessmentId }).lean(),
      models.Report.findOne({ assessment_id: assessmentId }),
      models.ReportTemplate.findOne({ is_active: true }).sort({ is_default: -1, order: 1 }).lean(),
      assessment.assessment_template_id
        ? models.AssessmentTemplate.findOne({ id: assessment.assessment_template_id }).lean()
        : null
    ]);
    const templateSections = activeReportTemplate
      ? await models.ReportSection.find({ report_template_id: activeReportTemplate.id }).sort({ order: 1 }).lean()
      : [];

    const scopedPillars = scopePillarsForAssessment(pillars, assessment);
    const pillarCodes = new Set(scopedPillars.map(pillar => pillar.code));
    const questions = allQuestions.filter(question => pillarCodes.has(question.pillar_code));

    if (existingReport) {
      existingReport.status = 'generating';
      existingReport.language = language;
      await existingReport.save();
    }

    const maturity = await resolveMaturityForAssessment({
      assessment,
      assessmentTemplate,
      language,
      models
    });

    const context = buildReportContext({
      assessment,
      maturityLabel: maturity.label,
      customer: customer || {},
      pillars: scopedPillars,
      questions,
      answers,
      language
    });

    const langLabel = language === 'en' ? 'English' : 'Portuguese (European Portuguese)';
    const sectionDefinitions = buildSectionDefinitions(templateSections);
    const systemPrompt = buildSystemPrompt({
      langLabel,
      reportTemplate: activeReportTemplate || DEFAULT_REPORT_TEMPLATE
    });

    const sectionResults = await Promise.all(
      SECTION_GROUPS.map((group, index) => generateSectionGroup({
        group,
        sectionIndex: index + 1,
        selectedSections,
        context,
        systemPrompt,
        language,
        sectionDefinitions,
        llm
      }))
    );

    const reportData = {
      assessment_id: assessmentId,
      status: 'review',
      generated_at: now(),
      language,
      ...Object.assign({}, ...sectionResults)
    };

    let report;
    if (existingReport) {
      Object.assign(existingReport, reportData);
      report = await existingReport.save();
    } else {
      report = await models.Report.create(reportData);
    }

    return {
      success: true,
      reportId: report.id,
      sectionsGenerated: selectedSections
    };
  };
}

function scopePillarsForAssessment(pillars, assessment) {
  if ((assessment.assessment_type || 'main') === 'sub_assessment') {
    return pillars.filter(pillar => pillar.code?.startsWith('ds_'));
  }

  if (assessment.assessment_template_id) {
    return pillars.filter(
      pillar =>
        pillar.assessment_type !== 'sub_assessment'
        && pillar.assessment_template_id === assessment.assessment_template_id
    );
  }

  return pillars.filter(
    pillar =>
      pillar.assessment_type !== 'sub_assessment'
      && !pillar.assessment_template_id
      && !pillar.code?.startsWith('ds_')
  );
}

async function generateSectionGroup({
  group,
  sectionIndex,
  selectedSections,
  context,
  systemPrompt,
  language,
  sectionDefinitions,
  llm
}) {
  const filtered = group.filter(section => selectedSections.includes(section));
  if (filtered.length === 0) {
    return {};
  }

  const schema = buildSectionSchema(filtered, sectionDefinitions);
  const userPrompt = [
    'Generate a JSON object that matches the provided schema exactly.',
    'Each property value must be a Markdown string.',
    `Language: ${language}.`,
    buildSectionsPrompt(filtered, sectionDefinitions),
    '',
    'Assessment context:',
    context
  ].join('\n');

  return llm.generateStructuredObject({
    schemaName: `oramix_report_group_${sectionIndex}`,
    schema,
    systemPrompt,
    userPrompt
  });
}

export function buildSectionSchema(sectionKeys, sectionDefinitions = SECTION_DESCRIPTIONS) {
  const properties = {};

  for (const key of sectionKeys) {
    properties[key] = {
      type: 'string',
      description: sectionDefinitions[key]?.description || SECTION_DESCRIPTIONS[key]
    };
  }

  return {
    type: 'object',
    properties,
    required: sectionKeys,
    additionalProperties: false
  };
}

export function buildSectionsPrompt(sectionKeys, sectionDefinitions = SECTION_DESCRIPTIONS) {
  return [
    'Generate these report sections:',
    ...sectionKeys.map(sectionKey => `- ${sectionKey}: ${sectionDefinitions[sectionKey]?.description || SECTION_DESCRIPTIONS[sectionKey]}`)
  ].join('\n');
}

export function buildReportContext({
  assessment,
  maturityLabel,
  customer,
  pillars,
  questions,
  answers,
  language
}) {
  const pillarScores = parsePillarScores(assessment.pillar_scores);
  const detailedAnswers = buildDetailedAnswers({
    pillars,
    questions,
    answers,
    pillarScores,
    language
  });
  const company = customer.company || 'Unknown company';
  const contactName = customer.name || 'N/A';
  const contactRole = customer.role || 'N/A';
  const dateLocale = language === 'en' ? 'en-GB' : 'pt-PT';
  const resolvedMaturityLabel = maturityLabel || getMaturityLabel(assessment.global_score, language);
  const pillarSummary = pillarScores.length > 0
    ? pillarScores.map(pillar => {
      const pillarName = language === 'en'
        ? (pillar.name_en || pillar.name_pt || pillar.code)
        : (pillar.name_pt || pillar.name_en || pillar.code);
      return `${pillarName}: ${formatScore(pillar.score)}/5 (${pillar.weight || 0}%)`;
    }).join(', ')
    : 'N/A';

  return [
    `ORGANISATION: ${company}`,
    `SECTOR: ${customer.sector || 'N/A'}`,
    `COMPANY SIZE: ${customer.company_size || 'N/A'}`,
    `CONTACT: ${contactName} (${contactRole})`,
    `DATE: ${formatDate(assessment.completed_at || assessment.created_date, dateLocale)}`,
    `GLOBAL SCORE: ${formatScore(assessment.global_score)}/5.0`,
    `MATURITY: ${resolvedMaturityLabel}`,
    `PILLAR SCORES: ${pillarSummary}`,
    'DETAILED ANSWERS:',
    detailedAnswers
  ].join('\n');
}

export function buildDetailedAnswers({
  pillars,
  questions,
  answers,
  pillarScores,
  language
}) {
  const answerByQuestionId = new Map(answers.map(answer => [answer.question_id, answer]));
  const answerLabel = language === 'en' ? 'Not answered' : 'Nao respondida';
  const dash = '-';

  return pillars.map(pillar => {
    const pillarQuestions = questions
      .filter(question => question.pillar_code === pillar.code)
      .sort((left, right) => (left.order || 0) - (right.order || 0));
    const pillarScore = pillarScores.find(score => score.code === pillar.code);
    const pillarName = language === 'en'
      ? (pillar.name_en || pillar.name_pt || pillar.code)
      : (pillar.name_pt || pillar.name_en || pillar.code);
    const lines = pillarQuestions.map(question => {
      const answer = answerByQuestionId.get(question.id);
      const value = answer?.value ?? 0;
      const anchorField = `anchor_${value}_${language}`;
      const fallbackAnchorField = `anchor_${value}_pt`;
      const anchor = value > 0
        ? question[anchorField] || question[fallbackAnchorField] || answerLabel
        : answerLabel;
      const questionText = language === 'en'
        ? (question.text_en || question.text_pt)
        : (question.text_pt || question.text_en);

      return `  [${question.code}] ${questionText}: ${value}/5 ${dash} "${anchor}"`;
    });

    return `${pillarName} (Score: ${formatScore(pillarScore?.score)}/5, Weight: ${pillar.weight || 0}%)\n${lines.join('\n')}`;
  }).join('\n\n');
}

export function parsePillarScores(rawPillarScores) {
  if (Array.isArray(rawPillarScores)) return rawPillarScores;

  try {
    return JSON.parse(rawPillarScores || '[]');
  } catch {
    return [];
  }
}

export function getMaturityLabel(score, language = 'pt') {
  if (score === null || score === undefined) return 'N/A';
  if (score < 2) return language === 'en' ? 'Not Ready' : 'Nao Preparado';
  if (score < 3) return language === 'en' ? 'Emerging' : 'Emergente';
  if (score < 3.6) return language === 'en' ? 'Developing' : 'Em Desenvolvimento';
  if (score < 4.3) return language === 'en' ? 'Ready' : 'Preparado';
  return language === 'en' ? 'Advanced' : 'Avancado';
}

function normalizeSections(sections) {
  if (!sections) return DEFAULT_SECTIONS;

  const selected = [...new Set(sections)].filter(section => DEFAULT_SECTIONS.includes(section));
  if (selected.length === 0) {
    const error = new Error('At least one valid report section is required');
    error.code = 'invalid_sections';
    error.status = 400;
    throw error;
  }

  return selected;
}

function normalizeLanguage(language) {
  return language === 'en' ? 'en' : 'pt';
}

function assertReportPermissions(actor) {
  if (!actor) {
    const error = new Error('Authentication required');
    error.code = 'auth_required';
    error.status = 401;
    throw error;
  }

  if (!['admin', 'ai_consultant'].includes(actor.role)) {
    const error = new Error('Forbidden');
    error.code = 'forbidden';
    error.status = 403;
    throw error;
  }
}

function formatScore(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return '0.00';
  return Number(score).toFixed(2);
}

function formatDate(dateValue, locale) {
  if (!dateValue) return 'N/A';
  return new Date(dateValue).toLocaleDateString(locale);
}

function buildSectionDefinitions(templateSections = []) {
  const custom = {};

  for (const section of templateSections) {
    if (!section?.key) continue;
    custom[section.key] = {
      title: section.title || section.key,
      description: section.prompt || SECTION_DESCRIPTIONS[section.key] || `Generate ${section.key}`
    };
  }

  return new Proxy(custom, {
    get(target, property) {
      if (typeof property !== 'string') return undefined;
      if (target[property]) return target[property];
      return {
        title: property,
        description: SECTION_DESCRIPTIONS[property]
      };
    }
  });
}

function buildSystemPrompt({ langLabel, reportTemplate }) {
  const defaults = [
    'You are a senior AI readiness consultant writing client-facing reports for Oramix.',
    `Write in ${langLabel}.`,
    'Be specific, practical, and evidence-based.',
    'Do not use code fences.',
    'Return each section as Markdown text only.'
  ];

  const parts = [
    reportTemplate?.system_prompt?.trim() || defaults.join(' '),
    reportTemplate?.style_guide?.trim() ? `Style guide:\n${reportTemplate.style_guide.trim()}` : null
  ].filter(Boolean);

  return parts.join('\n\n');
}
