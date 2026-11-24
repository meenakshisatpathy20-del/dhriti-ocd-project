import { routeCare, scoreOcir, scoreYbocs, scoreMood, adjustForMood } from '../../shared/clinical/instruments';
import { extractEpisode } from '../../shared/nlp/extract';
import type { AppData } from '../state/store';
import { uid } from '../state/store';

/**
 * A believable 4-week story for demos and examinations (clearly fictional):
 * Priya starts at moderate Y-BOCS 22, practises ERP most days, and four weeks
 * later scores 14 (a 36% reduction = treatment response). Urges resisted rise,
 * peak anxiety and reassurance requests fall.
 */
export function demoData(base: AppData): AppData {
  const day = 86400000;
  const now = Date.now();
  const at = (daysAgo: number, hour = 18) => {
    const d = new Date(now - daysAgo * day);
    d.setHours(hour, (daysAgo * 7) % 60, 0, 0);
    return d.toISOString();
  };
  const ocirA = [1, 2, 1, 1, 3, 2, 0, 2, 1, 0, 3, 2, 1, 2, 1, 0, 4, 2];
  const ocirB = [1, 1, 1, 0, 2, 1, 0, 1, 1, 0, 2, 1, 1, 1, 1, 0, 2, 1];
  const yA = [2, 2, 3, 2, 2, 3, 2, 3, 2, 1];
  const yB = [1, 1, 2, 1, 2, 2, 1, 2, 1, 1];
  const screen = (daysAgo: number, o: number[], y: number[], m: number[]) => {
    const ocir = scoreOcir(o);
    const ybocs = scoreYbocs(y);
    const mood = scoreMood(m);
    return { id: uid(), at: at(daysAgo, 11), ocir: { answers: o, result: ocir }, ybocs: { answers: y, result: ybocs }, mood: { answers: m, result: mood }, route: adjustForMood(routeCare(ocir, ybocs), mood) };
  };
  const urges = [
    'phir se haath dhone ka mann ho raha hai, bus ki seat chhui thi',
    'paise chhoone ke baad haath gande lag rahe hain',
    'gas phir se check karna hai',
    'darwaze ka taala dobara check karna hai',
    'door handle chhua, ab dhona hai',
  ];
  const episodes: AppData['episodes'] = [];
  for (let d = 27; d >= 0; d--) {
    const perDay = d > 18 ? 3 : d > 8 ? 2 : 1;
    for (let k = 0; k < perDay; k++) {
      const progress = 1 - d / 27; // 0 → 1 over four weeks
      const peak = Math.max(3, Math.round(9 - progress * 4 - (k % 2)));
      const end = Math.max(1, Math.round(peak - 2 - progress * 3));
      const utterance = urges[(d + k) % urges.length];
      const r = (d * 13 + k * 7) % 10;
      const outcome = r < 2 + progress * 6 ? 'resisted' : r < 6 + progress * 3 ? 'delayed' : 'did';
      episodes.push({
        id: uid(), at: at(d, 9 + k * 5), utterance, extraction: extractEpisode(utterance), source: 'urge', outcome: outcome as 'resisted' | 'delayed' | 'did',
        suds: [{ sec: 0, value: peak }, { sec: 120, value: Math.round((peak + end) / 2) + 1 }, { sec: 240, value: Math.round((peak + end) / 2) }, { sec: 360, value: end }],
        durationSec: 360,
      });
    }
  }
  const reassurance: AppData['reassurance'] = [];
  for (let d = 27; d >= 0; d--) for (let k = 0; k < Math.max(0, Math.round(5 - d / -7 - (27 - d) / 6)); k++) reassurance.push({ at: Date.parse(at(d, 20 + (k % 3))), text: 'pakka saaf hai na?' });
  return {
    ...base,
    profile: { ...base.profile, name: base.profile.name || 'Priya', onboarded: true, consentAt: base.profile.consentAt ?? new Date().toISOString(), trustedContact: base.profile.trustedContact ?? { name: 'Maa', phone: '9876543210' } },
    screenings: [screen(28, ocirA, yA, [1, 1, 0]), screen(0, ocirB, yB, [1, 0, 0])],
    episodes,
    reassurance,
    diary: [
      { id: uid(), at: at(20, 22), text: 'Aaj bahut mushkil din tha, bus se aane ke baad 4 baar haath dhoye.', mood: 3 },
      { id: uid(), at: at(12, 22), text: 'Dr. Joshi se baat hui. Mummy ko samjhaya ki pakka wala sawaal ka jawab na dein.', mood: 5 },
      { id: uid(), at: at(5, 22), text: 'College mein lunch ke pehle sirf ek baar haath dhoye. Achha laga.', mood: 7 },
      { id: uid(), at: at(1, 22), text: 'Aaj metro ki railing pakdi aur dhoye bina kaam par chali gayi.', mood: 8 },
    ],
    ladder: [
      { id: uid(), situation: 'Touch the door handle and wait 5 minutes before washing', suds: 3, practised: 9, mastered: true },
      { id: uid(), situation: 'Hold money or a mobile phone without washing for 15 minutes', suds: 5, practised: 7, mastered: true },
      { id: uid(), situation: 'Sit on a bus seat and eat a snack afterwards without washing', suds: 7, practised: 3, mastered: false },
      { id: uid(), situation: 'Touch the floor near the shoes and then cook a simple meal', suds: 9, practised: 0, mastered: false },
    ],
    practice: [
      ...[25, 18, 11, 4].map((d) => ({ id: uid(), at: at(d, 21), kind: 'bhramari' as const, detail: `8 hums, longest ${(6 + (25 - d) / 5).toFixed(1)}s`, minutes: 6 })),
      ...[22, 9].map((d) => ({ id: uid(), at: at(d, 23), kind: 'panic' as const, detail: '6 breaths, longest exhale 7.2s', minutes: 4 })),
      ...[14, 6, 2].map((d) => ({ id: uid(), at: at(d, 17), kind: 'vr' as const, detail: 'Railway station washroom: reached step 4, peak 7, end 4', minutes: 8 })),
    ],
    lessons: Object.fromEntries(['what-is-ocd', 'ocd-cycle', 'erp', 'reassurance', 'family'].map((id) => [id, { completedAt: at(20), quizCorrect: true }])),
  };
}
