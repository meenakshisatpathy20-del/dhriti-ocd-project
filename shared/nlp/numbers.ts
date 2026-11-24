import { tokens } from './normalize';

/** Number words 0-10 in English, Hindi, Tamil and Bengali (Roman and native scripts). */
const WORDS: Record<string, number> = {
  // English
  zero: 0, nothing: 0, none: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10,
  // Hindi (Roman)
  shunya: 0, sunya: 0, ek: 1, do: 2, teen: 3, tin: 3, chaar: 4, char: 4, paanch: 5, panch: 5,
  chhe: 6, chhah: 6, chheh: 6, che: 6, saat: 7, sat: 7, aath: 8, aat: 8, nau: 9, das: 10,
  // Hindi (Devanagari)
  'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'छह': 6, 'छः': 6,
  'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  // Tamil (Roman)
  poojyam: 0, onru: 1, ondru: 1, onnu: 1, irandu: 2, rendu: 2, moondru: 3, moonu: 3,
  naangu: 4, naalu: 4, ainthu: 5, anju: 5, aaru: 6, ezhu: 7, ettu: 8, onbathu: 9, pathu: 10,
  // Tamil (script)
  'பூஜ்யம்': 0, 'ஒன்று': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5, 'ஆறு': 6,
  'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10,
  // Bengali (Roman)
  shunno: 0, dui: 2, pach: 5, chhoy: 6, choy: 6, noy: 9, dosh: 10,
  // Bengali (script)
  'শূন্য': 0, 'এক': 1, 'দুই': 2, 'তিন': 3, 'চার': 4, 'পাঁচ': 5, 'ছয়': 6, 'সাত': 7,
  'আট': 8, 'নয়': 9, 'দশ': 10,
};

const NATIVE_DIGITS: Record<string, string> = {};
['०१२३४५६७८९', '০১২৩৪৫৬৭৮৯', '௦௧௨௩௪௫௬௭௮௯'].forEach((set) => {
  [...set].forEach((d, i) => (NATIVE_DIGITS[d] = String(i)));
});

function toLatinDigits(s: string): string {
  return [...s].map((c) => NATIVE_DIGITS[c] ?? c).join('');
}

/**
 * Parse a 0-10 rating from free speech: "7", "saat", "seven", "ezhu", "सात",
 * "saat aath" (range, averaged to 7.5), "7 out of 10".
 * Returns null when no valid rating is found or it is out of range.
 */
export function parseRating(text: string, min = 0, max = 10): number | null {
  const toks = tokens(toLatinDigits(text));
  const found: number[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    // Ignore the "10" in "out of 10" / "10 mein se" / "0 se 10".
    const next = toks[i + 1];
    const prev = toks[i - 1];
    if ((prev === 'of' || prev === 'se') && (t === '10' || t === 'ten' || t === 'das')) {
      if (found.length > 0) continue;
    }
    if (next === 'mein' && (t === '10' || t === 'das') && found.length > 0) continue;

    if (/^\d+(\.\d+)?$/.test(t)) {
      found.push(Number(t));
    } else if (t in WORDS) {
      // "do" is also an English verb: only accept it as two when the utterance is short.
      if (t === 'do' && toks.length > 3) continue;
      found.push(WORDS[t]);
    }
  }
  if (found.length === 0) return null;
  let value = found[0];
  // "saat aath" or "7 to 8": average a spoken range.
  if (found.length >= 2 && Math.abs(found[1] - found[0]) === 1) value = (found[0] + found[1]) / 2;
  if (value < min || value > max) return null;
  return value;
}
