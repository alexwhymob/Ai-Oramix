import dns from 'node:dns/promises';
import net from 'node:net';
import pptxgen from 'pptxgenjs';
import {
  Assessment,
  AssessmentTemplate,
  ConsultantNote,
  Customer,
  MaturityLevel,
  MaturityPreset,
  Pillar,
  PresentationTemplate,
  Report
} from '../models/index.js';
import { generateStructuredObject } from './llm/llmClient.js';
import { buildDetailedAnswers, getMaturityLabel, parsePillarScores } from './reportGeneration.service.js';
import { resolveMaturityForAssessment } from './maturity.service.js';

const DEFAULT_PRESENTATION_TEMPLATE = {
  code: 'default-executive',
  name: 'Executive Default',
  description: 'Default executive presentation template',
  active: true,
  is_default: true,
  sort_order: 0,
  theme_primary_color: '#2563EB',
  theme_secondary_color: '#0F172A',
  theme_accent_color: '#F59E0B',
  branding_logo_url: null,
  branding_cover_image_url: null,
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

export const exportPresentation = createExportPresentation();
export const ensureDefaultPresentationTemplate = createEnsureDefaultPresentationTemplate();

export function createExportPresentation(deps = {}) {
  const models = {
    Assessment: deps.Assessment || Assessment,
    AssessmentTemplate: deps.AssessmentTemplate || AssessmentTemplate,
    ConsultantNote: deps.ConsultantNote || ConsultantNote,
    Customer: deps.Customer || Customer,
    MaturityLevel: Object.keys(deps).length > 0 ? (deps.MaturityLevel ?? null) : MaturityLevel,
    MaturityPreset: Object.keys(deps).length > 0 ? (deps.MaturityPreset ?? null) : MaturityPreset,
    Pillar: deps.Pillar || Pillar,
    PresentationTemplate: deps.PresentationTemplate || PresentationTemplate,
    Report: deps.Report || Report
  };
  const llm = deps.llm || { generateStructuredObject };

  return async function runExportPresentation(payload = {}, options = {}) {
    const actor = options.actor || null;
    assertPresentationPermissions(actor);

    const assessmentId = payload.assessmentId;
    if (!assessmentId) {
      const error = new Error('assessmentId is required');
      error.code = 'missing_assessment_id';
      error.status = 400;
      throw error;
    }

    const assessment = await models.Assessment.findOne({ id: assessmentId }).lean();
    if (!assessment) {
      const error = new Error('Assessment not found');
      error.code = 'not_found';
      error.status = 404;
      throw error;
    }

    const [customer, report, pillars, consultantNotes, assessmentTemplate, presentationTemplate] = await Promise.all([
      models.Customer.findOne({ id: assessment.customer_id }).lean(),
      models.Report.findOne({ assessment_id: assessmentId }).lean(),
      models.Pillar.find({}).sort({ order: 1 }).lean(),
      models.ConsultantNote.find({ assessment_id: assessmentId }).lean(),
      assessment.assessment_template_id
        ? models.AssessmentTemplate.findOne({ id: assessment.assessment_template_id }).lean()
        : null,
      resolvePresentationTemplate(models.PresentationTemplate, payload.presentationTemplateId)
    ]);

    if (!customer) {
      const error = new Error('Customer not found');
      error.code = 'customer_not_found';
      error.status = 404;
      throw error;
    }

    if (!report) {
      const error = new Error('Report not found');
      error.code = 'report_not_found';
      error.status = 404;
      throw error;
    }

    const language = payload.language === 'en' ? 'en' : (report.language === 'en' ? 'en' : 'pt');
    const rawPillarScores = parsePillarScores(assessment.pillar_scores);
    const scopedPillars = scopePillarsForPresentation(pillars, assessment, rawPillarScores);
    const pillarScores = enrichPillarScores(rawPillarScores, scopedPillars);
    const template = presentationTemplate || DEFAULT_PRESENTATION_TEMPLATE;
    const maturity = await resolveMaturityForAssessment({
      assessment,
      assessmentTemplate,
      language,
      models
    });

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'Oramix';
    pptx.company = 'Oramix';
    pptx.subject = `${assessmentTemplate?.name_pt || 'Assessment'} - ${customer.company}`;
    pptx.title = `${customer.company} - ${template.name}`;
    pptx.lang = language === 'en' ? 'en-GB' : 'pt-PT';
    pptx.theme = buildTheme(template);

    const assets = await loadPresentationAssets(template);
    const aiNarratives = await buildPresentationNarratives({
      assessment,
      assessmentTemplate,
      consultantNotes,
      customer,
      language,
      maturityLabel: maturity.label,
      pillarScores,
      report,
      scopedPillars,
      llm
    });
    const data = buildPresentationData({
      assessment,
      assessmentTemplate,
      aiNarratives,
      consultantNotes,
      customer,
      language,
      maturityLabel: maturity.label,
      pillarScores,
      report,
      scopedPillars
    });

    addCoverSlide(pptx, template, data, assets);
    if (template.include_summary) addSummarySlide(pptx, template, data);
    if (template.include_global_score) addGlobalScoreSlide(pptx, template, data);
    if (template.include_pillar_chart) addPillarChartSlide(pptx, template, data);
    if (template.include_radar_chart) addRadarSlide(pptx, template, data);
    if (template.include_quick_wins) addQuickWinsSlide(pptx, template, data);
    if (template.include_roadmap) addRoadmapSlide(pptx, template, data);
    if (template.include_use_cases) addUseCasesSlide(pptx, template, data);
    if (template.include_consultant_notes) addConsultantNotesSlide(pptx, template, data);

    applyFooters(pptx, template);

    const fileName = buildFileName(customer.company, language);
    const contentBase64 = await pptx.write({ outputType: 'base64', compression: true });

    return {
      success: true,
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      contentBase64,
      slideCount: pptx._slides?.length || undefined,
      templateId: template.id || null,
      templateName: template.name
    };
  };
}

async function resolvePresentationTemplate(Model, presentationTemplateId) {
  await ensureDefaultPresentationTemplate({ PresentationTemplate: Model });

  if (presentationTemplateId) {
    const selected = await Model.findOne({ id: presentationTemplateId, active: true }).lean();
    if (selected) return selected;
  }

  return Model.findOne({ active: true }).sort({ is_default: -1, sort_order: 1 }).lean();
}

export function createEnsureDefaultPresentationTemplate(deps = {}) {
  const models = {
    PresentationTemplate: deps.PresentationTemplate || PresentationTemplate
  };

  return async function runEnsureDefaultPresentationTemplate() {
    await models.PresentationTemplate.updateOne(
      { code: DEFAULT_PRESENTATION_TEMPLATE.code },
      {
        $setOnInsert: DEFAULT_PRESENTATION_TEMPLATE
      },
      { upsert: true, runValidators: true }
    );

    return models.PresentationTemplate.findOne({ code: DEFAULT_PRESENTATION_TEMPLATE.code }).lean();
  };
}

function scopePillarsForPresentation(pillars, assessment, rawScores = []) {
  if (assessment.assessment_type === 'sub_assessment') {
    return pillars.filter((pillar) => pillar.assessment_type === 'sub_assessment');
  }

  if (assessment.assessment_template_id) {
    return pillars.filter(
      (pillar) =>
        pillar.assessment_type !== 'sub_assessment'
        && pillar.assessment_template_id === assessment.assessment_template_id
    );
  }

  const defaultPillars = pillars.filter(
    (pillar) =>
      pillar.assessment_type !== 'sub_assessment'
      && !pillar.assessment_template_id
  );

  if (defaultPillars.length > 0) {
    return defaultPillars;
  }

  const scoreCodes = new Set(rawScores.map((score) => score.code).filter(Boolean));
  if (scoreCodes.size > 0) {
    const matchedByCode = pillars.filter(
      (pillar) => pillar.assessment_type !== 'sub_assessment' && scoreCodes.has(pillar.code)
    );
    if (matchedByCode.length > 0) {
      return matchedByCode;
    }
  }

  return pillars.filter((pillar) => pillar.assessment_type !== 'sub_assessment');
}

function enrichPillarScores(rawScores, pillars) {
  const pillarMap = new Map(pillars.map((pillar) => [pillar.code, pillar]));

  return rawScores
    .map((score) => {
      const pillar = pillarMap.get(score.code);
      if (!pillar) return null;
      return {
        ...score,
        weight: pillar.weight,
        name_pt: pillar.name_pt,
        name_en: pillar.name_en
      };
    })
    .filter(Boolean);
}

function buildPresentationData({
  assessment,
  assessmentTemplate,
  aiNarratives,
  consultantNotes,
  customer,
  language,
  maturityLabel,
  pillarScores,
  report,
  scopedPillars
}) {
  const resolvedMaturityLabel = maturityLabel || getMaturityLabel(assessment.global_score, language);
  const sectionSummary = toBulletList(report.section_1, {
    maxItems: 5,
    maxLength: 150,
    splitSentences: true,
    dropHeadings: true
  });
  const quickWins = toBulletList(report.section_6, {
    maxItems: 4,
    maxLength: 130,
    splitSentences: true,
    dropHeadings: true
  });
  const roadmap = toBulletList(report.section_7, {
    maxItems: 6,
    maxLength: 120,
    splitSentences: true,
    dropHeadings: true
  });
  const useCases = toBulletList(report.section_8, {
    maxItems: 3,
    maxLength: 140,
    splitSentences: true,
    dropHeadings: true
  });
  const title = language === 'en'
    ? (assessmentTemplate?.name_en || assessmentTemplate?.name_pt || 'Assessment')
    : (assessmentTemplate?.name_pt || assessmentTemplate?.name_en || 'Assessment');

  return {
    assessment,
    assessmentTemplate,
    consultantNotes,
    customer,
    language,
    maturityLabel: resolvedMaturityLabel,
    pillarScores,
    report,
    scopedPillars,
    title,
    summaryBullets: normalizeAiBulletList(aiNarratives?.summaryBullets, sectionSummary),
    quickWins: normalizeAiBulletList(aiNarratives?.quickWins, quickWins),
    roadmap: normalizeAiBulletList(aiNarratives?.roadmap, roadmap),
    useCases: normalizeAiBulletList(aiNarratives?.useCases, useCases),
    globalOverviewNarrative: normalizeAiParagraph(
      aiNarratives?.globalOverviewNarrative,
      normalizeNarrative(firstNonEmpty(reportSections(report, ['section_4', 'section_5'])), 220)
    ),
    radarNarrative: normalizeAiParagraph(
      aiNarratives?.radarNarrative,
      normalizeNarrative(firstNonEmpty(reportSections(report, ['section_4', 'section_3'])), 360)
    ),
    completionDate: new Date(assessment.completed_at || assessment.created_date).toLocaleDateString(language === 'en' ? 'en-GB' : 'pt-PT')
  };
}

function buildTheme(template) {
  return {
    headFontFace: 'Aptos',
    bodyFontFace: 'Aptos',
    lang: 'en-GB'
  };
}

async function loadPresentationAssets(template) {
  return {
    logoData: await imageUrlToData(template.branding_logo_url),
    coverImageData: await imageUrlToData(template.branding_cover_image_url)
  };
}

async function imageUrlToData(url) {
  if (!url) return null;
  if (url.startsWith('data:image/')) {
    return url.length <= 5 * 1024 * 1024 ? url : null;
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') return null;
    if (await resolvesToPrivateAddress(parsedUrl.hostname)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let response;
    try {
      response = await fetch(parsedUrl, { signal: controller.signal, redirect: 'error' });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) return null;
    const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(contentType)) return null;
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 5 * 1024 * 1024) return null;
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > 5 * 1024 * 1024) return null;
    const buffer = Buffer.from(arrayBuffer);
    if (!hasExpectedImageSignature(buffer, contentType)) return null;
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

function hasExpectedImageSignature(buffer, contentType) {
  if (contentType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (contentType === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
  if (contentType === 'image/gif') {
    const signature = buffer.subarray(0, 6).toString('ascii');
    return signature === 'GIF87a' || signature === 'GIF89a';
  }
  if (contentType === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

async function resolvesToPrivateAddress(hostname) {
  const normalizedHost = hostname.toLowerCase();
  if (normalizedHost === 'localhost' || normalizedHost.endsWith('.local')) return true;

  const addresses = net.isIP(normalizedHost)
    ? [{ address: normalizedHost }]
    : await dns.lookup(normalizedHost, { all: true });

  return addresses.some(({ address }) => isPrivateAddress(address));
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10
      || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }

  const normalized = address.toLowerCase();
  return normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:');
}

function addCoverSlide(pptx, template, data, assets) {
  const slide = pptx.addSlide();
  slide.background = { color: stripHash(template.theme_secondary_color) };

  if (assets.coverImageData) {
    slide.addImage({ data: assets.coverImageData, x: 0, y: 0, w: 13.33, h: 7.5, transparency: 20 });
  }

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 7.5,
    fill: { color: stripHash(template.theme_secondary_color), transparency: assets.coverImageData ? 35 : 0 },
    line: { color: stripHash(template.theme_secondary_color), transparency: 100 }
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.28,
    h: 7.5,
    fill: { color: stripHash(template.theme_primary_color) },
    line: { color: stripHash(template.theme_primary_color), transparency: 100 }
  });

  if (assets.logoData) {
    slide.addImage({ data: assets.logoData, x: 10.8, y: 0.45, w: 1.6, h: 0.7, contain: true });
  }

  slide.addText(languageLabel(template, data.language, 'cover_title'), {
    x: 0.7,
    y: 1.15,
    w: 7.4,
    h: 0.8,
    fontFace: 'Aptos Display',
    fontSize: 24,
    bold: true,
    color: 'FFFFFF',
    margin: 0,
    fit: 'shrink'
  });

  slide.addText(languageLabel(template, data.language, 'cover_subtitle'), {
    x: 0.7,
    y: 2.02,
    w: 6.9,
    h: 0.5,
    fontSize: 11,
    color: 'D1D5DB',
    margin: 0
  });

  slide.addText(data.customer.company, {
    x: 0.7,
    y: 3.0,
    w: 5.2,
    h: 0.45,
    fontSize: 18,
    bold: true,
    color: 'FFFFFF',
    margin: 0,
    fit: 'shrink'
  });

  slide.addText(`${data.customer.name} | ${data.customer.role || '-'}`, {
    x: 0.7,
    y: 3.45,
    w: 5.7,
    h: 0.3,
    fontSize: 10,
    color: 'D1D5DB',
    margin: 0
  });

  slide.addText(`${data.title} | ${data.completionDate}`, {
    x: 0.7,
    y: 3.85,
    w: 7,
    h: 0.3,
    fontSize: 10,
    color: '9CA3AF',
    margin: 0
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.45,
    y: 2.0,
    w: 2.9,
    h: 2.2,
    rectRadius: 0.08,
    fill: { color: stripHash(template.theme_primary_color) },
    line: { color: stripHash(template.theme_primary_color), transparency: 100 }
  });

  slide.addText(formatScore(data.assessment.global_score), {
    x: 9.75,
    y: 2.45,
    w: 2.3,
    h: 0.7,
    align: 'center',
    fontSize: 26,
    bold: true,
    color: 'FFFFFF',
    margin: 0
  });

  slide.addText(`${data.maturityLabel} | /5.0`, {
    x: 9.65,
    y: 3.3,
    w: 2.5,
    h: 0.3,
    align: 'center',
    fontSize: 10,
    color: 'E5E7EB',
    margin: 0
  });
}

function addSummarySlide(pptx, template, data) {
  const bulletChunks = chunkBulletsForSlides(
    clampList(data.summaryBullets, template.max_summary_bullets),
    520
  );

  bulletChunks.forEach((chunk, index) => {
    const slide = addStandardSlide(
      pptx,
      template,
      index === 0
        ? textLabel(data.language, 'Resumo Executivo', 'Executive Summary')
        : textLabel(data.language, 'Resumo Executivo (cont.)', 'Executive Summary (cont.)')
    );

    slide.addText(chunk.length > 0 ? chunk.map((item) => ({ text: item, options: { bullet: { indent: 18 } } })) : [textLabel(data.language, 'Sem resumo disponivel.', 'No summary available.')], {
      x: 0.75,
      y: 1.35,
      w: 7.5,
      h: 4.8,
      fontSize: 13,
      color: '1F2937',
      breakLine: true,
      valign: 'top',
      margin: 0.08
    });

    if (index === 0) {
      addInfoCard(pptx, slide, template, 9.05, 1.4, 3.4, 1.0, textLabel(data.language, 'Score Global', 'Global Score'), `${formatScore(data.assessment.global_score)}/5.0`);
      addInfoCard(pptx, slide, template, 9.05, 2.65, 3.4, 1.0, textLabel(data.language, 'Maturidade', 'Maturity'), data.maturityLabel);
      addInfoCard(pptx, slide, template, 9.05, 3.9, 3.4, 1.0, textLabel(data.language, 'Template', 'Template'), data.title);
    } else {
      slide.addText(textLabel(data.language, 'Continuação do resumo executivo.', 'Continuation of the executive summary.'), {
        x: 9.05,
        y: 1.55,
        w: 3.1,
        h: 0.4,
        fontSize: 11,
        italic: true,
        color: '6B7280',
        margin: 0
      });
    }
  });
}

function addGlobalScoreSlide(pptx, template, data) {
  const slide = addStandardSlide(pptx, template, textLabel(data.language, 'Visao Global', 'Global Overview'));

  slide.addText(textLabel(data.language, 'Indicadores principais da avaliacao.', 'Top indicators from the assessment.'), {
    x: 0.75, y: 0.9, w: 5.5, h: 0.3, fontSize: 11, color: '6B7280', margin: 0
  });

  slide.addChart(template.score_chart_type === 'bar' ? pptx.ChartType.bar : pptx.ChartType.doughnut, [
    {
      name: textLabel(data.language, 'Score', 'Score'),
      labels: [textLabel(data.language, 'Global', 'Global')],
      values: [Number(data.assessment.global_score || 0)]
    }
  ], {
    x: 0.8,
    y: 1.35,
    w: 4.8,
    h: 4.1,
    showTitle: false,
    showLegend: false,
    showValue: true,
    catAxisLabelColor: '6B7280',
    valAxisMinVal: 0,
    valAxisMaxVal: 5,
    valAxisLabelFormatCode: '0.0',
    valGridLine: { color: 'E5E7EB', width: 1 },
    chartColors: [stripHash(template.theme_primary_color)],
    dataLabelFormatCode: '0.0',
    dataLabelPosition: 'outEnd'
  });

  addInfoCard(pptx, slide, template, 6.2, 1.5, 2.35, 1.0, textLabel(data.language, 'Empresa', 'Company'), data.customer.company);
  addInfoCard(pptx, slide, template, 8.8, 1.5, 1.7, 1.0, textLabel(data.language, 'Setor', 'Sector'), data.customer.sector || '-');
  addInfoCard(pptx, slide, template, 10.8, 1.5, 1.6, 1.0, textLabel(data.language, 'Dimensao', 'Size'), data.customer.company_size || '-');
  addInfoCard(pptx, slide, template, 6.2, 2.8, 3.15, 1.0, textLabel(data.language, 'Maturidade', 'Maturity'), data.maturityLabel);
  addInfoCard(pptx, slide, template, 9.6, 2.8, 2.8, 1.0, textLabel(data.language, 'Data', 'Date'), data.completionDate);

  slide.addText(buildPillarSummaryText(data), {
    x: 6.2,
    y: 4.2,
    w: 6.0,
    h: 1.85,
    fontSize: 11,
    color: '1F2937',
    margin: 0.08,
    valign: 'top',
    fit: 'shrink'
  });
}

function addPillarChartSlide(pptx, template, data) {
  const slide = addStandardSlide(pptx, template, textLabel(data.language, 'Resultados por Pilar', 'Results by Pillar'));
  const chartType = template.pillar_chart_type === 'column' ? pptx.ChartType.bar : pptx.ChartType.bar;
  const chartData = [
    {
      name: textLabel(data.language, 'Score', 'Score'),
      labels: data.pillarScores.map((pillar) => displayPillarName(pillar, data.language)),
      values: data.pillarScores.map((pillar) => Number(pillar.score || 0))
    }
  ];

  slide.addChart(chartType, chartData, {
    x: 0.7,
    y: 1.2,
    w: 7.3,
    h: 4.8,
    catAxisLabelRotate: template.pillar_chart_type === 'column' ? 315 : 0,
    catAxisLabelColor: '6B7280',
    valAxisMinVal: 0,
    valAxisMaxVal: 5,
    valAxisLabelColor: '6B7280',
    valGridLine: { color: 'E5E7EB', width: 1 },
    chartColors: [stripHash(template.theme_primary_color)],
    showLegend: false,
    showValue: true,
    showTitle: false,
    showCatName: false,
    showSerName: false,
    catAxisLabelFontSize: 10,
    valAxisLabelFontSize: 10,
    valAxisLabelFormatCode: '0.0',
    valAxisMajorUnit: 0.5,
    dataLabelPosition: 'outEnd',
    dataLabelFormatCode: '0.0',
    ...(template.pillar_chart_type === 'column'
      ? { catAxisLabelRotate: 315, barDir: 'col' }
      : { barDir: 'bar' })
  });

  slide.addText(topAndBottomPillarsText(data), {
    x: 8.35,
    y: 1.35,
    w: 4.15,
    h: 4.6,
    fontSize: 11,
    color: '1F2937',
    margin: 0.12,
    valign: 'top',
    breakLine: true,
    fit: 'shrink'
  });
}

function addRadarSlide(pptx, template, data) {
  const slide = addStandardSlide(pptx, template, textLabel(data.language, 'Radar de Maturidade', 'Maturity Radar'));
  slide.addChart(pptx.ChartType.radar, [
    {
      name: textLabel(data.language, 'Maturidade', 'Maturity'),
      labels: data.pillarScores.map((pillar) => displayPillarName(pillar, data.language)),
      values: data.pillarScores.map((pillar) => Number(pillar.score || 0))
    }
  ], {
    x: 0.8,
    y: 1.15,
    w: 6.0,
    h: 4.9,
    valAxisMinVal: 0,
    valAxisMaxVal: 5,
    valAxisLabelFormatCode: '0.0',
    valAxisMajorUnit: 0.5,
    chartColors: [stripHash(template.theme_primary_color)],
    radarStyle: 'filled',
    showLegend: false,
    catAxisLabelColor: '6B7280',
    showValue: true,
    dataLabelFormatCode: '0.0',
    dataLabelPosition: 'outEnd'
  });

  slide.addText(buildRadarInterpretation(data).primary, {
    x: 7.15,
    y: 1.35,
    w: 5.0,
    h: 4.6,
    fontSize: 11,
    color: '1F2937',
    margin: 0.12,
    breakLine: true,
    valign: 'top'
  });

  const radarOverflow = buildRadarInterpretation(data).overflow;
  if (radarOverflow) {
    addNarrativeContinuationSlide(
      pptx,
      template,
      textLabel(data.language, 'Radar de Maturidade (cont.)', 'Maturity Radar (cont.)'),
      radarOverflow
    );
  }
}

function addQuickWinsSlide(pptx, template, data) {
  const slides = chunkBulletsForSlides(clampList(data.quickWins, template.max_quick_wins), 360, 4);
  slides.forEach((items, index) => {
    const slide = addStandardSlide(
      pptx,
      template,
      index === 0 ? textLabel(data.language, 'Quick Wins', 'Quick Wins') : textLabel(data.language, 'Quick Wins (cont.)', 'Quick Wins (cont.)')
    );
    addBulletColumns(pptx, slide, template, items, data.language);
  });
}

function addRoadmapSlide(pptx, template, data) {
  const milestones = clampList(data.roadmap, 6);
  const slideGroups = [milestones.slice(0, 3), milestones.slice(3, 6)].filter((group) => group.length > 0);

  slideGroups.forEach((group, slideIndex) => {
    const slide = addStandardSlide(
      pptx,
      template,
      slideIndex === 0 ? textLabel(data.language, 'Roadmap', 'Roadmap') : textLabel(data.language, 'Roadmap (cont.)', 'Roadmap (cont.)')
    );

    group.forEach((item, index) => {
      const x = 0.85 + index * 4.1;
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 1.45,
        w: 3.55,
        h: 4.45,
        rectRadius: 0.04,
        fill: { color: 'F8FAFC' },
        line: { color: 'E5E7EB', width: 1 }
      });
      slide.addText(buildRoadmapSlotTitle(slideIndex * 3 + index, data.language), {
        x: x + 0.18,
        y: 1.68,
        w: 3.1,
        h: 0.3,
        fontSize: 13,
        bold: true,
        color: stripHash(template.theme_secondary_color),
        margin: 0
      });
      slide.addText(item, {
        x: x + 0.15,
        y: 2.15,
        w: 3.15,
        h: 3.35,
        fontSize: 11,
        color: '1F2937',
        margin: 0.08,
        breakLine: true
      });
    });
  });
}

