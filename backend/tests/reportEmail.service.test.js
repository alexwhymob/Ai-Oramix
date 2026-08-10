import { describe, expect, it, vi } from 'vitest';
import {
  buildReportReadyEmail,
  createSendReport
} from '../src/services/reportEmail.service.js';
import { renderNotificationTemplate } from '../src/services/notificationTemplate.service.js';

describe('report email service', () => {
  it('builds a Portuguese report-ready email', () => {
    const message = buildReportReadyEmail({
      assessment: { global_score: 3.4 },
      customer: {
        name: 'Ana',
        company: 'Oramix',
        language: 'pt'
      }
    });

    expect(message.subject).toContain('Oramix');
    expect(message.text).toContain('Score Global: 3.40/5.0');
    expect(message.text).toContain('Nivel de Maturidade: Em Desenvolvimento');
  });

  it('requires an authenticated admin or account manager', async () => {
    const sendReport = createSendReport({});

    await expect(sendReport({ assessmentId: 'assessment-1' }, { actor: null })).rejects.toMatchObject({
      code: 'auth_required',
      status: 401
    });

    await expect(sendReport({ assessmentId: 'assessment-1' }, { actor: { role: 'ai_consultant' } })).rejects.toMatchObject({
      code: 'forbidden',
      status: 403
    });
  });

  it('sends a report notification through injected dependencies', async () => {
    const sendEmail = vi.fn().mockResolvedValue({ provider: 'resend', id: 'email-1' });
    const sendReport = createSendReport({
      Assessment: {
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            id: 'assessment-1',
            customer_id: 'customer-1',
            global_score: 4.1
          })
        })
      },
      Customer: {
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            id: 'customer-1',
            email: 'ana@example.com',
            name: 'Ana',
            company: 'Oramix',
            language: 'en'
          })
        })
      },
      Report: {
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            id: 'report-1',
            assessment_id: 'assessment-1'
          })
        })
      },
      NotificationTemplate: {
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null)
        })
      },
      email: { sendEmail }
    });

    const result = await sendReport(
      { assessmentId: 'assessment-1' },
      { actor: { id: 'user-1', role: 'admin' } }
    );

    expect(result).toEqual({
      success: true,
      to: 'ana@example.com',
      provider: 'resend',
      messageId: 'email-1'
    });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'ana@example.com',
      subject: 'Your AI Readiness Report is ready - Oramix'
    }));
  });

  it('renders a notification template with variables', () => {
    const rendered = renderNotificationTemplate({
      subject_pt: 'Relatorio pronto - {{company}}',
      subject_en: 'Report ready - {{company}}',
      body_pt: '<p>Ola {{customer_name}}</p>',
      body_en: '<p>Hello {{customer_name}}</p>',
      from_email: 'Oramix <test@oramix.pt>'
    }, {
      company: 'Oramix',
      customer_name: 'Ana'
    }, 'pt');

    expect(rendered.subject).toBe('Relatorio pronto - Oramix');
    expect(rendered.html).toContain('Ana');
    expect(rendered.text).toContain('Ola Ana');
  });
});
