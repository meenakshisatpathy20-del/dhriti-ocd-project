import type { ChatTurn, ModelFn, ModelReply, ToolSpec } from '../shared/agent/types';

/**
 * Adapter for any OpenAI-compatible chat-completions API with tool calling.
 * Configure with LLM_BASE_URL, LLM_API_KEY and LLM_MODEL. When unset, the
 * agent runs on its offline planner.
 */
export function modelFromEnv(): ModelFn | null {
  const base = process.env.LLM_BASE_URL?.replace(/\/$/, '');
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!base || !key || !model) return null;
  return openAiCompatible(base, key, model);
}

/** A model function for any OpenAI-compatible endpoint (also used by the lab with a user's own key). */
export function openAiCompatible(base: string, key: string, model: string, timeoutMs = 12_000, retries = 0): ModelFn {
  base = base.replace(/\/$/, '');
  // Newer reasoning models reject temperature / max_tokens; switch once and remember.
  let modern = false;
  const once = async (system: string, messages: ChatTurn[], tools: ToolSpec[]): Promise<ModelReply> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          ...(modern ? { max_completion_tokens: 2000 } : { temperature: 0.4, max_tokens: 500 }),
          messages: [{ role: 'system', content: system }, ...messages],
          ...(tools.length ? { tools: tools.map((t) => ({ type: 'function', function: t })), tool_choice: 'auto' } : {}),
        }),
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 200).replace(/\s+/g, ' ');
        const err = new Error(`model HTTP ${res.status}${detail ? `: ${detail}` : ''}`) as Error & { status?: number; retryAfter?: number };
        err.status = res.status;
        err.retryAfter = Number(res.headers.get('retry-after')) || undefined;
        throw err;
      }
      const data = (await res.json()) as {
        choices: { message: { content: string | null; tool_calls?: { function: { name: string; arguments: string } }[] } }[];
      };
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new Error('empty model response');
      return {
        content: msg.content ?? '',
        toolCalls: (msg.tool_calls ?? []).map((tc) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments || '{}');
          } catch {
            args = {};
          }
          return { name: tc.function.name, arguments: args };
        }),
      };
    } finally {
      clearTimeout(timer);
    }
  };

  // Retry rate limits (429), server errors and timeouts with backoff, so one hiccup on a
  // free tier does not fail a 21-call evaluation. Auth and request errors fail at once.
  return async (system, messages, tools) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await once(system, messages, tools);
      } catch (e) {
        const err = e as Error & { status?: number; retryAfter?: number };
        if (err.status === 400 && !modern && /max_tokens|temperature|max_completion_tokens|unsupported/i.test(err.message)) {
          modern = true;
          continue;
        }
        const retryable = err.status === 429 || (err.status !== undefined && err.status >= 500) || err.name === 'AbortError' || err.status === undefined;
        if (!retryable || attempt >= retries) throw err.name === 'AbortError' ? new Error(`model timed out after ${Math.round(timeoutMs / 1000)}s`) : err;
        const wait = Math.min(30_000, err.retryAfter ? err.retryAfter * 1000 : 1500 * 2 ** attempt + Math.random() * 500);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  };
}

export function modelInfo() {
  return { configured: !!(process.env.LLM_BASE_URL && process.env.LLM_API_KEY && process.env.LLM_MODEL), model: process.env.LLM_MODEL || null };
}
