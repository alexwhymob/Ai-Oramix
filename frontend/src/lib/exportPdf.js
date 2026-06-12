import { jsPDF } from 'jspdf';

// ─── constants ───────────────────────────────────────────────────────────────
const W = 210, MARGIN = 15, CONTENT_W = W - MARGIN * 2;
const NAVY = [13, 27, 42], BLUE = [59, 130, 246], WHITE = [255, 255, 255];
const GRAY = [80, 80, 80], LIGHTGRAY = [200, 200, 200];
const GREEN_BG = [20, 83, 45], GREEN_BORDER = [34, 197, 94];
const RED_BG = [69, 10, 10], RED_BORDER = [239, 68, 68];
const BLUE_BG = [23, 37, 84];
const PURPLE_BG = [59, 7, 100], ORANGE_BG = [67, 20, 7];

// ─── helpers ─────────────────────────────────────────────────────────────────
function splitBullets(text) {
  return (text || '').split('\n').map(l => l.replace(/^[-*•]\s+/, '').trim()).filter(Boolean);
}

function stripMd(text) {
  return (text || '')
    .replace(/#{1,6}\s/g, '').replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/^[-*+]\s/gm, '• ')
    .trim();
}

function extractSections(text) {
  const sections = [];
  let current = null;
  (text || '').split('\n').forEach(line => {
    const h = line.match(/^#{1,3}\s+(.*)/);
    const bold = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (h || bold) {
      if (current) sections.push(current);
      current = { heading: (h ? h[1] : bold[1]).replace(/\*\*/g, ''), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  });
  if (current) sections.push(current);
  return sections;
}

function getPillarLabel(pillarCode, pillars = [], lang = 'pt') {
  if (!pillarCode) return '';
  const pillar = pillars.find((item) => item.code === pillarCode);
  if (!pillar) return pillarCode;
  return lang === 'en'
    ? (pillar.name_en || pillar.name_pt || pillarCode)
    : (pillar.name_pt || pillar.name_en || pillarCode);
}

class PdfWriter {
  constructor(doc) {
    this.doc = doc;
    this.y = 25;
    this.pageH = 297;
    this.bottomMargin = 282;
  }

  newPage() {
    this.doc.addPage();
    this.y = 25;
  }

  ensureSpace(needed) {
    if (this.y + needed > this.bottomMargin) this.newPage();
  }

  sectionHeader(n, title) {
    this.newPage();
    this.doc.setFillColor(...NAVY);
    this.doc.rect(0, 0, W, 18, 'F');
    this.doc.setFillColor(...BLUE);
    this.doc.rect(0, 0, 3, 18, 'F');
    this.doc.setTextColor(...WHITE);
    this.doc.setFontSize(12);
    this.doc.text(`${n}. ${title}`, MARGIN, 12);
    this.y = 26;
    this.doc.setTextColor(...GRAY);
  }

  heading(text, size = 10, color = NAVY) {
    this.ensureSpace(10);
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    this.doc.text(stripMd(text), MARGIN, this.y);
    this.y += size * 0.5;
    this.doc.setDrawColor(...LIGHTGRAY);
    this.doc.setLineWidth(0.2);
    this.doc.line(MARGIN, this.y, W - MARGIN, this.y);
    this.y += 4;
  }

  paragraph(text, opts = {}) {
    const { indent = 0, color = GRAY, size = 9, maxW } = opts;
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    const lines = this.doc.splitTextToSize(stripMd(text), (maxW || CONTENT_W) - indent);
    lines.forEach(line => {
      this.ensureSpace(5);
      this.doc.text(line, MARGIN + indent, this.y);
      this.y += 4.5;
    });
    this.y += 1;
  }

  bullet(text, opts = {}) {
    const { indent = 4, color = GRAY, bulletColor = BLUE } = opts;
    this.doc.setFontSize(9);
    this.doc.setTextColor(...bulletColor);
    this.doc.text('•', MARGIN + indent - 3, this.y);
    this.doc.setTextColor(...color);
    const lines = this.doc.splitTextToSize(stripMd(text), CONTENT_W - indent - 2);
    lines.forEach((line, i) => {
      this.ensureSpace(5);
      this.doc.text(line, MARGIN + indent, this.y);
      this.y += 4.5;
    });
  }

  colorBox(x, y, w, h, fillRgb, borderRgb) {
    this.doc.setFillColor(...fillRgb);
    this.doc.setDrawColor(...borderRgb);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  }

  numberedCard(n, title, body) {
    this.ensureSpace(22);
    const startY = this.y;
    // Number circle
    this.doc.setFillColor(...BLUE);
    this.doc.circle(MARGIN + 3, this.y + 2.5, 3, 'F');
    this.doc.setTextColor(...WHITE);
    this.doc.setFontSize(7);
    this.doc.text(String(n), MARGIN + 3, this.y + 3.2, { align: 'center' });
    // Title
    this.doc.setFontSize(9);
    this.doc.setTextColor(...NAVY);
    this.doc.text(stripMd(title), MARGIN + 8, this.y + 3);
    this.y += 7;
    if (body) this.paragraph(body, { indent: 8, color: GRAY });
    // subtle line
    this.doc.setDrawColor(230, 230, 230);
    this.doc.setLineWidth(0.1);
    this.doc.line(MARGIN, this.y + 1, W - MARGIN, this.y + 1);
    this.y += 4;
  }
}

// ─── Section renderers ────────────────────────────────────────────────────────
function renderNarrative(pw, content) {
  const secs = extractSections(content);
  if (secs.length > 0) {
    secs.forEach(sec => {
      if (sec.heading) pw.heading(sec.heading);
      const body = sec.lines.join('\n');
      splitBullets(body).forEach(b => pw.bullet(b));
      if (!splitBullets(body).length) pw.paragraph(body);
    });
  } else {
    const lines = content.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      if (/^#{1,3}\s/.test(line)) pw.heading(line);
      else if (/^[-*•]\s/.test(line)) pw.bullet(line);
      else pw.paragraph(line);
    });
  }
}

function renderNumberedCards(pw, content) {
  const secs = extractSections(content).filter(s => s.heading);
  if (!secs.length) { renderNarrative(pw, content); return; }
  secs.forEach((sec, i) => {
    pw.numberedCard(i + 1, sec.heading, sec.lines.join('\n'));
  });
}

function renderExecutiveSummary(pw, content) {
  renderNumberedCards(pw, content);
}

function renderPillarResults(pw, content) {
  renderNumberedCards(pw, content);
}

function renderGapMap(pw, content) {
  if (!content) return;
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 2) { renderNarrative(pw, content); return; }

  const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
  const rows = lines.slice(2).map(l => l.split('|').map(c => c.trim()).filter(Boolean)).filter(r => r.length > 0);

  // Column layout: gap text gets ~60% of width, badges share the rest
  const GAP_W = 105;
  const BADGE_W = 13;
  const COL_STARTS = [MARGIN + 2, MARGIN + GAP_W + 2, MARGIN + GAP_W + BADGE_W + 3, MARGIN + GAP_W + BADGE_W * 2 + 4];

  const levelColor = v => {
    const k = (v || '').trim().toUpperCase().charAt(0);
    if (k === 'H') return [180, 40, 40];
    if (k === 'L') return [40, 160, 70];
    return [180, 140, 20];
  };

  const drawHeader = () => {
    pw.ensureSpace(10);
    pw.doc.setFillColor(...NAVY);
    pw.doc.rect(MARGIN, pw.y, CONTENT_W, 8, 'F');
    pw.doc.setFontSize(8); pw.doc.setTextColor(...WHITE);
    headers.forEach((h, i) => pw.doc.text(h, COL_STARTS[i] || COL_STARTS[3], pw.y + 5));
    pw.y += 9;
  };

  drawHeader();

  rows.forEach((row, ri) => {
    const gap = row[0] || '';
    const gapLines = pw.doc.splitTextToSize(gap, GAP_W - 4);
    const LINE_H = 4.5;
    const PADDING = 5;
    const rowH = Math.max(10, gapLines.length * LINE_H + PADDING * 2);

    // If this row alone doesn't fit, start new page and redraw header
    if (pw.y + rowH > pw.bottomMargin) {
      pw.newPage();
      drawHeader();
    }

    pw.doc.setFillColor(ri % 2 === 0 ? 18 : 24, ri % 2 === 0 ? 32 : 40, ri % 2 === 0 ? 50 : 58);
    pw.doc.rect(MARGIN, pw.y, CONTENT_W, rowH, 'F');

    // Gap text — vertically centred
    const textStartY = pw.y + PADDING + LINE_H * 0.7;
    pw.doc.setFontSize(8); pw.doc.setTextColor(210, 210, 210);
    gapLines.forEach((gl, gi) => pw.doc.text(gl, COL_STARTS[0], textStartY + gi * LINE_H));

    // Badges — vertically centred
    const midY = pw.y + rowH / 2;
    [row[1], row[2], row[3]].forEach((val, vi) => {
      if (!val) return;
      const bx = COL_STARTS[vi + 1];
      const label = stripMd(val);
      const col = levelColor(val);
      pw.doc.setFillColor(...col);
      pw.doc.roundedRect(bx, midY - 2.5, BADGE_W, 5, 0.5, 0.5, 'F');
      pw.doc.setFontSize(6); pw.doc.setTextColor(...WHITE);
      pw.doc.text(label, bx + BADGE_W / 2, midY + 0.8, { align: 'center' });
    });

    pw.y += rowH + 1;
  });
}

function renderQuickWins(pw, content) {
  const secs = extractSections(content);
  const items = secs.length ? secs : splitBullets(content).map((b, i) => ({ heading: b, lines: [] }));
  items.forEach((item, i) => {
    pw.numberedCard(i + 1, item.heading || '', item.lines?.join('\n') || '');
  });
}

function renderRoadmap(pw, content) {
  const secs = extractSections(content);
  const items = secs.length ? secs : splitBullets(content).map(b => ({ heading: b, lines: [] }));
  items.forEach((item, i) => {
    pw.numberedCard(i + 1, item.heading || '', item.lines?.join('\n') || '');
  });
}

function renderUseCases(pw, content) {
  const secs = extractSections(content);
  if (!secs.length) { renderNarrative(pw, content); return; }
  secs.forEach((sec, i) => {
    pw.numberedCard(i + 1, sec.heading, sec.lines.join('\n'));
  });
}

function renderNextSteps(pw, content) {
  const secs = extractSections(content);
  const items = secs.length ? secs : splitBullets(content).map(b => ({ heading: b, lines: [] }));
  items.forEach((item, i) => {
    pw.ensureSpace(12);
    // Green number
    pw.doc.setFillColor(20, 83, 45);
    pw.doc.circle(MARGIN + 3, pw.y + 2.5, 3, 'F');
    pw.doc.setFontSize(7); pw.doc.setTextColor(...WHITE);
    pw.doc.text(String(i + 1), MARGIN + 3, pw.y + 3.2, { align: 'center' });
    pw.doc.setFontSize(9); pw.doc.setTextColor(...NAVY);
    pw.doc.text(stripMd(item.heading || ''), MARGIN + 8, pw.y + 3);
    pw.y += 7;
    if (item.lines?.join('').trim()) pw.paragraph(item.lines.join('\n'), { indent: 8 });
    pw.y += 2;
  });
}

// ─── Main export ─────────────────────────────────────────────────────────────
function renderConsultantNotes(pw, notes, pillars = [], lang = 'pt') {
  if (!notes || notes.length === 0) return;
  pw.ensureSpace(10);
  pw.doc.setFontSize(9);
  pw.doc.setTextColor(...NAVY);
  pw.doc.text('Consultant Gap Analysis', MARGIN, pw.y);
  pw.y += 6;

  const priorityColor = p => p === 'high' ? [180,40,40] : p === 'low' ? [40,160,70] : [180,140,20];
  const effortColor = e => e === 'high' ? [180,40,40] : e === 'low' ? [40,160,70] : [180,140,20];

  notes.forEach((note, i) => {
    const rowH = 28;
    pw.ensureSpace(rowH + 4);
    const y0 = pw.y;
    pw.doc.setFillColor(18, 32, 50);
    pw.doc.setDrawColor(40, 70, 110);
    pw.doc.setLineWidth(0.3);
    pw.doc.roundedRect(MARGIN, y0, CONTENT_W, rowH, 2, 2, 'FD');

    // Number circle
    pw.doc.setFillColor(...BLUE);
    pw.doc.circle(MARGIN + 5, y0 + 6, 3.5, 'F');
    pw.doc.setFontSize(7); pw.doc.setTextColor(...WHITE);
    pw.doc.text(String(i + 1), MARGIN + 5, y0 + 7.2, { align: 'center' });

    // Pillar code
    pw.doc.setFontSize(8); pw.doc.setTextColor(150, 180, 220);
    pw.doc.text(getPillarLabel(note.pillar_code, pillars, lang), MARGIN + 11, y0 + 6.5);

    // Badges: priority, effort, impact
    const badgeData = [
      { label: `Priority: ${note.priority || 'medium'}`, col: priorityColor(note.priority) },
      { label: `Effort: ${note.effort || 'medium'}`, col: effortColor(note.effort) },
      { label: `Impact: ${note.impact || 'medium'}`, col: effortColor(note.impact) },
    ];
    let bx = W - MARGIN - 2;
    badgeData.reverse().forEach(b => {
      const bw = 30;
      bx -= bw + 2;
      pw.doc.setFillColor(...b.col);
      pw.doc.roundedRect(bx, y0 + 2, bw, 6, 1, 1, 'F');
      pw.doc.setFontSize(6); pw.doc.setTextColor(...WHITE);
      pw.doc.text(b.label, bx + bw / 2, y0 + 5.5, { align: 'center' });
    });

    // Gap description
    if (note.gap_description) {
      pw.doc.setFontSize(8); pw.doc.setTextColor(210, 210, 210);
      const gLines = pw.doc.splitTextToSize(stripMd(note.gap_description), CONTENT_W - 16);
      gLines.slice(0, 1).forEach(l => pw.doc.text(l, MARGIN + 11, y0 + 13));
    }
    // Mitigation
    if (note.mitigation) {
      pw.doc.setFontSize(7.5); pw.doc.setTextColor(120, 160, 120);
      const mLines = pw.doc.splitTextToSize(stripMd(note.mitigation), CONTENT_W - 16);
      mLines.slice(0, 1).forEach(l => pw.doc.text(l, MARGIN + 11, y0 + 20));
    }

    pw.y = y0 + rowH + 3;
  });
  pw.y += 2;
}

export async function exportReportPDF(report, assessment, customer, pdfSections = [1,2,3,4,5,6,7,8,9], pdfVisuals = false, visualImages = [], consultantNotes = [], subAssessment = null, subPillarScores = [], subPillars = [], subVisualImages = [], template = null, mainPillars = []) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const lang = report.language || 'pt';
  const sectionTitles = lang === 'en'
    ? ['Executive Summary','Methodology','Results by Pillar','Maturity Radar','Gap Map','Quick Wins','Roadmap','Use Case Recommendations','Next Steps']
    : ['Sumário Executivo','Metodologia','Resultados por Pilar','Radar de Maturidade','Mapa de Gaps','Quick Wins','Roadmap','Recomendação de Casos de Uso','Próximos Passos'];

  // ── Cover ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 90, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, 5, 90, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.text(lang === 'pt' ? 'Relatório de Maturidade em IA' : 'AI Readiness Report', 20, 32);
  doc.setFontSize(13); doc.setTextColor(150, 180, 220);
  doc.text(customer.company || '', 20, 44);
  if (template) {
    doc.setFontSize(10);
    doc.setTextColor(170, 190, 215);
    doc.text(lang === 'en' ? template.name_en || template.name_pt : template.name_pt, 20, 51);
  }
  doc.setFontSize(10); doc.setTextColor(180, 200, 220);
  doc.text(`${customer.name} · ${customer.role || ''}`, 20, template ? 58 : 53);
  doc.text(new Date(assessment.completed_at || assessment.created_date).toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB'), 20, template ? 66 : 61);
  doc.setFillColor(...BLUE);
  doc.roundedRect(130, 26, 60, 45, 4, 4, 'F');
  doc.setTextColor(...WHITE); doc.setFontSize(34);
  doc.text(`${assessment.global_score?.toFixed(1) || '–'}/5`, 160, 50, { align: 'center' });
  doc.setFontSize(9);
  doc.text(lang === 'pt' ? 'Score Global' : 'Global Score', 160, 59, { align: 'center' });

  // ── Visuals page ──
  if (pdfVisuals && visualImages.length > 0) {
    doc.addPage();
    // Header
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 16, 'F');
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, 3, 16, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.text(lang === 'pt' ? 'Visuals da Avaliação' : 'Assessment Visuals', MARGIN, 11);

    let vy = 22;
    const [scoreImg, radarImg, barImg, gridImg] = visualImages;

    // Row 1: Score (50mm) | Radar (120mm)
    if (scoreImg) {
      doc.addImage(scoreImg.split(',')[1], 'PNG', MARGIN, vy, 48, 70);
    }
    if (radarImg) {
      doc.addImage(radarImg.split(',')[1], 'PNG', MARGIN + 52, vy, 118, 70);
    }
    vy += 74;

    // Row 2: Bar chart full width
    if (barImg) {
      doc.addImage(barImg.split(',')[1], 'PNG', MARGIN, vy, CONTENT_W, 52);
    }
    vy += 56;

    // Row 3: Pillar grid full width
    if (gridImg) {
      doc.addImage(gridImg.split(',')[1], 'PNG', MARGIN, vy, CONTENT_W, 46);
    }
  }

  // ── Section pages ──
  const pw = new PdfWriter(doc);
  const sectionRenderers = {
    1: renderExecutiveSummary,
    2: renderNumberedCards,
    3: renderPillarResults,
    4: renderNumberedCards,
    5: renderGapMap,
    6: (pw, content) => { renderQuickWins(pw, content); renderConsultantNotes(pw, consultantNotes, mainPillars, lang); },
    7: renderRoadmap,
    8: renderUseCases,
    9: renderNumberedCards,
  };

  pdfSections.forEach(n => {
    const content = report[`section_${n}`];
    if (!content) return;
    pw.sectionHeader(n, sectionTitles[n - 1]);
    (sectionRenderers[n] || renderNarrative)(pw, content);
  });

  // ── Annex 01 – Consultant Notes ──
  if (consultantNotes && consultantNotes.length > 0) {
    pw.newPage();
    pw.sectionHeader('A', lang === 'pt' ? 'Anexo 01 – Notas do Consultor e Análise de Gaps' : 'Annex 01 – Consultant Notes & Gap Analysis');

    const priorityColor = p => p === 'high' ? [180,40,40] : p === 'low' ? [40,160,70] : [180,140,20];

    consultantNotes.forEach((note, i) => {
      const parts = [];
      if (note.gap_description) parts.push(stripMd(note.gap_description));
      if (note.mitigation) parts.push(stripMd(note.mitigation));
      const body = parts.join('\n\n');
      const title = getPillarLabel(note.pillar_code, mainPillars, lang);

      pw.ensureSpace(22);
      const startY = pw.y;

      const pCol = priorityColor(note.priority);
      doc.setFillColor(...pCol);
      doc.rect(W - MARGIN - 3, startY - 1, 3, 12, 'F');

      doc.setFillColor(...BLUE);
      doc.circle(MARGIN + 3, startY + 2.5, 3, 'F');
      doc.setFontSize(7); doc.setTextColor(...WHITE);
      doc.text(String(i + 1), MARGIN + 3, startY + 3.2, { align: 'center' });

      doc.setFontSize(9); doc.setTextColor(...NAVY);
      doc.text(title, MARGIN + 8, startY + 3);
      pw.y += 7;

      if (body) pw.paragraph(body, { indent: 8, color: GRAY });

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.line(MARGIN, pw.y + 1, W - MARGIN, pw.y + 1);
      pw.y += 4;
    });
  }

  // ── Annex 02 – Data Sub-Assessment ──
  if (subAssessment && subAssessment.status === 'completed' && subPillarScores.length > 0) {
    pw.newPage();
    const subAssessmentLabel = getPillarLabel(subAssessment.sub_assessment_for_pillar, mainPillars, lang);
    const annexTitle = subAssessmentLabel
      ? (lang === 'pt'
        ? `Anexo 02 – Sub-Avaliação de ${subAssessmentLabel}`
        : `Annex 02 – ${subAssessmentLabel} Sub-Assessment`)
      : (lang === 'pt' ? 'Anexo 02 – Avaliação Complementar' : 'Annex 02 – Supplementary Sub-Assessment');
    pw.sectionHeader('B', annexTitle);

    // Score banner
    pw.ensureSpace(20);
    doc.setFillColor(30, 26, 10);
    doc.setDrawColor(249, 115, 22, 0.4);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, pw.y, CONTENT_W, 18, 2, 2, 'FD');
    doc.setTextColor(249, 115, 22);
    doc.setFontSize(10);
    doc.text(
      subAssessmentLabel
        ? (lang === 'pt' ? `Score Global - ${subAssessmentLabel}` : `${subAssessmentLabel} Global Score`)
        : (lang === 'pt' ? 'Score Global da Sub-Avaliação' : 'Sub-Assessment Global Score'),
      MARGIN + 6,
      pw.y + 7
    );
    doc.setFontSize(16); doc.setTextColor(...WHITE);
    doc.text(`${subAssessment.global_score?.toFixed(2) || '–'}/5.0`, W - MARGIN - 6, pw.y + 11, { align: 'right' });
    pw.y += 22;

    // Pillar scores table
    pw.ensureSpace(12);
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, pw.y, CONTENT_W, 8, 'F');
    doc.setFontSize(8); doc.setTextColor(...WHITE);
    doc.text(lang === 'pt' ? 'Pilar' : 'Pillar', MARGIN + 3, pw.y + 5);
    doc.text('Score', W - MARGIN - 20, pw.y + 5);
    doc.text('Peso', W - MARGIN - 40, pw.y + 5);
    pw.y += 9;

    subPillarScores.forEach((ps, ri) => {
      const pillar = subPillars.find(p => p.code === ps.code);
      const name = lang === 'pt' ? (pillar?.name_pt || ps.code) : (pillar?.name_en || pillar?.name_pt || ps.code);
      const rowH = 9;
      pw.ensureSpace(rowH + 2);
      doc.setFillColor(ri % 2 === 0 ? 18 : 24, ri % 2 === 0 ? 26 : 32, ri % 2 === 0 ? 10 : 16);
      doc.rect(MARGIN, pw.y, CONTENT_W, rowH, 'F');
      doc.setFontSize(8); doc.setTextColor(220, 200, 150);
      doc.text(name, MARGIN + 3, pw.y + 6);
      // Score bar
      const barW = 50;
      const barX = W - MARGIN - 65;
      doc.setFillColor(40, 30, 10);
      doc.rect(barX, pw.y + 2.5, barW, 4, 'F');
      const s = Math.min(ps.score || 0, 5);
      const fc = s < 2 ? [239,68,68] : s < 3 ? [249,115,22] : s < 3.6 ? [234,179,8] : s < 4.3 ? [34,197,94] : [59,130,246];
      doc.setFillColor(...fc);
      doc.rect(barX, pw.y + 2.5, barW * (s / 5), 4, 'F');
      doc.setTextColor(...WHITE); doc.setFontSize(8);
      doc.text(`${s.toFixed(2)}/5`, W - MARGIN - 20, pw.y + 6);
      if (pillar?.weight) { doc.setTextColor(180, 160, 100); doc.text(`${pillar.weight}%`, W - MARGIN - 40, pw.y + 6); }
      pw.y += rowH + 1;
    });
    pw.y += 6;

    // Visual charts
    if (subVisualImages.length > 0) {
      const [scoreImg, radarImg, barImg, gridImg] = subVisualImages;
      pw.newPage();
      doc.setFillColor(...NAVY);
      doc.rect(0, 0, W, 16, 'F');
      doc.setFillColor(249, 115, 22);
      doc.rect(0, 0, 3, 16, 'F');
      doc.setTextColor(...WHITE); doc.setFontSize(10);
      doc.text(
        subAssessmentLabel
          ? `Visuals – ${subAssessmentLabel}`
          : (lang === 'pt' ? 'Visuals – Sub-Avaliação' : 'Visuals – Sub-Assessment'),
        MARGIN,
        11
      );

      let vy = 22;
      if (scoreImg) doc.addImage(scoreImg.split(',')[1], 'PNG', MARGIN, vy, 44, 62);
      if (radarImg) doc.addImage(radarImg.split(',')[1], 'PNG', MARGIN + 48, vy, 122, 62);
      vy += 66;
      if (barImg) doc.addImage(barImg.split(',')[1], 'PNG', MARGIN, vy, CONTENT_W, 50);
      vy += 54;
      if (gridImg) doc.addImage(gridImg.split(',')[1], 'PNG', MARGIN, vy, CONTENT_W, 44);
    }
  }

  // ── Footer on all pages ──

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text('Powered by Oramix · AI Readiness Assessment', MARGIN, 292);
    doc.text(`${i} / ${total}`, W - MARGIN, 292, { align: 'right' });
  }

  doc.save(`AI_Readiness_${(customer.company || 'report').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}
