const DRAFT_TYPES = {
  email: 'Email',
  cover_letter: 'Cover Letter',
  whatsapp: 'WhatsApp',
};

export function getHuntConfigError() {
  if (!import.meta.env.VITE_API_URL) {
    return 'Hunt is not configured. Set VITE_API_URL in your .env file.';
  }
  if (!import.meta.env.VITE_API_KEY) {
    return 'Hunt is not configured. Set VITE_API_KEY in your .env file.';
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

/**
 * Unwrap email API JSON into the Hunt insight object (summary, suggestions, draftType, draftText).
 */
function insightsFromApiPayload(data, fallbackDraftType) {
  let root = data;
  if (Array.isArray(root) && root[0]?.json) {
    root = root[0].json;
  }
  if (root?.json && typeof root.json === 'object' && !root.summary) {
    root = root.json;
  }

  if (root?.status === 'error' || (typeof root?.status === 'number' && root.status >= 400)) {
    throw new Error(String(root.message || root.details || 'API returned an error'));
  }

  if (root?.data && typeof root.data === 'object' && root.data.summary) {
    root = root.data;
  }

  if (root?.summary && root?.draftText && Array.isArray(root?.suggestions)) {
    return normalizeInsights(root, fallbackDraftType);
  }

  const nestedString =
    (typeof root?.output === 'string' && root.output) ||
    (typeof root?.text === 'string' && root.text) ||
    (typeof root?.response === 'string' && root.response && !root.message);
  if (nestedString) {
    return normalizeInsights(extractJson(nestedString), fallbackDraftType);
  }

  const raw =
    root?.choices?.[0]?.message?.content ||
    root?.message?.content ||
    (typeof root?.response === 'string' ? root.response : null);
  if (raw) {
    return normalizeInsights(extractJson(String(raw)), fallbackDraftType);
  }

  if (root?.response && typeof root.response === 'object' && root.response.summary) {
    return normalizeInsights(root.response, fallbackDraftType);
  }

  throw new Error(
    'Hunt API response was not recognized. Return JSON with keys summary, suggestions, draftType, draftText (or Ollama message.content with that JSON inside).'
  );
}

export async function generateHuntInsights(postText) {
  const content = String(postText || '').trim();
  if (content.length < 40) {
    throw new Error('Please provide more job post details');
  }

  const draftType = detectDraftType(content);
  const prompt = buildPrompt(content, draftType);

  const url = import.meta.env.VITE_API_URL;
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!url || !apiKey) {
    throw new Error('Missing VITE_API_URL or VITE_API_KEY');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      kind: 'hunt_insights',
      jobPost: content,
      prompt,
      draftType,
    }),
  });

  const responseText = await res.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(`Hunt API response was not valid JSON: ${responseText.slice(0, 120)}`);
  }

  if (!res.ok || data.status === 'error' || (typeof data.status === 'number' && data.status >= 400)) {
    throw new Error(data.message || data.details || `Hunt request failed (${res.status})`);
  }

  return insightsFromApiPayload(data, draftType);
}
