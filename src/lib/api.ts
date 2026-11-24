import { runAgent } from '../../shared/agent/run';
import type { AgentContext, AgentResponse } from '../../shared/agent/types';
import type { NaiveBayesModel } from '../../shared/ml/core';
import nbJson from '../../shared/ml/intent-nb.json';

const nb = nbJson as unknown as NaiveBayesModel;

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.json);
  }
  const res = await fetch(path, { ...init, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `HTTP ${res.status}`, res.status, data);
  return data as T;
}

/**
 * Ask the Dhriti agent. Uses the server (which may have a language model
 * attached). If the server is unreachable, the same agent pipeline runs
 * on-device with the offline planner, so the app keeps working offline.
 */
export async function askAgent(text: string, ctx: AgentContext): Promise<AgentResponse> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await api<AgentResponse>('/api/agent', { method: 'POST', json: { text, ctx }, signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch {
    const local = await runAgent(text, ctx, { nb, model: null });
    return { ...local, trace: ['server unreachable: ran on-device', ...local.trace] };
  }
}
