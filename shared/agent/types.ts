import type { AppLang } from '../i18n/phrases';
import type { Classification } from '../nlp/classifier';
import type { EpisodeExtraction } from '../nlp/extract';
import type { GuardReason, ReassuranceEvent } from '../nlp/reassurance';
import type { CareLevel } from '../clinical/instruments';

export type AgentAction =
  | { type: 'CRISIS' }
  | { type: 'EMERGENCY' }
  | { type: 'START_PANIC' }
  | { type: 'START_ERP'; episode: EpisodeExtraction }
  | { type: 'DECLINE_REASSURANCE'; loop: boolean }
  | { type: 'SAVE_DIARY'; text: string; mood?: number | null }
  | { type: 'START_SCREENING' }
  | { type: 'START_MEDITATION'; kind: 'bhramari' | 'label' | 'bodyscan' }
  | { type: 'OPEN_LESSON'; lessonId: string }
  | { type: 'BOOK_PROFESSIONAL' }
  | { type: 'CONFIRM'; question: string; candidate: AgentAction }
  | { type: 'OPEN_EXPOSURE' };

export type PressureTactic = 'fact' | 'bargain' | 'guilt' | 'proxy';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentContext {
  lang: AppLang;
  careLevel: CareLevel;
  name?: string;
  reassurance: ReassuranceEvent[];
  history: ChatTurn[];
  /** The ERP plan agreed with the user's therapist, if any. */
  plan?: string;
  now?: number;
}

export interface AgentResponse {
  /** Which pressure tactic was recognised, if any (fact, bargain, guilt, proxy). */
  tactic?: PressureTactic | null;
  reply: string;
  actions: AgentAction[];
  intent: Classification['intent'];
  confidence: number;
  engine: 'offline' | 'model';
  guarded: GuardReason[];
  trace: string[];
}

/** Minimal OpenAI-compatible tool-calling interface, so any provider can plug in. */
export interface ModelToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ModelReply {
  content: string;
  toolCalls: ModelToolCall[];
}

export type ModelFn = (
  system: string,
  messages: ChatTurn[],
  tools: ToolSpec[],
) => Promise<ModelReply>;

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
