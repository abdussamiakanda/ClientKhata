const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_PATH = '/api/chat';
const DEFAULT_MODEL = 'gemma4';

const DRAFT_TYPES = {
  email: 'Email',
  cover_letter: 'Cover Letter',
  whatsapp: 'WhatsApp',
};

export function getHuntConfigError() {
  if (!import.meta.env.VITE_HUNT_AI_API_KEY) {
    return 'Hunt AI is not configured. Set VITE_HUNT_AI_API_KEY in your .env file.';
  }
  if (!import.meta.env.VITE_HUNT_AI_BASE_URL) {
    return 'Hunt AI base URL is not configured. Set VITE_HUNT_AI_BASE_URL in your .env file.';
  }
  return '';
}

export function detectDraftType(postText) {
  const text = String(postText || '').toLowerCase();
  const hasWhatsAppSignal =
    text.includes('whatsapp') ||
    text.includes('wa.me') ||
    text.includes('message us on') ||
    text.includes('text us');
  if (hasWhatsAppSignal) return 'whatsapp';

  const hasEmailSignal =
    text.includes('@') ||
    text.includes('email') ||
    text.includes('mail your') ||
    text.includes('send to hr');
  if (hasEmailSignal) return 'email';

  const hasApplicationSignal =
    text.includes('resume') ||
    text.includes('cv') ||
    text.includes('cover letter') ||
    text.includes('application');
  if (hasApplicationSignal) return 'cover_letter';

  return 'cover_letter';
}

function buildPrompt(postText, draftType) {
  return [
    'You are an assistant helping a freelancer apply to jobs.',
    `Analyze the job post and return STRICT JSON with keys: summary, suggestions, draftType, draftText.`,
    'Rules:',
    '- summary: max 90 words',
    '- suggestions: array of 4 concise and practical suggestions',
    `- draftType: must be exactly "${draftType}"`,
    `- draftText: one complete ${draftType.replace('_', ' ')} draft`,
    '- return valid JSON only (no markdown, no extra text)',
    '',
    'JOB POST:',
    postText,
  ].join('\n');
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned non-JSON content');
    return JSON.parse(match[0]);
  }
}

function normalizeInsights(parsed, fallbackDraftType) {
  const summary = String(parsed?.summary || '').trim();
  const suggestions = Array.isArray(parsed?.suggestions)
    ? parsed.suggestions.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const draftType = parsed?.draftType && DRAFT_TYPES[parsed.draftType] ? parsed.draftType : fallbackDraftType;
  const draftText = String(parsed?.draftText || '').trim();

  if (!summary) throw new Error('AI response missing summary');
  if (!suggestions.length) throw new Error('AI response missing suggestions');
  if (!draftText) throw new Error('AI response missing draft');

  return {
    summary,
    suggestions: suggestions.slice(0, 6),
    draftType,
    draftTypeLabel: DRAFT_TYPES[draftType] || 'Draft',
    draftText,
  };
}

export async function generateHuntInsights(postText) {
  const apiKey = import.meta.env.VITE_HUNT_AI_API_KEY;
  const baseUrl = import.meta.env.VITE_HUNT_AI_BASE_URL || DEFAULT_BASE_URL;
  const endpointPath = import.meta.env.VITE_HUNT_AI_ENDPOINT_PATH || DEFAULT_OLLAMA_PATH;
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const endpoint = import.meta.env.DEV
    ? `/api/hunt-ai${normalizedPath}`
    : `${baseUrl.replace(/\/$/, '')}${normalizedPath}`;
  const model = import.meta.env.VITE_HUNT_AI_MODEL || DEFAULT_MODEL;
  const requestStyle = import.meta.env.VITE_HUNT_AI_REQUEST_STYLE || (endpointPath.includes('/api/chat') ? 'ollama' : 'openai');

  if (!apiKey) {
    throw new Error('Missing VITE_HUNT_AI_API_KEY');
  }

  const content = String(postText || '').trim();
  if (content.length < 40) {
    throw new Error('Please provide more job post details');
  }

  const draftType = detectDraftType(content);
  const prompt = buildPrompt(content, draftType);

  const body =
    requestStyle === 'ollama'
      ? {
          model,
          stream: false,
          format: 'json',
          messages: [
            { role: 'system', content: 'You are a precise assistant.' },
            { role: 'user', content: prompt },
          ],
        }
      : {
          model,
          temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a precise assistant.' },
            { role: 'user', content: prompt },
          ],
        };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AI request failed (${res.status}): ${errorText.slice(0, 180)}`);
  }

  const data = await res.json();
  const raw =
    data?.choices?.[0]?.message?.content ||
    data?.message?.content ||
    data?.response;
  if (!raw) {
    throw new Error('AI returned an empty response');
  }

  const parsed = extractJson(raw);
  return normalizeInsights(parsed, draftType);
}
