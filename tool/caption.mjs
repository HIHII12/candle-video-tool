/**
 * Writes the on-screen copy for one video.
 *
 * This is the only part of the pipeline that needs a language model. Levels,
 * patterns and outcomes are all arithmetic and stay that way — a model asked to
 * compute them would sometimes be wrong, and wrong numbers on a chart are worse
 * than dull ones.
 *
 * Configure with environment variables; nothing is hardcoded, and a key must
 * never be committed:
 *
 *   LLM_BASE_URL   e.g. https://api.shopaikey.com
 *   LLM_API_KEY    your key
 *   LLM_MODEL      e.g. deepseek-chat
 *
 * With no key set, the deterministic fallback is used and the batch still runs.
 */

const SYSTEM = [
  'You write captions for short trading-education videos in English.',
  'Return strict JSON: {"title": string, "hook": string}.',
  'title: under 60 characters, states the setup plainly.',
  'hook: under 90 characters, a question or tension that does NOT reveal the outcome.',
  'Never promise profit. Never say "guaranteed", "easy money" or similar.',
  'Do not invent price levels — use only the numbers given.',
].join(' ');

/** Copy that is always safe to ship, used when no model is configured. */
export function fallbackCaption(job, facts) {
  if (job.format === 'candle-lesson') {
    return {
      title: facts.patternName ?? job.label,
      hook: `What a ${(facts.patternName ?? job.label).toLowerCase()} actually tells you`,
    };
  }
  // Headline-shaped, not a stat line.
  //
  // This used to return "LONG 4097 · R:R 1:1.6", which was harmless while nothing
  // read the title and became the on-screen headline the moment the formats were
  // wired up to it. A headline has to be editorial; the numbers are already drawn
  // on the chart, and repeating them at 56px says nothing.
  //
  // Indexed off the job id so a keyless day still varies between uploads instead
  // of stamping one line on all of them.
  const HEADLINES = [
    'THE SNIPER ENTRY FORMULA',
    'WHERE SMART MONEY ENTERS',
    'THE CONFLUENCE PLAYBOOK',
    'READ THE STRUCTURE FIRST',
    'THE ENTRY MOST TRADERS MISS',
  ];
  const seed = [...String(job.id ?? job.label ?? '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    title: HEADLINES[seed % HEADLINES.length],
    hook: `${job.pair ?? 'Price'} on the ${job.timeframe ?? ''} — does this one reach target?`.trim(),
  };
}

const withinLimits = (c) =>
  c && typeof c.title === 'string' && typeof c.hook === 'string' &&
  c.title.length > 0 && c.title.length <= 80 &&
  c.hook.length > 0 && c.hook.length <= 120;

/**
 * Ask the model, and fall back on any failure. A caption is not worth failing
 * a render over, so every error path returns usable copy.
 */
export async function writeCaption(job, facts, { timeoutMs = 20_000 } = {}) {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!base || !key || !model) return { ...fallbackCaption(job, facts), source: 'fallback' };

  const prompt = [
    `Format: ${job.format}`,
    job.pair ? `Instrument: ${job.pair} on ${job.timeframe}` : null,
    facts.patternName ? `Pattern: ${facts.patternName}` : null,
    facts.side ? `Direction: ${facts.side}` : null,
    facts.entry != null ? `Entry: ${facts.entry}` : null,
    facts.rr != null ? `Reward to risk: 1:${facts.rr}` : null,
    'Do not mention whether the trade won or lost.',
  ].filter(Boolean).join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: 200,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const body = await res.json();
    const text = body?.choices?.[0]?.message?.content ?? '';
    // Models wrap JSON in prose or fences often enough to be worth handling.
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    if (!withinLimits(parsed)) throw new Error('caption failed validation');

    return { title: parsed.title, hook: parsed.hook, source: model };
  } catch (err) {
    return { ...fallbackCaption(job, facts), source: 'fallback', error: String(err.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}
