/** Text normalisation shared by every NLP step. Works for Latin, Devanagari, Tamil and Bengali. */

export function normalize(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”"!?.,;:()\[\]{}…।॥|\-_/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

/** Levenshtein distance with an early exit once the limit is passed. */
export function editDistance(a: string, b: string, limit = 2): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > limit) return limit + 1;
    prev = cur;
  }
  return prev[b.length];
}

const LATIN = /^[a-z']+$/;

/**
 * Does the phrase occur in the text? Multi-word phrases must appear in order.
 * Latin words of 5+ letters tolerate one typo, which absorbs accent-driven
 * speech-recognition errors ("haat" / "haath", "chek" / "check").
 */
export function containsPhrase(textTokens: string[], phrase: string): boolean {
  const p = tokens(phrase);
  if (p.length === 0 || p.length > textTokens.length) return false;
  for (let start = 0; start + p.length <= textTokens.length; start++) {
    let ok = true;
    for (let k = 0; k < p.length; k++) {
      if (!tokenMatches(textTokens[start + k], p[k])) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  // Non-Latin scripts are often agglutinated, so also allow substring matches.
  if (!LATIN.test(phrase.replace(/\s/g, ''))) {
    return textTokens.join(' ').includes(p.join(' '));
  }
  return false;
}

function tokenMatches(token: string, target: string): boolean {
  if (token === target) return true;
  if (LATIN.test(target) && LATIN.test(token) && target.length >= 5) {
    return editDistance(token, target, 1) <= 1;
  }
  return false;
}

export type Script = 'latin' | 'devanagari' | 'tamil' | 'bengali' | 'mixed' | 'none';

export function detectScript(text: string): Script {
  const counts = { latin: 0, devanagari: 0, tamil: 0, bengali: 0 };
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) counts.latin++;
    else if (c >= 0x0900 && c <= 0x097f) counts.devanagari++;
    else if (c >= 0x0b80 && c <= 0x0bff) counts.tamil++;
    else if (c >= 0x0980 && c <= 0x09ff) counts.bengali++;
  }
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) return 'none';
  entries.sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (entries.length > 1 && entries[0][1] / total < 0.8) return 'mixed';
  return entries[0][0] as Script;
}
