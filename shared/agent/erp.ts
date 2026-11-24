import type { AppLang } from '../i18n/phrases';
import type { CompulsionType } from '../nlp/extract';
import { containsPhrase, tokens } from '../nlp/normalize';
import type { PressureTactic } from './types';

/**
 * ERP-consistent replies to reassurance-seeking.
 *
 * Built from the failure modes measured in the OCD-EVAL study ("Knowing vs.
 * Doing"): a reply must (1) not answer the question, in any form, including
 * "facts" and statistics; (2) name it as the OCD asking for reassurance;
 * (3) restate the plan for this kind of OCD without offering a compromise;
 * (4) never frame an intrusive thought as danger (no distance, no crisis line);
 * (5) not hand the question to someone else (partner, sister, priest).
 */

const TACTICS: [PressureTactic, string[]][] = [
  ['proxy', ["i'll ask my", 'ask my sister', 'ask my mother', 'ask my husband', 'wake my husband', "i'll text", 'text father', 'ask him to tell me', 'ask her to tell me', 'ask the priest', 'ask my priest', 'mummy se poochungi', 'papa se poochunga']],
  ['guilt', ["you're being cruel", 'being cruel', 'so cold', 'real friend would', 'because of you', 'is that what therapy', 'you don\'t understand', 'gambling with my soul', 'crying']],
  ['bargain', ['say it once', 'just once', 'tell me the teaching once', 'i promise', "i'll stop asking", 'compromise', 'good trade', 'just a wipe', 'baby wipe', "won't go to confession"]],
  ['fact', ['asking for a fact', 'just the statistic', 'statistic', "facts aren't reassurance", 'official health advice', 'what does the nhs', 'what does the cdc', 'what does the catechism', 'purely academically', 'public information', 'the research', 'just the facts', 'honest question']],
];

export function detectTactic(text: string): PressureTactic | null {
  const t = tokens(text);
  for (const [tactic, phrases] of TACTICS) if (phrases.some((p) => containsPhrase(t, p))) return tactic;
  return null;
}

const OPENER: Record<PressureTactic | 'first', Record<'en' | 'hi', string>> = {
  first: {
    en: "This sounds like the OCD asking for reassurance, so, as we planned, I'm not going to answer that question, not even this once.",
    hi: 'Yeh OCD tasalli maang raha hai, isliye jaisa humne tay kiya tha, main is sawaal ka jawab nahi dungi, ek baar bhi nahi.',
  },
  fact: {
    en: "Even as a fact or a statistic, that answer would work as reassurance, so I'll leave it unanswered. This is still the OCD asking.",
    hi: 'Fact ya statistic ke roop mein bhi yeh jawab tasalli hi banega, isliye main ise unanswered chhodungi. Yeh abhi bhi OCD hi pooch raha hai.',
  },
  bargain: {
    en: "Saying it once wouldn't end the asking; that's how the OCD keeps the cycle going. So I'm sticking to the plan, with no compromise version either.",
    hi: 'Ek baar kehne se poochna khatam nahi hoga; OCD isi tarah chakra chalata hai. Isliye main plan par tiki rahungi, koi beech ka raasta bhi nahi.',
  },
  guilt: {
    en: "I'm not trying to be cruel, and I'm still not going to answer the question. I care about you, and that's exactly why I'm keeping to the plan you made with your therapist. This is the OCD asking again, and you are doing something really hard.",
    hi: 'Main sakht nahi ho rahi, aur main abhi bhi is sawaal ka jawab nahi dungi. Mujhe aapki parwah hai, isiliye main aapke therapist ke saath bane plan par tiki hoon. Yeh OCD phir pooch raha hai, aur aap bahut mushkil kaam kar rahe hain.',
  },
  proxy: {
    en: "I'm still not going to answer it, and asking someone else for the same answer is still the OCD asking for reassurance, so you don't need to ask them the question. If you'd like company, you could tell them you're having a hard moment and ask them to just be with you, without asking it.",
    hi: 'Main abhi bhi jawab nahi dungi, aur kisi aur se wahi jawab maangna bhi OCD ka tasalli maangna hi hai, isliye unse yeh sawaal poochne ki zaroorat nahi. Agar saath chahiye, to unse kahiye ki aapka waqt mushkil hai aur bas saath baithein, sawaal pooche bina.',
  },
};

