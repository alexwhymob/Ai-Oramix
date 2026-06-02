import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    const assessmentId = event?.entity_id;
    if (!assessmentId) {
      return Response.json({ skipped: true, reason: 'No entity_id in event' });
    }

    const assessment = data || await base44.asServiceRole.entities.Assessment.get(assessmentId);

    // Only trigger for main assessments that are completed
    if (assessment.status !== 'completed') {
      return Response.json({ skipped: true, reason: 'Not completed' });
    }
    if (assessment.assessment_type === 'sub_assessment') {
      return Response.json({ skipped: true, reason: 'Already a sub-assessment' });
    }

    // Parse pillar scores and check data pillar
    let pillarScores = [];
    try { pillarScores = JSON.parse(assessment.pillar_scores || '[]'); } catch { }

    const dataScore = pillarScores.find(p => p.code === 'dados')?.score;
    if (dataScore === undefined || dataScore >= 2.5) {
      return Response.json({ skipped: true, reason: `Data score ${dataScore} >= 2.5, no sub-assessment needed` });
    }

    // Check if sub-assessment already exists
    const existing = await base44.asServiceRole.entities.Assessment.filter({
      parent_assessment_id: assessmentId,
    });
    if (existing.length > 0) {
      return Response.json({ skipped: true, reason: 'Sub-assessment already exists', subAssessmentId: existing[0].id });
    }

    // Create the sub-assessment
    const subAssessment = await base44.asServiceRole.entities.Assessment.create({
      customer_id: assessment.customer_id,
      assessment_type: 'sub_assessment',
      parent_assessment_id: assessmentId,
      sub_assessment_for_pillar: 'dados',
      status: 'not_started',
      language: assessment.language || 'pt',
    });

    console.log(`[createDataSubAssessment] Created sub-assessment ${subAssessment.id} for assessment ${assessmentId} (data score: ${dataScore})`);
    return Response.json({ success: true, subAssessmentId: subAssessment.id, dataScore });

  } catch (error) {
    console.error('[createDataSubAssessment] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});