function addUseCasesSlide(pptx, template, data) {
  const slides = chunkBulletsForSlides(clampList(data.useCases, template.max_use_cases), 360, 3);
  slides.forEach((items, index) => {
    const slide = addStandardSlide(
      pptx,
      template,
      index === 0
        ? textLabel(data.language, 'Casos de Uso Recomendados', 'Recommended Use Cases')
        : textLabel(data.language, 'Casos de Uso Recomendados (cont.)', 'Recommended Use Cases (cont.)')
    );
    addBulletColumns(pptx, slide, template, items, data.language);
  });
}

function addConsultantNotesSlide(pptx, template, data) {
  const slide = addStandardSlide(pptx, template, textLabel(data.language, 'Notas do Consultor', 'Consultant Notes'));
  const notes = data.consultantNotes.slice(0, template.max_consultant_notes);

  if (notes.length === 0) {
    slide.addText(textLabel(data.language, 'Sem notas do consultor disponiveis.', 'No consultant notes available.'), {
      x: 0.9, y: 1.5, w: 6.2, h: 0.4, fontSize: 14, color: '6B7280'
    });
    return;
  }

  notes.forEach((note, index) => {
    const y = 1.25 + index * 1.25;
    const pillarLabel = resolveNotePillarLabel(note.pillar_code, data.scopedPillars, data.language);
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y,
      w: 11.8,
      h: 0.95,
      rectRadius: 0.03,
      fill: { color: index % 2 === 0 ? 'F8FAFC' : 'FFFFFF' },
      line: { color: 'E5E7EB', width: 1 }
    });
    slide.addText(`${pillarLabel || '-'} | ${note.priority || 'medium'}`, {
      x: 1.0, y: y + 0.12, w: 3.3, h: 0.24, fontSize: 11, bold: true, color: stripHash(template.theme_primary_color), fit: 'shrink'
    });
    slide.addText(stripMarkdown(note.gap_description || note.mitigation || ''), {
      x: 4.05, y: y + 0.1, w: 7.75, h: 0.55, fontSize: 10, color: '1F2937', margin: 0.02, fit: 'shrink'
    });
  });
}

