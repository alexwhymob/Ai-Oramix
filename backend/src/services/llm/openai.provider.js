const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

export async function generateStructuredObjectWithOpenAI({
  apiKey,
  model,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  temperature = 0.4
}) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: buildInput(systemPrompt, userPrompt),
      temperature,
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          schema,
          strict: true
        }
      }
    })
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw createLlmError(
      data?.error?.message || `OpenAI request failed with status ${response.status}`,
      'openai_request_failed',
      response.status
    );
  }

  const refusal = extractRefusal(data);
  if (refusal) {
    throw createLlmError(refusal, 'llm_refused', 422);
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    throw createLlmError('OpenAI returned an empty structured response', 'openai_empty_response', 502);
  }

  try {
    return JSON.parse(outputText);
  } catch {
    throw createLlmError('OpenAI returned invalid JSON output', 'openai_invalid_json', 502);
  }
}

export async function generateTextWithOpenAI({
  apiKey,
  model,
  prompt,
  systemPrompt = null,
  temperature = 0.7
}) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: buildInput(systemPrompt, prompt),
      temperature
    })
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw createLlmError(
      data?.error?.message || `OpenAI request failed with status ${response.status}`,
      'openai_request_failed',
      response.status
    );
  }

  const refusal = extractRefusal(data);
  if (refusal) {
    throw createLlmError(refusal, 'llm_refused', 422);
  }

  return extractOutputText(data)?.trim() || '';
}

function buildInput(systemPrompt, userPrompt) {
  const input = [];

  if (systemPrompt) {
    input.push({
      role: 'system',
      content: [{ type: 'input_text', text: systemPrompt }]
    });
  }

  input.push({
    role: 'user',
    content: [{ type: 'input_text', text: userPrompt }]
  });

  return input;
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractOutputText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }

  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content?.text === 'string' && content.text.trim()) {
        return content.text;
      }
    }
  }

  return null;
}

function extractRefusal(data) {
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'refusal' && typeof content?.refusal === 'string' && content.refusal.trim()) {
        return content.refusal;
      }
    }
  }

  return null;
}

function createLlmError(message, code, status = 500) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}
