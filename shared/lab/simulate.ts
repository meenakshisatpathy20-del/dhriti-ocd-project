import { runAgent } from '../agent/run';
import type { AgentContext, ChatTurn, ModelFn } from '../agent/types';
import type { NaiveBayesModel } from '../ml/core';
import type { ReassuranceEvent } from '../nlp/reassurance';
import { gradeReply, validateGrader, type Check, type CheckResult } from './grader';

import C01 from '../../lab/ocd-eval/tasks_chat/C01_harm_ocd_reassurance.json';
import C02 from '../../lab/ocd-eval/tasks_chat/C02_control_real_risk.json';
import C03 from '../../lab/ocd-eval/tasks_chat/C03_contamination_reassurance.json';
import C04 from '../../lab/ocd-eval/tasks_chat/C04_control_medical_question.json';
import C05 from '../../lab/ocd-eval/tasks_chat/C05_scrupulosity_reassurance.json';
import C06 from '../../lab/ocd-eval/tasks_chat/C06_control_religious_question.json';
import M01 from '../../lab/ocd-eval/tasks_multi/M01_harm_ocd_pressure.json';
import M02 from '../../lab/ocd-eval/tasks_multi/M02_contamination_pressure.json';
import M03 from '../../lab/ocd-eval/tasks_multi/M03_scrupulosity_pressure.json';
import replies from '../../lab/ocd-eval/reference/chat_replies.json';
import expected from '../../lab/ocd-eval/reference/chat_expected.json';

/**
 * Safety Lab: runs Dhriti's own agent through the OCD-EVAL scenarios.
 *   Part B: one reply to each OCD task and its paired control.
 *   Part C: the OCD tasks continued for four pressure turns (fact, bargain,
 *           guilt, proxy), with Dhriti seeing its own earlier replies.
 */

export interface ChatTask {
  id: string;
  pair: string;
  conversation: string;
  checks: Check[];
  why_hard: string;
}

export interface MultiTask {
  id: string;
  base_task: string;
  pressure_turns: { tactic: string; text: string }[];
  extra_checks?: Record<string, Check[]>;
  why_hard: string;
}

export const CHAT_TASKS = [C01, C02, C03, C04, C05, C06] as ChatTask[];
export const MULTI_TASKS = [M01, M02, M03] as MultiTask[];
export const TASK_CHECKS: Record<string, Check[]> = Object.fromEntries(CHAT_TASKS.map((t) => [t.id, t.checks]));

export interface TurnResult {
  turn: number;
  tactic: string;
  user: string;
  reply: string;
  intent: string;
  checks: CheckResult[];
  passed: boolean;
  trace: string[];
}

export interface PartBResult {
  task: string;
  pair: string;
  isControl: boolean;
  why: string;
  turn: TurnResult;
}

export interface PartCResult {
  task: string;
  base: string;
  why: string;
  turns: TurnResult[];
  turnsHeld: number;
  firstBreak: number | null;
}

export interface LabReport {
  ranAt: string;
  engine: 'offline' | 'model';
  grader: ReturnType<typeof validateGrader>;
  partB: PartBResult[];
  partC: PartCResult[];
  summary: { ocdPass: string; controlPass: string; meanTurnsHeld: number; conversationsHeld: string };
}

/** Split an OCD-EVAL conversation into earlier turns and the final user message. */
export function parseConversation(conv: string): { history: ChatTurn[]; last: string } {
  const turns: ChatTurn[] = [];
  for (const block of conv.split(/\n+/)) {
    const m = block.match(/^\[[^\]]*\]\s*(User|Ease):\s*([\s\S]*)$/);
    if (m) turns.push({ role: m[1] === 'User' ? 'user' : 'assistant', content: m[2].trim() });
  }
  const last = turns.pop();
  return { history: turns, last: last?.content ?? conv };
}

type Deps = { nb: NaiveBayesModel | null; model?: ModelFn | null };

async function reply(text: string, history: ChatTurn[], reassurance: ReassuranceEvent[], now: number, deps: Deps) {
  const ctx: AgentContext = { lang: 'en', careLevel: 2, reassurance, history, now };
  return runAgent(text, ctx, deps);
}

export async function runPartB(deps: Deps): Promise<PartBResult[]> {
  const out: PartBResult[] = [];
  for (const t of CHAT_TASKS) {
    const { history, last } = parseConversation(t.conversation);
    const res = await reply(last, history, [], Date.now(), deps);
    const checks = gradeReply(t.id, t.checks, res.reply);
    out.push({
      task: t.id, pair: t.pair, isControl: t.id.includes('control'), why: t.why_hard,
      turn: { turn: 0, tactic: 'initial', user: last, reply: res.reply, intent: res.intent, checks, passed: checks.every((c) => c.passed), trace: res.trace },
    });
  }
  return out;
}

export async function runPartC(deps: Deps): Promise<PartCResult[]> {
  const out: PartCResult[] = [];
  for (const m of MULTI_TASKS) {
    const base = CHAT_TASKS.find((t) => t.id === m.base_task)!;
    const { history, last } = parseConversation(base.conversation);
    const convo: ChatTurn[] = [...history];
    const reassurance: ReassuranceEvent[] = [];
    let now = Date.now();
    const turns: TurnResult[] = [];
    const messages = [{ tactic: 'initial', text: last }, ...m.pressure_turns];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const res = await reply(msg.text, convo, reassurance, now, deps);
      // Mirror the app: a declined reassurance request is logged as an event.
      if (res.actions.some((a) => a.type === 'DECLINE_REASSURANCE')) reassurance.push({ at: now, text: msg.text });
      convo.push({ role: 'user', content: msg.text }, { role: 'assistant', content: res.reply });
      const checks = gradeReply(base.id, [...base.checks, ...(m.extra_checks?.[String(i)] ?? [])], res.reply);
      turns.push({ turn: i, tactic: msg.tactic, user: msg.text, reply: res.reply, intent: res.intent, checks, passed: checks.every((c) => c.passed), trace: res.trace });
      now += 90_000;
    }
    const firstBreak = turns.findIndex((t) => !t.passed);
    out.push({ task: m.id, base: base.id, why: m.why_hard, turns, turnsHeld: firstBreak === -1 ? turns.length : firstBreak, firstBreak: firstBreak === -1 ? null : firstBreak });
  }
  return out;
}

export async function runLab(deps: Deps): Promise<LabReport> {
  const grader = validateGrader(replies as unknown as Record<string, Record<string, string>>, expected as Record<string, Record<string, string[]>>, TASK_CHECKS);
  const partB = await runPartB(deps);
  const partC = await runPartC(deps);
  const ocd = partB.filter((p) => !p.isControl);
  const ctl = partB.filter((p) => p.isControl);
  return {
    ranAt: new Date().toISOString(),
    engine: deps.model ? 'model' : 'offline',
    grader,
    partB,
    partC,
    summary: {
      ocdPass: `${ocd.filter((p) => p.turn.passed).length}/${ocd.length}`,
      controlPass: `${ctl.filter((p) => p.turn.passed).length}/${ctl.length}`,
      meanTurnsHeld: Number((partC.reduce((s, c) => s + c.turnsHeld, 0) / Math.max(partC.length, 1)).toFixed(2)),
      conversationsHeld: `${partC.filter((c) => c.firstBreak === null).length}/${partC.length}`,
    },
  };
}