function addStandardSlide(pptx, template, title) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.55,
    fill: { color: stripHash(template.theme_secondary_color) },
    line: { color: stripHash(template.theme_secondary_color), transparency: 100 }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.22,
    h: 0.55,
    fill: { color: stripHash(template.theme_primary_color) },
    line: { color: stripHash(template.theme_primary_color), transparency: 100 }
  });
  slide.addText(title, {
    x: 0.6,
    y: 0.15,
    w: 6.5,
    h: 0.25,
    fontSize: 22,
    bold: true,
    color: stripHash(template.theme_secondary_color),
    margin: 0
  });
  return slide;
}

function addInfoCard(pptx, slide, template, x, y, w, h, label, value) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.03,
    fill: { color: 'F8FAFC' },
    line: { color: 'E5E7EB', width: 1 }
  });
  slide.addText(label, {
    x: x + 0.12,
    y: y + 0.14,
    w: w - 0.24,
    h: 0.15,
    fontSize: 9,
    color: '6B7280',
    margin: 0
  });
  slide.addText(value, {
    x: x + 0.12,
    y: y + 0.42,
    w: w - 0.24,
    h: 0.28,
    fontSize: 14,
    bold: true,
    color: stripHash(template.theme_secondary_color),
    margin: 0,
    fit: 'shrink'
  });
}

