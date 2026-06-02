export function getMaturityLevel(score) {
  if (!score || score < 1) return { key: 'unknown', label_pt: 'N/A', label_en: 'N/A', emoji: '⚪', color: 'gray', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  if (score < 2)   return { key: 'not_ready',   label_pt: 'Não Preparado',    label_en: 'Not Ready',       emoji: '🔴', color: 'red',    bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    recommendation_pt: 'Projeto fundacional de dados e governance antes de considerar IA', recommendation_en: 'Foundational data and governance project before considering AI' };
  if (score < 3)   return { key: 'emerging',    label_pt: 'Emergente',        label_en: 'Emerging',        emoji: '🟠', color: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', recommendation_pt: 'Investir em quick wins de dados + formação; pilotos só em processos simples', recommendation_en: 'Invest in data quick wins + training; pilots only in simple processes' };
  if (score < 3.6) return { key: 'developing',  label_pt: 'Em Desenvolvimento', label_en: 'Developing',    emoji: '🟡', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', recommendation_pt: 'Pilotos focados nos gaps identificados; reforçar segurança e compliance', recommendation_en: 'Pilots focused on identified gaps; reinforce security and compliance' };
  if (score < 4.3) return { key: 'ready',       label_pt: 'Preparado',        label_en: 'Ready',           emoji: '🟢', color: 'green',  bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  recommendation_pt: 'Projetos de IA com confiança; focar em governance e ROI', recommendation_en: 'AI projects with confidence; focus on governance and ROI' };
  return             { key: 'advanced',      label_pt: 'Avançado',         label_en: 'Advanced',        emoji: '🔵', color: 'blue',   bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   recommendation_pt: 'Escalar, otimizar e inovar; explorar casos de uso avançados', recommendation_en: 'Scale, optimise and innovate; explore advanced use cases' };
}

export function calculateScores(pillars, questions, answers) {
  const pillarScores = pillars.map(pillar => {
    const pillarQs = questions.filter(q => q.pillar_code === pillar.code);
    const values = pillarQs.map(q => answers[q.id]).filter(v => v && v > 0);
    const score = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return {
      code: pillar.code,
      name_pt: pillar.name_pt,
      name_en: pillar.name_en,
      weight: pillar.weight,
      order: pillar.order,
      score: Math.round(score * 100) / 100,
      answered: values.length,
      total: pillarQs.length
    };
  });

  const globalScore = pillarScores.reduce((sum, p) => sum + (p.score * (p.weight / 100)), 0);
  return { pillarScores, globalScore: Math.round(globalScore * 100) / 100 };
}

export function getScoreColor(score) {
  if (score < 2)   return '#ef4444';
  if (score < 3)   return '#f97316';
  if (score < 3.6) return '#eab308';
  if (score < 4.3) return '#22c55e';
  return '#3b82f6';
}