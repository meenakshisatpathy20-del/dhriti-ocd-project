import { containsPhrase, tokens } from './normalize';
import { parseRating } from './numbers';

/** Spoken Likert answers (OCI-R) in four languages, longest phrases first. */
const LIKERT: [string, number][] = [
  ['not at all', 0], ['never', 0], ['bilkul nahi', 0], ['bilkul bhi nahi', 0], ['kabhi nahi', 0],
  ['बिल्कुल नहीं', 0], ['இல்லவே இல்லை', 0], ['இல்லை', 0], ['একদম না', 0], ['একদম নয়', 0], ['ekdom na', 0],
  ['bahut zyada', 4], ['bahut jyada', 4], ['extremely', 4], ['always', 4], ['hamesha', 4],
  ['बहुत ज़्यादा', 4], ['बहुत ज्यादा', 4], ['மிக அதிகம்', 4], ['খুব বেশি', 4], ['khub beshi', 4],
  ['a lot', 3], ['kaafi', 3], ['kafi', 3], ['quite a lot', 3], ['often', 3], ['काफ़ी', 3], ['काफी', 3],
  ['அதிகம்', 3], ['অনেক', 3], ['onek', 3],
  ['moderately', 2], ['kuch had tak', 2], ['kuch hadd tak', 2], ['sometimes', 2], ['kabhi kabhi', 2],
  ['कुछ हद तक', 2], ['மிதமாக', 2], ['মাঝারি', 2], ['majhari', 2],
  ['a little', 1], ['slightly', 1], ['thoda', 1], ['thoda sa', 1], ['rarely', 1], ['थोड़ा', 1],
  ['கொஞ்சம்', 1], ['একটু', 1], ['ektu', 1],
  ['no', 0], ['nahi', 0], ['नहीं', 0],
];

/** Map a spoken answer to 0-4. Accepts words in any supported language or a digit 0-4. */
export function parseLikert(text: string): number | null {
  const toks = tokens(text);
  for (const [phrase, value] of LIKERT) {
    if (containsPhrase(toks, phrase)) return value;
  }
  return parseRating(text, 0, 4);
}

const ORDINALS: [string, number][] = [
  ['first', 0], ['pehla', 0], ['pahla', 0], ['option one', 0], ['option 1', 0],
  ['second', 1], ['doosra', 1], ['dusra', 1], ['option two', 1], ['option 2', 1],
  ['third', 2], ['teesra', 2], ['tisra', 2], ['option three', 2], ['option 3', 2],
  ['fourth', 3], ['chautha', 3], ['option four', 3], ['option 4', 3],
  ['fifth', 4], ['last', 4], ['paanchva', 4], ['aakhri', 4], ['option five', 4], ['option 5', 4],
];

/**
 * Match a spoken answer to one of the given options (Y-BOCS items have
 * item-specific options). Tries ordinal words first, then a bare number 1-5,
 * then word overlap with the option text.
 */
export function parseOption(text: string, options: string[]): number | null {
  const toks = tokens(text);
  for (const [phrase, idx] of ORDINALS) {
    if (idx < options.length && containsPhrase(toks, phrase)) return idx;
  }
  const n = parseRating(text, 1, options.length);
  if (n !== null && Number.isInteger(n) && toks.length <= 3) return n - 1;

  let best = -1;
  let bestScore = 0;
  options.forEach((opt, i) => {
    const optToks = tokens(opt).filter((t) => t.length > 2);
    if (optToks.length === 0) return;
    const hit = optToks.filter((t) => toks.includes(t)).length;
    const score = hit / optToks.length;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return bestScore >= 0.5 ? best : null;
}

/** Yes / no in four languages. */
export function parseYesNo(text: string): boolean | null {
  const toks = tokens(text);
  const yes = ['yes', 'yeah', 'haan', 'ha', 'han', 'ji haan', 'sahi', 'theek hai', 'हाँ', 'हां', 'ஆம்', 'ஆமா', 'হ্যাঁ', 'হ্যা', 'okay', 'ok'];
  const no = ['no', 'nahi', 'nahin', 'na', 'galat', 'नहीं', 'இல்லை', 'না'];
  if (no.some((p) => containsPhrase(toks, p))) return false;
  if (yes.some((p) => containsPhrase(toks, p))) return true;
  return null;
}

export type ErpOutcome = 'resisted' | 'delayed' | 'did';

export function parseOutcome(text: string): ErpOutcome | null {
  const toks = tokens(text);
  const did = ['did it', 'i did', 'gave in', 'kar liya', 'kar li', 'kar diya', 'dho liya', 'check kar liya', 'कर लिया', 'செய்துவிட்டேன்', 'করে ফেলেছি'];
  const delayed = ['delayed', 'delay', 'der ki', 'der se', 'thodi der', 'baad mein', 'देर', 'தாமதித்தேன்', 'দেরি'];
  const resisted = ['resisted', 'resist', 'stopped', 'didn\'t do', 'did not do', 'roka', 'rok liya', 'nahi kiya', 'रोका', 'தடுத்தேன்', 'আটকেছি', 'আটকালাম'];
  if (resisted.some((p) => containsPhrase(toks, p))) return 'resisted';
  if (delayed.some((p) => containsPhrase(toks, p))) return 'delayed';
  if (did.some((p) => containsPhrase(toks, p))) return 'did';
  return null;
}