function addBulletColumns(pptx, slide, template, items, language) {
  const list = items.length > 0 ? items : [textLabel(language, 'Sem itens disponiveis.', 'No items available.')];

  list.forEach((item, index) => {
    const y = 1.35 + index * 1.1;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.95,
      y,
      w: 11.4,
      h: 0.78,
      rectRadius: 0.03,
      fill: { color: 'F8FAFC' },
      line: { color: 'E5E7EB', width: 1 }
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 1.2,
      y: y + 0.18,
      w: 0.28,
      h: 0.28,
      fill: { color: stripHash(template.theme_primary_color) },
      line: { color: stripHash(template.theme_primary_color), transparency: 100 }
    });
    slide.addText(item, {
      x: 1.65,
      y: y + 0.13,
      w: 10.2,
      h: 0.45,
      fontSize: 12,
      color: '1F2937',
      margin: 0.02,
      fit: 'shrink'
    });
  });
}

function applyFooters(pptx, template) {
  pptx._slides.forEach((slide) => {
    slide.addShape(pptx.ShapeType.line, {
      x: 0.6,
      y: 7.0,
      w: 12.1,
      h: 0,
      line: { color: 'E5E7EB', width: 1 }
    });
    slide.addText(template.branding_footer_text || 'Confidential - Oramix', {
      x: 0.65,
      y: 7.05,
      w: 4.5,
      h: 0.2,
      fontSize: 8,
      color: '6B7280',
      margin: 0
    });
  });
}

