import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BLOCKED_EMAIL_DOMAINS = [
  'gmail.com','googlemail.com','yahoo.com','yahoo.co.uk','yahoo.fr','yahoo.es','yahoo.it','yahoo.de','yahoo.com.br',
  'hotmail.com','hotmail.co.uk','hotmail.fr','hotmail.es','hotmail.it','hotmail.de',
  'outlook.com','outlook.pt','outlook.com.br','live.com','live.co.uk','live.fr','msn.com','aol.com',
  'icloud.com','me.com','mac.com','protonmail.com','proton.me','mail.com','email.com',
  'sapo.pt','clix.pt','net.sapo.pt','iol.pt','terra.com.br','uol.com.br','bol.com.br','ig.com.br',
  'yandex.com','yandex.ru','zoho.com','tutanota.com','gmx.com','gmx.net','gmx.de','web.de','inbox.com','fastmail.com','rediffmail.com',
];

function isCorporateEmail(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? !BLOCKED_EMAIL_DOMAINS.includes(domain) : false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json();
    const { action } = body;

    // Register a new customer (validates corporate email server-side)
    if (action === 'registerCustomer') {
      const { form } = body;
      if (!isCorporateEmail(form.email)) {
        return Response.json({ error: 'non_corporate_email' }, { status: 422 });
      }
      if (!form.role || !form.role.trim()) {
        return Response.json({ error: 'job_title_required' }, { status: 422 });
      }
      const qr_token = crypto.randomUUID();
      const customer = await sr.entities.Customer.create({ ...form, qr_token, registered_by: 'self', language: form.language });
      await sr.entities.Assessment.create({ customer_id: customer.id, status: 'in_progress', started_at: new Date().toISOString(), language: form.language });
      return Response.json({ qr_token });
    }

    // Register a customer by an internal/admin user (validates corporate email + job title)
    if (action === 'adminRegister') {
      const { form } = body;
      if (!isCorporateEmail(form.email)) {
        return Response.json({ error: 'non_corporate_email' });
      }
      if (!form.role || !form.role.trim()) {
        return Response.json({ error: 'job_title_required' });
      }
      const qr_token = crypto.randomUUID();
      const customer = await sr.entities.Customer.create({ ...form, qr_token, registered_by: 'admin' });
      await sr.entities.Assessment.create({ customer_id: customer.id, status: 'not_started', language: form.language });
      return Response.json({ customer });
    }

    // Load quiz session by QR token — find or create assessment
    if (action === 'load') {
      const { token } = body;
      const customers = await sr.entities.Customer.filter({ qr_token: token });
      if (!customers.length) return Response.json({ error: 'invalid_token' }, { status: 404 });
      const customer = customers[0];

      const allAssessments = await sr.entities.Assessment.filter({ customer_id: customer.id });
      const assessments = allAssessments.filter(a => a.assessment_type !== 'sub_assessment');

      let assessment;
      if (assessments.length > 0) {
        assessment = assessments[0];
      } else {
        assessment = await sr.entities.Assessment.create({
          customer_id: customer.id,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          language: customer.language || 'pt',
        });
      }

      let existingAnswers = [];
      if (assessment.status !== 'completed') {
        existingAnswers = await sr.entities.AssessmentAnswer.filter({ assessment_id: assessment.id });
      }

      return Response.json({ customer, assessment, existingAnswers });
    }

    // Submit main quiz answers and scores
    if (action === 'submit') {
      const { assessmentId, answers, globalScore, maturityLevel, pillarScores } = body;
      if (answers?.length) {
        await sr.entities.AssessmentAnswer.bulkCreate(answers);
      }
      await sr.entities.Assessment.update(assessmentId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        global_score: globalScore,
        maturity_level: maturityLevel,
        pillar_scores: JSON.stringify(pillarScores),
      });
      return Response.json({ success: true });
    }

    // Load sub-quiz session — marks as in_progress if not started
    if (action === 'loadSub') {
      const { assessmentId } = body;
      const assessment = await sr.entities.Assessment.get(assessmentId);
      if (!assessment) return Response.json({ error: 'not_found' }, { status: 404 });

      let updatedAssessment = assessment;
      if (assessment.status === 'not_started') {
        updatedAssessment = await sr.entities.Assessment.update(assessmentId, {
          status: 'in_progress',
          started_at: new Date().toISOString(),
        });
      }

      const customer = await sr.entities.Customer.get(assessment.customer_id);
      return Response.json({ assessment: updatedAssessment, customer: customer || null });
    }

    // Submit sub-quiz answers and scores
    if (action === 'submitSub') {
      const { assessmentId, answers, globalScore, maturityLevel, pillarScores } = body;
      if (answers?.length) {
        await sr.entities.AssessmentAnswer.bulkCreate(answers);
      }
      await sr.entities.Assessment.update(assessmentId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        global_score: globalScore,
        maturity_level: maturityLevel,
        pillar_scores: JSON.stringify(pillarScores),
      });
      return Response.json({ success: true });
    }

    // Get main assessment result (assessment + customer + answers)
    if (action === 'getResult') {
      const { assessmentId } = body;
      const assessment = await sr.entities.Assessment.get(assessmentId);
      if (!assessment) return Response.json({ error: 'not_found' }, { status: 404 });
      const customer = await sr.entities.Customer.get(assessment.customer_id);
      const answers = await sr.entities.AssessmentAnswer.filter({ assessment_id: assessmentId });
      return Response.json({ assessment, customer: customer || null, answers });
    }

    // Poll for sub-assessments linked to a parent assessment
    if (action === 'getSubAssessments') {
      const { assessmentId } = body;
      const subAssessments = await sr.entities.Assessment.filter({ parent_assessment_id: assessmentId });
      return Response.json({ subAssessments });
    }

    // Get sub-assessment result page data
    if (action === 'getSubResult') {
      const { assessmentId } = body;
      const assessment = await sr.entities.Assessment.get(assessmentId);
      if (!assessment) return Response.json({ error: 'not_found' }, { status: 404 });
      const customer = await sr.entities.Customer.get(assessment.customer_id);
      return Response.json({ assessment, customer: customer || null });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    console.error('[quizSession]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});