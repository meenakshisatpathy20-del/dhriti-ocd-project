import { containsPhrase, detectScript, normalize, tokens, type Script } from './normalize';
import { LEXICON, type Intent } from './lexicon';

export interface Classification {
  intent: Intent;
  confidence: number;
  scores: Record<Exclude<Intent, 'UNCLEAR'>, number>;
  matches: string[];
  script: Script;
  /** True when the local safety screen fired. It always overrides any model output. */
  safetyOverride: boolean;
  /**
   * Broad, high-recall risk screen: words about life, death or self-hurt that
   * are not an explicit crisis phrase. Triggers a gentle check-in and keeps the
   * helpline visible, without interrupting the user's flow.
   */
  riskCheck: boolean;
}

/**
 * Self-directed only. Fears about harming others or about others dying are
 * classic OCD content and must not trigger crisis framing.
 */
const SOFT_RISK = [
  /\bsuicid\w*\b/,
  /\b(want|wanna|wish|going|plan|planning|ready|like) (to )?(die|end it|disappear)\b/,
  /\b(kill|killing) myself\b/,
  /\b(my life|no point living|no point in living|not worth living|give up on everything|disappear forever|not wake up)\b/,
  /\b(hurt|harm|cut)\s+(myself|me)\b/,
  /\b(marna|marne|mar jau\w*|maut|zindagi|jeena|jeene|khud ko|apne aap ko)\b/,
  /(मरना|मरने|मर जा|मौत|ज़िंदगी|जिंदगी|जीना|खुद को|சாக|சாவ|உயிர்|வாழ|মরে|মরতে|মৃত্যু|বাঁচ|জীবন|নিজেকে)/,
];

export function softRisk(text: string): boolean {
  const n = normalize(text);
  return SOFT_RISK.some((r) => r.test(n));
}

const PRIORITY: Exclude<Intent, 'UNCLEAR' | 'SELF_HARM'>[] = ['EMERGENCY', 'PANIC', 'MEDICAL', 'REASSURANCE', 'URGE', 'DIARY'];

/**
 * Fast, offline, multilingual intent classifier.
 * Order of precedence: SELF_HARM always wins; then the highest score, with ties
 * broken by clinical urgency (panic before reassurance before urge before diary).
 */
export function classify(text: string): Classification {
  const toks = tokens(text);
  const scores = { SELF_HARM: 0, EMERGENCY: 0, MEDICAL: 0, PANIC: 0, REASSURANCE: 0, URGE: 0, DIARY: 0 };
  const matches: string[] = [];

  for (const [intent, entries] of Object.entries(LEXICON) as [keyof typeof scores, typeof LEXICON.URGE][]) {
    for (const { p, w } of entries) {
      if (containsPhrase(toks, p)) {
        scores[intent] += w;
        matches.push(`${intent}:${p}`);
      }
    }
  }

  // Questions that ask for certainty lean towards reassurance-seeking.
  if (/\?\s*$/.test(text.trim()) && scores.REASSURANCE > 0) scores.REASSURANCE += 1;
  // Longer free-form speech without strong signals is a diary entry.
  if (toks.length >= 8) scores.DIARY += 1;

  const script = detectScript(text);
  const riskCheck = softRisk(text);

  if (scores.SELF_HARM > 0) {
    return { intent: 'SELF_HARM', confidence: 1, scores, matches, script, safetyOverride: true, riskCheck: false };
  }

  // A real emergency always outranks everything except self-harm.
  if (scores.EMERGENCY >= 3) {
    return { intent: 'EMERGENCY', confidence: 1, scores, matches, script, safetyOverride: true, riskCheck };
  }

  let best: Intent = 'UNCLEAR';
  let bestScore = 0;
  for (const intent of PRIORITY) {
    if (scores[intent] > bestScore) {
      best = intent;
      bestScore = scores[intent];
    }
  }

  if (best === 'UNCLEAR' || bestScore === 0) {
    return { intent: toks.length >= 6 ? 'DIARY' : 'UNCLEAR', confidence: toks.length >= 6 ? 0.4 : 0, scores, matches, script, safetyOverride: false, riskCheck };
  }

  // A single weak keyword is not enough evidence on its own.
  if (bestScore <= 1 && best !== 'DIARY') {
    return { intent: toks.length >= 6 ? 'DIARY' : 'UNCLEAR', confidence: 0.3, scores, matches, script, safetyOverride: false, riskCheck };
  }

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const confidence = Math.min(1, 0.5 + 0.5 * (bestScore / Math.max(total, 1)) * Math.min(1, bestScore / 3));
  return { intent: best, confidence: Number(confidence.toFixed(2)), scores, matches, script, safetyOverride: false, riskCheck };
}

/** Local safety screen run before any network or model call. */
export function isSelfHarmRisk(text: string): boolean {
  return classify(text).intent === 'SELF_HARM';
}
