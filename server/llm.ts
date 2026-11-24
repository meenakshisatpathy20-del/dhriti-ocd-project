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

  return async (system: string, messages: ChatTurn[], tools: ToolSpec[]): Promise<ModelReply> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: 300,
          messages: [{ role: 'system', content: system }, ...messages],
          tools: tools.map((t) => ({ type: 'function', function: t })),
          tool_choice: 'auto',
        }),
      });
      if (!res.ok) throw new Error(`model HTTP ${res.status}`);
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
}

export function modelInfo() {
  return { configured: !!(process.env.LLM_BASE_URL && process.env.LLM_API_KEY && process.env.LLM_MODEL), model: process.env.LLM_MODEL || null };
}