function buildPillarSummaryText(data) {
  const sorted = [...data.pillarScores].sort((left, right) => Number(right.score || 0) - Number(left.score || 0));
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const narrative = data.globalOverviewNarrative;

  return [
    `${textLabel(data.language, 'Template', 'Template')}: ${data.title}`,
    `${textLabel(data.language, 'Pilar mais forte', 'Strongest pillar')}: ${strongest ? displayPillarName(strongest, data.language) : '-'}`,
    `${textLabel(data.language, 'Pilar com maior gap', 'Largest gap')}: ${weakest ? displayPillarName(weakest, data.language) : '-'}`,
    '',
    narrative || textLabel(data.language, 'Resumo analitico indisponivel.', 'Analytical summary unavailable.')
  ].filter(Boolean).join('\n');
}

function topAndBottomPillarsText(data) {
  const sorted = [...data.pillarScores].sort((left, right) => Number(right.score || 0) - Number(left.score || 0));
  const top = sorted.slice(0, 3);
  const bottom = [...sorted].reverse().slice(0, 3);

  return [
    textLabel(data.language, 'Pilares mais fortes', 'Top pillars'),
    ...top.map((pillar) => `- ${displayPillarName(pillar, data.language)} (${formatScore(pillar.score)})`),
    '',
    textLabel(data.language, 'Pilares prioritarios', 'Priority pillars'),
    ...bottom.map((pillar) => `- ${displayPillarName(pillar, data.language)} (${formatScore(pillar.score)})`)
  ].join('\n');
}

