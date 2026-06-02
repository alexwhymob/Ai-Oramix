import { describe, expect, it, vi } from 'vitest';
import { createEmailProviderClient } from '../src/services/email/emailClient.js';
import { sendEmailWithResend } from '../src/services/email/resend.provider.js';

describe('email client', () => {
  it('requires RESEND_API_KEY for the resend provider', () => {
    expect(() => createEmailProviderClient({
      EMAIL_PROVIDER: 'resend',
      EMAIL_FROM: 'Oramix <hello@example.com>'
    })).toThrow(/RESEND_API_KEY is required/);
  });

  it('rejects unsupported providers with a clear error', () => {
    expect(() => createEmailProviderClient({
      EMAIL_PROVIDER: 'smtp'
    })).toThrow(/SMTP email provider is not implemented yet/);
  });

  it('sends email through Resend API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'email-1'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmailWithResend({
      apiKey: 'test-key',
      from: 'Oramix <hello@example.com>',
      to: 'customer@example.com',
      subject: 'Report ready',
      text: 'Hello'
    });

    expect(result).toEqual({ provider: 'resend', id: 'email-1' });
    expect(fetchMock).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });
});
