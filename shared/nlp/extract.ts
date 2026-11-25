import { containsPhrase, tokens } from './normalize';

export type CompulsionType = 'washing' | 'checking' | 'ordering' | 'counting' | 'reassurance' | 'harm' | 'religious' | 'mental' | 'other';

export interface EpisodeExtraction {
  compulsion: CompulsionType;
  urge: string;
  fear: string;
  trigger: string | null;
}

const PATTERNS: { type: CompulsionType; words: string[]; urge: string; fear: string }[] = [
  {
    type: 'washing',
    words: ['wash', 'washing', 'washed', 'washes', 'hands', 'hand', 'soap', 'sanitizer', 'sanitiser', 'shower', 'showering', 'clean', 'cleaning', 'cleaned', 'dirty', 'germs', 'contaminated', 'bath', 'sanitize', 'dho', 'dhone', 'dhona', 'saaf', 'ganda', 'gande', 'nahana', 'haath', 'धोने', 'गंदा', 'கழுவ', 'அழுக்கு', 'ধুতে', 'অপরিষ্কার'],
    urge: 'Wash or clean again',
    fear: 'Contamination or getting ill',
  },
  {
    type: 'checking',
    words: ['check', 'checking', 'checked', 'checks', 'recheck', 'lock', 'locked', 'door', 'gas', 'stove', 'switch', 'tap', 'taala', 'darwaza', 'band', 'चेक', 'ताला', 'दरवाज़ा', 'சரிபார்', 'பூட்டு', 'চেক', 'তালা'],
    urge: 'Check again',
    fear: 'Something bad happening (fire, theft, harm)',
  },
  {
    type: 'ordering',
    words: ['arrange', 'arranging', 'straight', 'straighten', 'straightening', 'even', 'neat', 'symmetry', 'order', 'just right', 'seedha', 'theek se', 'sajana', 'सीधा', 'வரிசை', 'সাজা'],
    urge: 'Arrange things until they feel right',
    fear: "Things not feeling 'just right'",
  },
  {
    type: 'counting',
    words: ['count', 'counting', 'counted', 'number', 'times', 'ginti', 'gin', 'गिनती', 'எண்ண', 'গোনা'],
    urge: 'Count or repeat a number of times',
    fear: 'Something bad happening unless it is done right',
  },
  {
    type: 'reassurance',
    words: ['ask', 'asking', 'asked', 'reassure', 'reassurance', 'sure', 'pakka', 'confirm', 'poochna', 'पूछ', 'உறுதி', 'নিশ্চিত'],
    urge: 'Ask someone for certainty',
    fear: 'Not being completely certain',
  },
  {
    type: 'harm',
    words: ['hurt', 'hurting', 'harm', 'harming', 'knife', 'stab', 'push', 'attack', 'violent', 'nuksan', 'chaku', 'maar', 'चाकू', 'கத்தி', 'ছুরি'],
    urge: 'Get certainty that I would never act on the thought',
    fear: 'Acting on a thought I do not want',
  },
  {
    type: 'religious',
    words: ['sin', 'sinned', 'confess', 'confession', 'god', 'mass', 'church', 'catechism', 'priest', 'blasphemous', 'blasphemy', 'forgive', 'forgiven', 'paap', 'bhagwan', 'pooja', 'पाप', 'भगवान', 'பாவம்', 'পাপ'],
    urge: 'Confess, pray or ask to undo the thought',
    fear: 'Having sinned or offended God',
  },
  {
    type: 'mental',
    words: ['thought', 'pray', 'bad thought', 'vichaar', 'khayal', 'prarthana', 'विचार', 'எண்ணம்', 'চিন্তা'],
    urge: 'Neutralise or undo a thought',
    fear: 'The thought meaning something about me',
  },
];

const TRIGGER_MARKERS = /\b(?:after|because|since|when|kyunki|jab|baad|chhua|chhuaa|touched|saw|dekha)\b(.{3,60})/i;

/** Pull out the compulsion type, a plain-language urge and fear, and any trigger the user mentioned. */
export function extractEpisode(text: string): EpisodeExtraction {
  const toks = tokens(text);
  let best = { type: 'other' as CompulsionType, score: 0, urge: 'Do the compulsion', fear: 'Something feeling wrong' };
  for (const pat of PATTERNS) {
    const score = pat.words.filter((w) => containsPhrase(toks, w)).length;
    if (score > best.score) best = { type: pat.type, score, urge: pat.urge, fear: pat.fear };
  }
  const m = text.match(TRIGGER_MARKERS);
  const trigger = m ? m[1].trim().replace(/[.?!]+$/, '') : guessTrigger(best.type, toks);
  return { compulsion: best.type, urge: best.urge, fear: best.fear, trigger };
}

function guessTrigger(type: CompulsionType, toks: string[]): string | null {
  const objects = ['door', 'handle', 'toilet', 'bus', 'metro', 'money', 'phone', 'gas', 'stove', 'lock', 'darwaza', 'paise'];
  const obj = objects.find((o) => toks.includes(o));
  if (obj) return `Around the ${obj}`;
  return type === 'other' ? null : 'Not mentioned';
}