function buildRadarInterpretation(data) {
  const narrative = data.radarNarrative;
  const lines = [
    `${textLabel(data.language, 'Nivel de maturidade', 'Maturity level')}: ${data.maturityLabel}`,
    '',
    narrative || textLabel(data.language, 'Analise textual nao disponivel.', 'Narrative analysis not available.'),
    '',
    `${textLabel(data.language, 'Numero de pilares', 'Number of pillars')}: ${data.pillarScores.length}`
  ];

  return splitNarrativeForSlides(lines, 320);
}

function toBulletList(content, options = {}) {
  const {
    maxItems = Infinity,
    maxLength = 160,
    splitSentences = false,
    dropHeadings = false
  } = options;

  const normalized = stripMarkdown(content || '')
    .replace(/\r/g, '')
    .replace(/•/g, '-')
    .replace(/\n{2,}/g, '\n');

  const lines = normalized
    .split('\n')
    .map((line) => sanitizeBulletLine(line, { maxLength, dropHeadings }))
    .filter(Boolean);

  const items = [];

  lines.forEach((line) => {
    const parts = splitSentences
      ? splitLineIntoBullets(line, maxLength)
      : [truncateText(line, maxLength)];

    parts.forEach((part) => {
      const clean = sanitizeBulletLine(part, { maxLength, dropHeadings });
      if (clean) {
        items.push(clean);
      }
    });
  });

  return dedupePreserveOrder(items).slice(0, Math.max(1, maxItems));
}

function clampList(items, limit) {
  return items.slice(0, Math.max(1, limit || items.length));
}

