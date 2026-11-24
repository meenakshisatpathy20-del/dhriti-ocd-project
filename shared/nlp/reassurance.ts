import { normalize } from './normalize';

/**
 * Reassurance-loop tracking.
 *
 * In OCD, repeatedly asking for certainty ("are you sure my hands are clean?")
 * brings short relief but keeps the cycle going. Dhriti never answers these
 * questions with certainty, and tracks how often they happen so the user and
 * their clinician can see the pattern shrink over time.
 */

export interface ReassuranceEvent {
  at: number;
  text: string;
}

export const LOOP_WINDOW_MS = 10 * 60 * 1000;

/** A loop is two or more certainty-seeking questions within ten minutes. */
export function isReassuranceLoop(events: ReassuranceEvent[], now = Date.now()): boolean {
  return events.filter((e) => now - e.at <= LOOP_WINDOW_MS).length >= 2;
}

export function countToday(events: ReassuranceEvent[], now = Date.now()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return events.filter((e) => e.at >= start.getTime()).length;
}

/**
 * Guardrails applied to every reply before it is spoken, whichever engine
 * (offline planner or language model) produced it.
 */
const REASSURING = [
  /\byour hands (are|look) (clean|fine|safe)\b/,
  /\b(the )?door (is|was) (locked|closed|shut)\b/,
  /\byou (did|have) (lock|locked|turn(ed)? off|switch(ed)? off|close(d)?)\b/,
  /\b(it|everything|that) (is|was|will be) (clean|fine|safe|okay|ok)\b/,
  /\bnothing bad (will|is going to) happen\b/,
  /\bdon'?t worry\b/,
  /\byou('| a)?re (definitely|totally|completely) (safe|fine|clean)\b/,
  /\bi('m| am) (sure|certain) (that )?(it|you|the)\b/,
  /\bhaath saaf hai\b/,
  /\bdarwaza band hai\b/,
  /\bgas band hai\b/,
  /\bsab theek hai\b/,
  /\bchinta mat (karo|kijiye)\b/,
  /\bkuch nahi hoga\b/,
];

const DIAGNOSTIC = [
  /\byou (have|definitely have|are diagnosed with|suffer from) (ocd|obsessive)/,
  /\baapko ocd hai\b/,
  /\bi diagnose\b/,
];

const MEDICATION = [
  /\b(take|start|stop|increase|reduce|double)\b[^.]{0,40}\b(mg|tablet|pill|medicine|medication|dose|ssri|fluoxetine|sertraline|fluvoxamine|clomipramine)\b/,
  /\b(dawai|dawa|goli) (lo|lijiye|band karo|band kijiye|badhao)\b/,
];

export type GuardReason = 'reassurance' | 'diagnosis' | 'medication';

export interface GuardResult {
  text: string;
  blocked: GuardReason[];
}

const SAFE_REPLACEMENT: Record<GuardReason, string> = {
  reassurance: "I can't be certain for you, and practising with that uncertainty is how OCD loosens its grip.",
  diagnosis: 'Only a qualified clinician can diagnose OCD. Dhriti can screen and support you.',
  medication: 'Please discuss any medicine questions with your psychiatrist. Dhriti never advises on medication.',
};

export function guardReply(reply: string): GuardResult {
  const n = normalize(reply);
  const blocked: GuardReason[] = [];
  if (REASSURING.some((r) => r.test(n))) blocked.push('reassurance');
  if (DIAGNOSTIC.some((r) => r.test(n))) blocked.push('diagnosis');
  if (MEDICATION.some((r) => r.test(n))) blocked.push('medication');
  if (blocked.length === 0) return { text: reply, blocked };
  return { text: blocked.map((b) => SAFE_REPLACEMENT[b]).join(' '), blocked };
}
