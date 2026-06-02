import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { assessmentId, language = 'pt', sections } = await req.json();
    const selectedSections = sections || ['section_1','section_2','section_3','section_4','section_5','section_6','section_7','section_8','section_9'];
    const has = (k) => selectedSections.includes(k);

    const [assessment, pillars, allQuestions] = await Promise.all([
      base44.asServiceRole.entities.Assessment.get(assessmentId),
      base44.asServiceRole.entities.Pillar.list('order'),
      base44.asServiceRole.entities.Question.list('order'),
    ]);

    const [customersArr, answers] = await Promise.all([
      base44.asServiceRole.entities.Customer.filter({ id: assessment.customer_id }),
      base44.asServiceRole.entities.AssessmentAnswer.filter({ assessment_id: assessmentId }),
    ]);

    const customer = customersArr[0] || {};
    const pillarScores = JSON.parse(assessment.pillar_scores || '[]');

    const detailedAnswers = pillars.map(pillar => {
      const pqs = allQuestions.filter(q => q.pillar_code === pillar.code);
      const ps = pillarScores.find(p => p.code === pillar.code);
      const lines = pqs.map(q => {
        const ans = answers.find(a => a.question_id === q.id);
        const val = ans?.value || 0;
        const anchor = val > 0 ? (q[`anchor_${val}_pt`] || '') : 'Não respondida';
        return `  [${q.code}] ${q.text_pt}: ${val}/5 – "${anchor}"`;
      });
      return `${pillar.name_pt} (Score: ${ps?.score?.toFixed(2) || 0}/5, Peso: ${pillar.weight}%)\n${lines.join('\n')}`;
    }).join('\n\n');

    const maturityLabel = getLabel(assessment.global_score, language);
    const langLabel = language === 'en' ? 'English' : 'Portuguese (European Portuguese)';

    const context = `ORGANISATION: ${customer.company} | Sector: ${customer.sector || 'N/A'} | Size: ${customer.company_size || 'N/A'} | Contact: ${customer.name} (${customer.role || ''}) | Date: ${new Date(assessment.completed_at).toLocaleDateString('pt-PT')}
GLOBAL SCORE: ${assessment.global_score?.toFixed(2)}/5.0 | Maturity: ${maturityLabel}
PILLAR SCORES: ${pillarScores.map(p => `${p.name_pt}: ${p.score?.toFixed(2)}/5 (${p.weight}%)`).join(', ')}
DETAILED ANSWERS:\n${detailedAnswers}`;

    const sectionDescriptions = {
      section_1: 'Executive Summary: global score, top 3 strengths, top 3 gaps, key recommendation. Markdown.',
      section_2: 'Methodology: pillar descriptions, 1-5 scale explanation, data collection process. Markdown.',
      section_3: 'Results by Pillar: detailed analysis for each of the 6 pillars with scores and insights from actual answers. Markdown.',
      section_4: 'Maturity Radar: written interpretation of the radar, identifying patterns and outliers. Markdown.',
      section_5: 'Gap Map: prioritized markdown table with columns: Gap | Impact (H/M/L) | Effort (H/M/L) | Priority (1-5). Markdown.',
      section_6: 'Quick Wins: 3-5 specific actionable items for 0-3 months with expected outcome. Markdown.',
      section_7: 'Roadmap: structured plan with milestones for 3, 6, and 12 months. Markdown.',
      section_8: 'AI Use Cases: 2-3 specific justified AI use cases prioritized by assessment results, with business value. Markdown.',
      section_9: 'Next Steps: concrete engagement proposal and support plan from Oramix. Markdown.',
    };

    // Split into 3 groups and run in parallel — only call groups with selected sections
    const makeCall = (keys) => {
      const filtered = keys.filter(has);
      if (filtered.length === 0) return Promise.resolve({});
      const props = {};
      filtered.forEach(k => { props[k] = { type: 'string', description: sectionDescriptions[k] }; });
      return base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a senior AI Readiness consultant. Write in ${langLabel}. Reference ${customer.company} by name. Be specific and data-driven.\n\n${context}\n\nGenerate JSON with these ${filtered.length} report section(s).`,
        model: 'gpt_5_4',
        response_json_schema: { type: 'object', properties: props, required: filtered }
      });
    };

    const [result1, result2, result3] = await Promise.all([
      makeCall(['section_1', 'section_2', 'section_3']),
      makeCall(['section_4', 'section_5', 'section_6']),
      makeCall(['section_7', 'section_8', 'section_9']),
    ]);

    const existing = await base44.asServiceRole.entities.Report.filter({ assessment_id: assessmentId });
    const reportData = {
      assessment_id: assessmentId,
      status: 'review',
      ...result1,
      ...result2,
      ...result3,
      generated_at: new Date().toISOString(),
      language,
    };

    let report;
    if (existing.length > 0) {
      report = await base44.asServiceRole.entities.Report.update(existing[0].id, reportData);
    } else {
      report = await base44.asServiceRole.entities.Report.create(reportData);
    }

    return Response.json({ success: true, reportId: report.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getLabel(score, lang) {
  if (!score) return 'N/A';
  if (score < 2)   return lang === 'en' ? 'Not Ready' : 'Não Preparado';
  if (score < 3)   return lang === 'en' ? 'Emerging' : 'Emergente';
  if (score < 3.6) return lang === 'en' ? 'Developing' : 'Em Desenvolvimento';
  if (score < 4.3) return lang === 'en' ? 'Ready' : 'Preparado';
  return lang === 'en' ? 'Advanced' : 'Avançado';
}