import { env } from '../../config/env.js';
import { sendEmailWithResend } from './resend.provider.js';

export async function sendEmail(options) {
  const provider = createEmailProviderClient();
  return provider.sendEmail(options);
}

export function createEmailProviderClient(runtimeEnv = env) {
  switch (runtimeEnv.EMAIL_PROVIDER) {
    case 'resend':
      return createResendClient(runtimeEnv);
    case 'smtp': {
      const error = new Error('SMTP email provider is not implemented yet');
      error.code = 'email_provider_not_supported';
      error.status = 501;
      throw error;
    }
    default: {
      const error = new Error(`Unknown email provider: ${runtimeEnv.EMAIL_PROVIDER}`);
      error.code = 'unknown_email_provider';
      error.status = 500;
      throw error;
    }
  }
}

function createResendClient(runtimeEnv) {
  if (!runtimeEnv.RESEND_API_KEY) {
    const error = new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
    error.code = 'missing_resend_api_key';
    error.status = 500;
    throw error;
  }

  return {
    sendEmail: (options) => sendEmailWithResend({
      apiKey: runtimeEnv.RESEND_API_KEY,
      from: runtimeEnv.EMAIL_FROM,
      ...options
    })
  };
}
