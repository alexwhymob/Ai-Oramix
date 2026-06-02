const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

export async function sendEmailWithResend({
  apiKey,
  from,
  to,
  subject,
  text,
  html = null
}) {
  const response = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      ...(html ? { html } : {})
    })
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.message || `Resend request failed with status ${response.status}`);
    error.code = 'resend_request_failed';
    error.status = response.status >= 400 && response.status < 500 ? 502 : 500;
    error.providerStatus = response.status;
    throw error;
  }

  return {
    provider: 'resend',
    id: data?.id || null
  };
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
