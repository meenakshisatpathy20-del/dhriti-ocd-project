import { gradeReply } from './grader';
import { CHAT_TASKS, MULTI_TASKS, graderValidation, summarise, type LabReport, type PartBResult, type PartCResult, type TurnResult } from './simulate';

/**
 * Replies collected for an evaluation (from an API run or the manual
 * copy-paste wizard). Scores are always recomputed from the replies on the
 * server, so a submitted report cannot be edited to look better.
 */
export interface Submission {
  partB: Record<string, string>; // task id -> reply
  partC: Record<string, string[]>; // multi task id -> 5 replies (turn 0..4)
}

export const MAX_REPLY = 6000;

export function validateSubmission(s: unknown): string | null {
  if (!s || typeof s !== 'object') return 'Submission is missing';
  const sub = s as Submission;
  if (!sub.partB || typeof sub.partB !== 'object') return 'partB is required';
  for (const t of CHAT_TASKS) {
    const r = sub.partB[t.id];
    if (typeof r !== 'string' || !r.trim()) return `Missing reply for ${t.id}`;
    if (r.length > MAX_REPLY) return `Reply for ${t.id} is too long`;
  }
  if (sub.partC) {
    for (const [id, replies] of Object.entries(sub.partC)) {
      if (!MULTI_TASKS.some((m) => m.id === id)) return `Unknown pressure task ${id}`;
      if (!Array.isArray(replies) || replies.length !== 5 || replies.some((r) => typeof r !== 'string' || !r.trim() || r.length > MAX_REPLY)) return `${id} needs 5 non-empty replies`;
    }
  }
  return null;
}

export function gradeSubmission(sub: Submission, engine: LabReport['engine'] = 'raw-model'): LabReport {
  const partB: PartBResult[] = CHAT_TASKS.map((t) => {
    const reply = sub.partB[t.id] ?? '';
    const checks = gradeReply(t.id, t.checks, reply);
    const last = (t.conversation.split('\n').filter((l) => /User:/.test(l)).pop() ?? '').replace(/^\[[^\]]*\]\s*User:\s*/, '');
    return { task: t.id, pair: t.pair, isControl: t.id.includes('control'), why: t.why_hard, turn: { turn: 0, tactic: 'initial', user: last, reply, intent: '-', checks, passed: checks.every((c) => c.passed), trace: [] } };
  });
  const partC: PartCResult[] = MULTI_TASKS.filter((m) => sub.partC?.[m.id]).map((m) => {
    const base = CHAT_TASKS.find((t) => t.id === m.base_task)!;
    const replies = sub.partC[m.id];
    const turns: TurnResult[] = replies.map((reply, i) => {
      const checks = gradeReply(base.id, [...base.checks, ...(m.extra_checks?.[String(i)] ?? [])], reply);
      return { turn: i, tactic: i === 0 ? 'initial' : m.pressure_turns[i - 1].tactic, user: i === 0 ? '(base conversation)' : m.pressure_turns[i - 1].text, reply, intent: '-', checks, passed: checks.every((c) => c.passed), trace: [] };
    });
    const fb = turns.findIndex((t) => !t.passed);
    return { task: m.id, base: base.id, why: m.why_hard, turns, turnsHeld: turns.filter((t) => t.passed).length, firstBreak: fb === -1 ? null : fb };
  });
  return { ranAt: new Date().toISOString(), engine, grader: graderValidation(), partB, partC, summary: summarise(partB, partC) };
}

/** Turn a graded report back into a submission (used to re-grade stored API runs). */
export function toSubmission(r: LabReport): Submission {
  return {
    partB: Object.fromEntries(r.partB.map((b) => [b.task, b.turn.reply])),
    partC: Object.fromEntries(r.partC.map((c) => [c.task, c.turns.map((t) => t.reply)])),
  };
}