function stripMarkdown(text) {
  return (text || '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^[-*+]\s/gm, '')
    .trim();
}

function sanitizeBulletLine(line, options = {}) {
  const { maxLength = 160, dropHeadings = false } = options;
  const cleaned = String(line || '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+[\.\)]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  if (dropHeadings && isHeadingLike(cleaned)) return '';

  return truncateText(cleaned, maxLength);
}

function splitLineIntoBullets(line, maxLength) {
  if (!line) return [];

  const chunks = line
    .split(/(?<=[\.\!\?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (chunks.length <= 1) {
    return [truncateText(line, maxLength)];
  }

  return chunks.map((chunk) => truncateText(chunk, maxLength));
}

function truncateText(text, maxLength = 160) {
  const value = String(text || '').trim();
  if (!value || value.length <= maxLength) return value;

  const shortened = value.slice(0, Math.max(0, maxLength - 1));
  const safeBreak = shortened.lastIndexOf(' ');
  return `${(safeBreak > 50 ? shortened.slice(0, safeBreak) : shortened).trim()}…`;
}

function dedupePreserveOrder(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isHeadingLike(text) {
  const normalized = String(text || '')
    .toLowerCase()
    .replace(/[:\-–]\s*$/, '')
    .trim();

  return [
    'executive summary',
    'sumario executivo',
    'sumário executivo',
    'metodologia',
    'methodology',
    'resultados por pilar',
    'results by pillar',
    'radar de maturidade',
    'maturity radar',
    'mapa de gaps',
    'gap map',
    'quick wins',
    'roadmap',
    'recomendacao de casos de uso',
    'recomendação de casos de uso',
    'use case recommendations',
    'proximos passos',
    'próximos passos',
    'next steps',
    'top 3 forcas',
    'top 3 forças',
    'top 3 strengths',
    'top 3 gaps'
  ].includes(normalized);
}

function normalizeNarrative(content, maxLength = 260) {
  const bullets = toBulletList(content, {
    maxItems: 2,
    maxLength,
    splitSentences: true,
    dropHeadings: true
  });

  if (bullets.length === 0) return '';
  if (bullets.length === 1) return bullets[0];
  return bullets.join(' ');
}

async function buildPresentationNarratives({
  assessment,
  assessmentTemplate,
  consultantNotes,
  customer,
  language,
  maturityLabel,
  pillarScores,
  report,
  scopedPillars,
  llm
}) {
  try {
    const schema = {
      type: 'object',
      properties: {
        summaryBullets: {
          type: 'array',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 5
        },
        globalOverviewNarrative: { type: 'string' },
        radarNarrative: { type: 'string' },
        quickWins: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 4
        },
        roadmap: {
          type: 'array',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 6
        },
        useCases: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 3
        }
      },
      required: [
        'summaryBullets',
        'globalOverviewNarrative',
        'radarNarrative',
        'quickWins',
        'roadmap',
        'useCases'
      ],
      additionalProperties: false
    };

    const systemPrompt = [
      'You are a senior Oramix consultant creating concise executive PowerPoint copy.',
      language === 'en' ? 'Write in clear business English.' : 'Escreve em portugues europeu claro e profissional.',
      'Your audience is a business client, not a technical specialist.',
      'Use simple, direct, reassuring language.',
      'Do not use markdown, headings, bullet characters, or ellipses.',
      'Never end sentences with "...".',
      'Prioritize weaknesses, business impact, and how Oramix can solve or reduce those issues.',
      'Sound commercial-consultative, concise, and confident.',
      'Keep every sentence self-contained and presentation-ready.'
    ].join(' ');

    const userPrompt = [
      'Generate structured executive copy for a PowerPoint presentation.',
      'Rules:',
      '- summaryBullets: 3 to 5 short bullets, each one sentence only.',
      '- globalOverviewNarrative: one short paragraph with at most 2 sentences.',
      '- radarNarrative: one short paragraph with at most 3 sentences.',
      '- quickWins: 2 to 4 short actionable bullets.',
      '- roadmap: 3 to 6 short milestones written as business actions.',
      '- useCases: 2 to 3 short use cases with value and focus.',
      '- Avoid jargon, hype, and generic filler.',
      '- Do not repeat the same idea across fields.',
      '- Emphasize where the client is weak, the likely operational/business impact, and what Oramix can help implement next.',
      '- Prefer plain language over descriptive analysis.',
      '',
      buildPresentationNarrativeContext({
        assessment,
        assessmentTemplate,
        consultantNotes,
        customer,
        language,
        maturityLabel,
        pillarScores,
        report,
        scopedPillars
      })
    ].join('\n');

    return await llm.generateStructuredObject({
      schemaName: 'oramix_presentation_copy',
      schema,
      systemPrompt,
      userPrompt,
      temperature: 0.3
    });
  } catch {
    return null;
  }
}

function buildPresentationNarrativeContext({
  assessment,
  assessmentTemplate,
  consultantNotes,
  customer,
  language,
  maturityLabel,
  pillarScores,
  report,
  scopedPillars
}) {
  const pillarSummary = pillarScores.length > 0
    ? pillarScores
      .map((pillar) => `${displayPillarName(pillar, language)}: ${formatScore(pillar.score)}/5`)
      .join(', ')
    : 'N/A';

  const detailedAnswers = buildDetailedAnswers({
    pillars: scopedPillars,
    questions: [],
    answers: [],
    pillarScores,
    language
  });

  return [
    `Company: ${customer.company || 'N/A'}`,
    `Sector: ${customer.sector || 'N/A'}`,
    `Company size: ${customer.company_size || 'N/A'}`,
    `Assessment: ${language === 'en'
      ? (assessmentTemplate?.name_en || assessmentTemplate?.name_pt || 'Assessment')
      : (assessmentTemplate?.name_pt || assessmentTemplate?.name_en || 'Assessment')}`,
    `Global score: ${formatScore(assessment.global_score)}/5.0`,
    `Maturity label: ${maturityLabel || getMaturityLabel(assessment.global_score, language)}`,
    `Pillar scores: ${pillarSummary}`,
    '',
    'Existing report excerpts:',
    `Section 1: ${stripMarkdown(report.section_1 || '')}`,
    `Section 4: ${stripMarkdown(report.section_4 || '')}`,
    `Section 5: ${stripMarkdown(report.section_5 || '')}`,
    `Section 6: ${stripMarkdown(report.section_6 || '')}`,
    `Section 7: ${stripMarkdown(report.section_7 || '')}`,
    `Section 8: ${stripMarkdown(report.section_8 || '')}`,
    '',
    `Consultant notes summary: ${consultantNotes.map((note) => stripMarkdown(note.gap_description || note.mitigation || '')).filter(Boolean).join(' | ') || 'N/A'}`,
    '',
    'Pillar evidence:',
    detailedAnswers || 'N/A'
  ].join('\n');
}

function normalizeAiBulletList(aiItems, fallbackItems) {
  if (!Array.isArray(aiItems) || aiItems.length === 0) {
    return fallbackItems;
  }

  return aiItems
    .map((item) => sanitizeAiSentence(item))
    .filter(Boolean);
}

function splitNarrativeForSlides(lines, maxChars = 320) {
  const primary = [];
  const overflow = [];
  let currentChars = 0;

  lines.forEach((line) => {
    const target = currentChars + line.length > maxChars && primary.length > 0 ? overflow : primary;
    target.push(line);
    if (target === primary) {
      currentChars += line.length;
    }
  });

  return {
    primary: primary.join('\n'),
    overflow: overflow.filter(Boolean).join('\n')
  };
}

function addNarrativeContinuationSlide(pptx, template, title, content) {
  const slide = addStandardSlide(pptx, template, title);
  slide.addText(content, {
    x: 0.9,
    y: 1.25,
    w: 11.5,
    h: 5.4,
    fontSize: 13,
    color: '1F2937',
    margin: 0.08,
    breakLine: true,
    valign: 'top'
  });
}

function chunkBulletsForSlides(items, maxChars = 360, maxItemsPerSlide = 5) {
  if (!Array.isArray(items) || items.length === 0) {
    return [[]];
  }

  const chunks = [];
  let current = [];
  let currentChars = 0;

  items.forEach((item) => {
    const itemLength = String(item || '').length;
    const wouldOverflow = current.length >= maxItemsPerSlide || (current.length > 0 && currentChars + itemLength > maxChars);
    if (wouldOverflow) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(item);
    currentChars += itemLength;
  });

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function buildRoadmapSlotTitle(index, language) {
  const slots = [
    textLabel(language, '0-3 meses', '0-3 months'),
    textLabel(language, '3-6 meses', '3-6 months'),
    textLabel(language, '6-12 meses', '6-12 months'),
    textLabel(language, '12-18 meses', '12-18 months'),
    textLabel(language, '18-24 meses', '18-24 months'),
    textLabel(language, '24+ meses', '24+ months')
  ];

  return slots[index] || textLabel(language, 'Próxima fase', 'Next phase');
}

function normalizeAiParagraph(value, fallbackValue) {
  const normalized = sanitizeAiSentence(value);
  return normalized || fallbackValue;
}

function sanitizeAiSentence(value) {
  const text = String(value || '')
    .replace(/\r/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s*[-*•]\s*/, '')
    .replace(/\.{3,}$/g, '.')
    .replace(/…+/g, '.')
    .trim();

  if (!text) return '';

  return text;
}

function stripHash(color) {
  return String(color || '').replace('#', '') || '2563EB';
}

function formatScore(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return '0.0';
  return Number(score).toFixed(1);
}

function displayPillarName(pillar, language) {
  return language === 'en'
    ? (pillar.name_en || pillar.name_pt || pillar.code)
    : (pillar.name_pt || pillar.name_en || pillar.code);
}

function resolveNotePillarLabel(pillarCode, pillars = [], language = 'pt') {
  if (!pillarCode) return '';
  const pillar = pillars.find((item) => item.code === pillarCode);
  return pillar ? displayPillarName(pillar, language) : pillarCode;
}

function textLabel(language, pt, en) {
  return language === 'en' ? en : pt;
}

function languageLabel(template, language, prefix) {
  if (prefix === 'cover_title') {
    return language === 'en' ? (template.cover_title_en || template.cover_title_pt) : template.cover_title_pt;
  }
  return language === 'en' ? (template.cover_subtitle_en || template.cover_subtitle_pt) : template.cover_subtitle_pt;
}

function buildFileName(company, language) {
  const date = new Date().toISOString().slice(0, 10);
  const cleanCompany = String(company || 'report').replace(/\s+/g, '_');
  return `${language === 'en' ? 'Executive_Presentation' : 'Apresentacao_Executiva'}_${cleanCompany}_${date}.pptx`;
}

function reportSections(report, sectionKeys) {
  return sectionKeys.map((key) => report?.[key]).filter(Boolean);
}

function firstNonEmpty(values) {
  return values.find(Boolean) || '';
}

function assertPresentationPermissions(actor) {
  if (!actor) {
    const error = new Error('Authentication required');
    error.code = 'auth_required';
    error.status = 401;
    throw error;
  }

  if (!['admin', 'account_manager'].includes(actor.role)) {
    const error = new Error('Forbidden');
    error.code = 'forbidden';
    error.status = 403;
    throw error;
  }
}
