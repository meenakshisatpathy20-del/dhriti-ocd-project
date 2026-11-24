import { classify, type Classification } from './classifier';
import { tokens } from './normalize';
import { nbPredictProba, type NaiveBayesModel } from '../ml/core';
import type { Intent } from './lexicon';

export interface HybridClassification extends Classification {
  source: 'rules' | 'model';
}

const MODEL_OVERRIDE = 0.7;
const MODEL_RISK = 0.5;

/**
 * Hybrid intent understanding: interpretable rules first, statistical model second.
 *
 * - Rules decide whenever they are confident, and always for self-harm.
 * - When rules are unsure (UNCLEAR or a weak DIARY guess), the Naive Bayes
 *   model trained on the OCD-Eval set may decide if it is confident.
 * - Safety asymmetry: the model can escalate an unsure utterance to SELF_HARM,
 *   or add a safety check-in to a confident one; it can never downgrade a
 *   rule-detected crisis.
 */
export function classifyHybrid(text: string, nb: NaiveBayesModel | null): HybridClassification {
  const rules = classify(text);
  if (!nb || rules.intent === 'SELF_HARM') return { ...rules, source: 'rules' };

  const probs = nbPredictProba(nb, tokens(text));
  const pHarm = probs.SELF_HARM ?? 0;
  const rulesUnsure = rules.intent === 'UNCLEAR' || (rules.intent === 'DIARY' && rules.confidence < 0.5);

  if (rulesUnsure && pHarm >= MODEL_RISK) {
    return { ...rules, intent: 'SELF_HARM', confidence: Number(pHarm.toFixed(2)), safetyOverride: true, source: 'model' };
  }
  if (!rulesUnsure && pHarm >= MODEL_RISK) {
    // The model sees possible self-harm language that the rules gave to another intent:
    // keep the user's flow, add a gentle safety check-in.
    return { ...rules, source: 'rules', riskCheck: true };
  }
  if (rulesUnsure) {
    const [best, p] = Object.entries(probs).sort((a, b) => b[1] - a[1])[0];
    if (p >= MODEL_OVERRIDE && best !== rules.intent) {
      return { ...rules, intent: best as Intent, confidence: Number(p.toFixed(2)), source: 'model' };
    }
  }
  return { ...rules, source: 'rules' };
}