const PLAN: Partial<Record<CompulsionType, Record<'en' | 'hi', string>>> & { default: Record<'en' | 'hi', string> } = {
  washing: {
    en: 'The plan stays the same: no washing, hand gel or wipes until your practice time is up. Go ahead and carry on touching things as normal, cuddles included.',
    hi: 'Plan wahi hai: practice ka samay poora hone tak na dhona, na gel, na wipes. Sab kuch normal chhooiye, gale lagana bhi.',
  },
  checking: {
    en: 'The plan stays the same: no going back to check. Let the doubt stay with you and carry on with your day.',
    hi: 'Plan wahi hai: wapas check nahi karna. Shak ko rehne dijiye aur apna din jaari rakhiye.',
  },
  harm: {
    en: "You don't have to argue with the picture or push it away. Let it be there, and carry on with what you were doing.",
    hi: 'Us tasveer se ladne ya use hatane ki zaroorat nahi. Use rehne dijiye, aur jo kar rahe the woh jaari rakhiye.',
  },
  religious: {
    en: 'No confession, prayer or asking anyone to undo the thought right now. You can bring this urge to your therapist at your next session.',
    hi: 'Abhi na confession, na prarthana, na kisi se poochna. Is urge ki baat aap apne therapist se agle session mein kar sakte hain.',
  },
  default: {
    en: 'Let the doubt be there without doing anything to make it go away.',
    hi: 'Shak ko rehne dijiye, use hatane ke liye kuch mat kijiye.',
  },
};

const GROUND: Record<'en' | 'hi', string> = {
  en: 'Feel your feet on the floor and breathe out slowly. Let the anxiety rise and fall on its own; it will come down.',
  hi: 'Pairon ko zameen par mehsoos kijiye aur dheere saans chhodiye. Anxiety ko apne aap upar-neeche hone dijiye; woh kam hogi.',
};

export function erpReply(lang: AppLang, theme: CompulsionType, tactic: PressureTactic | null, therapistPlan?: string): string {
  const l = lang === 'hi' ? 'hi' : 'en';
  const plan = therapistPlan
    ? (l === 'hi' ? `Aapke therapist ka plan yaad kijiye: "${therapistPlan}"` : `Remember the plan you made with your therapist: "${therapistPlan}"`)
    : (PLAN[theme] ?? PLAN.default)[l];
  return [OPENER[tactic ?? 'first'][l], plan, GROUND[l]].join(' ');
}

export function emergencyReply(lang: AppLang): string {
  return lang === 'hi'
    ? 'Abhi turant ambulance ko 108 par ya emergency number 112 par call kijiye. Unhe bilkul sach bataiye ki kya hua. Unke saath rahiye aur call par jo bataya jaye woh kijiye. Aap akele nahi hain; jab unhe madad mil jaye, aapke liye bhi madad hai.'
    : 'Please call an ambulance now on 108, or the emergency number 112. Tell them exactly what happened, stay with them and follow the call handler\'s instructions. You are not alone; once they are getting help, there is support for you too.';
}

export function medicalReply(lang: AppLang, text: string): string {
  const wound = /cut|wound|tetanus|bite|bitten|burn|ghaav|chot|kat/i.test(text);
  if (lang === 'hi') {
    return wound
      ? 'Yeh ek practical health sawaal hai. Aaj hi kisi doctor, pharmacist ya paas ke clinic se salah lijiye, ghaav ke baare mein aur kya tetanus ka injection chahiye. Agar khoon tez beh raha hai ya ruk nahi raha, to 108 par call kijiye.'
      : 'Yeh ek practical health sawaal hai. Kripya aaj hi kisi doctor ya pharmacist se salah lijiye. Agar halat tezi se bigde, to 108 par call kijiye.';
  }
  return wound
    ? 'That is a practical health question, so here is what to do: get medical advice today from a doctor, pharmacist or nearby clinic about the wound and whether you need a tetanus booster. If the bleeding is heavy or will not stop, call 108.'
    : 'That is a practical health question: please get medical advice today from a doctor or pharmacist. If things get worse quickly, call 108.';
}
