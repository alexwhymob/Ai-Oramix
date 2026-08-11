import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { assessmentId, appUrl } = await req.json();

    const assessment = await base44.asServiceRole.entities.Assessment.get(assessmentId);
    const customersArr = await base44.asServiceRole.entities.Customer.filter({ id: assessment.customer_id });
    const customer = customersArr[0];

    if (!customer?.email) {
      return Response.json({ error: 'Customer email not found' }, { status: 400 });
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const maturityLabel = getLabel(assessment.global_score, customer.language || 'pt');
    const isPt = (customer.language || 'pt') === 'pt';

    const subject = isPt
      ? `O seu Relatório de Maturidade em IA está pronto – ${customer.company}`
      : `Your AI Readiness Report is ready – ${customer.company}`;

    const textBody = isPt
      ? `Caro/a ${customer.name},\n\nO seu Relatório de Maturidade em IA está pronto.\n\nScore Global: ${assessment.global_score?.toFixed(2)}/5.0\nNível de Maturidade: ${maturityLabel}\n\nEntre em contacto com a equipa Oramix para aceder ao relatório completo.\n\nCom os melhores cumprimentos,\nEquipa Oramix`
      : `Dear ${customer.name},\n\nYour AI Readiness Report is ready.\n\nGlobal Score: ${assessment.global_score?.toFixed(2)}/5.0\nMaturity Level: ${maturityLabel}\n\nPlease contact the Oramix team to access the full report.\n\nBest regards,\nOramix Team`;

    const { error } = await resend.emails.send({
      from: 'Oramix Assessment Platform <onboarding@resend.dev>',
      to: customer.email,
      subject,
      text: textBody,
    });

    if (error) {
      return Response.json({ error: error.message });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message });
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
