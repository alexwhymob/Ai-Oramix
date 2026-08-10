const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

export async function generateStructuredObjectWithAnthropic({
  apiKey,
  model,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  temperature = 0.3
}) {
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature,
      system: [
        systemPrompt,
        'Return only valid JSON that matches the required schema.',
        `Schema name: ${schemaName}.`,
        `JSON schema: ${JSON.stringify(schema)}`
      ].filter(Boolean).join('\n\n'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt
            }
          ]
        }
      ]
    })
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw createLlmError(
      data?.error?.message || `Anthropic request failed with status ${response.status}`,
      'anthropic_request_failed',
      response.status
    );
  }

  const outputText = extractAnthropicText(data);
  if (!outputText) {
    throw createLlmError('Anthropic returned an empty structured response', 'anthropic_empty_response', 502);
  }

  try {
    return JSON.parse(extractJsonBlock(outputText));
  } catch {
    throw createLlmError('Anthropic returned invalid JSON output', 'anthropic_invalid_json', 502);
  }
}

export async function generateTextWithAnthropic({
  apiKey,
  model,
  prompt,
  systemPrompt = null,
  temperature = 0.7
}) {
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    })
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw createLlmError(
      data?.error?.message || `Anthropic request failed with status ${response.status}`,
      'anthropic_request_failed',
      response.status
    );
  }

  return extractAnthropicText(data)?.trim() || '';
}

function extractAnthropicText(data) {
  return data?.content
    ?.filter((item) => item?.type === 'text' && typeof item?.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim() || '';
}

function extractJsonBlock(text) {
  const trimmed = String(text || '').trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  return fencedMatch?.[1]?.trim() || trimmed;
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function createLlmError(message, code, status = 500) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}
