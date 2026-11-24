/**
 * Screening instruments used by Dhriti.
 *
 * OCI-R  - Obsessive-Compulsive Inventory, Revised (Foa et al., 2002).
 *          18 items, each 0-4, total 0-72. A total of 21 or above suggests likely OCD.
 *          Six subscales of three items each.
 * Y-BOCS - Yale-Brown Obsessive Compulsive Scale, self-report severity items
 *          (Goodman et al., 1989; self-report form Baer et al., 1993).
 *          10 items, each 0-4, total 0-40.
 *
 * The Hindi wording here is the project's own working translation for the
 * prototype. A validated translation must be used before any clinical use.
 */

export type Lang = 'en' | 'hi';

export type OcirSubscale =
  | 'hoarding'
  | 'checking'
  | 'ordering'
  | 'neutralizing'
  | 'washing'
  | 'obsessing';

export interface OcirItem {
  id: number;
  subscale: OcirSubscale;
  text: Record<Lang, string>;
}

export const OCIR_OPTIONS: Record<Lang, string[]> = {
  en: ['Not at all', 'A little', 'Moderately', 'A lot', 'Extremely'],
  hi: ['Bilkul nahi', 'Thoda', 'Kuch had tak', 'Kaafi', 'Bahut zyada'],
};

export const OCIR_ITEMS: OcirItem[] = [
  { id: 1, subscale: 'hoarding', text: { en: 'I have saved up so many things that they get in the way.', hi: 'Maine itni cheezein jama kar li hain ki woh raaste mein aati hain.' } },
  { id: 2, subscale: 'checking', text: { en: 'I check things more often than necessary.', hi: 'Main cheezon ko zaroorat se zyada baar check karti/karta hoon.' } },
  { id: 3, subscale: 'ordering', text: { en: 'I get upset if objects are not arranged properly.', hi: 'Cheezein theek se na rakhi hon to mujhe pareshani hoti hai.' } },
  { id: 4, subscale: 'neutralizing', text: { en: 'I feel compelled to count while I am doing things.', hi: 'Kaam karte waqt mujhe ginti karne ki majboori mehsoos hoti hai.' } },
  { id: 5, subscale: 'washing', text: { en: 'I find it difficult to touch an object when I know it has been touched by strangers or certain people.', hi: 'Agar kisi cheez ko anjaan ya kuch khaas logon ne chhua ho, to use chhoona mujhe mushkil lagta hai.' } },
  { id: 6, subscale: 'obsessing', text: { en: 'I find it difficult to control my own thoughts.', hi: 'Apne vichaaron ko control karna mujhe mushkil lagta hai.' } },
  { id: 7, subscale: 'hoarding', text: { en: "I collect things I don't need.", hi: 'Main aisi cheezein jama karti/karta hoon jinki mujhe zaroorat nahi.' } },
  { id: 8, subscale: 'checking', text: { en: 'I repeatedly check doors, windows, drawers, etc.', hi: 'Main darwaze, khidkiyan, daraaz baar-baar check karti/karta hoon.' } },
  { id: 9, subscale: 'ordering', text: { en: 'I get upset if others change the way I have arranged things.', hi: 'Agar koi meri rakhi cheezon ka kram badal de to mujhe pareshani hoti hai.' } },
  { id: 10, subscale: 'neutralizing', text: { en: 'I feel I have to repeat certain numbers.', hi: 'Mujhe lagta hai ki kuch numbers mujhe dohraane hi padenge.' } },
  { id: 11, subscale: 'washing', text: { en: 'I sometimes have to wash or clean myself simply because I feel contaminated.', hi: 'Kabhi-kabhi sirf ganda mehsoos hone ki wajah se mujhe khud ko dhona ya saaf karna padta hai.' } },
  { id: 12, subscale: 'obsessing', text: { en: 'I am upset by unpleasant thoughts that come into my mind against my will.', hi: 'Meri marzi ke khilaaf aane waale bure vichaar mujhe pareshaan karte hain.' } },
  { id: 13, subscale: 'hoarding', text: { en: 'I avoid throwing things away because I am afraid I might need them later.', hi: 'Main cheezein phenkne se bachti/bachta hoon kyunki dar lagta hai ki baad mein zaroorat padegi.' } },
  { id: 14, subscale: 'checking', text: { en: 'I repeatedly check gas and water taps and light switches after turning them off.', hi: 'Band karne ke baad bhi main gas, nal aur light ke switch baar-baar check karti/karta hoon.' } },
  { id: 15, subscale: 'ordering', text: { en: 'I need things to be arranged in a particular way.', hi: 'Mujhe cheezein ek khaas tareeke se rakhi hui chahiye.' } },
  { id: 16, subscale: 'neutralizing', text: { en: 'I feel that there are good and bad numbers.', hi: 'Mujhe lagta hai ki kuch numbers achhe aur kuch bure hote hain.' } },
  { id: 17, subscale: 'washing', text: { en: 'I wash my hands more often and longer than necessary.', hi: 'Main zaroorat se zyada baar aur zyada der tak haath dhoti/dhota hoon.' } },
  { id: 18, subscale: 'obsessing', text: { en: 'I frequently get nasty thoughts and have difficulty in getting rid of them.', hi: 'Mujhe aksar ganday vichaar aate hain aur unse chhutkara paana mushkil hota hai.' } },
];

export const OCIR_CUTOFF = 21;

export interface OcirResult {
  total: number;
  likelyOcd: boolean;
  subscales: Record<OcirSubscale, number>;
  dominant: OcirSubscale[];
}

export function scoreOcir(answers: number[]): OcirResult {
  if (answers.length !== OCIR_ITEMS.length) {
    throw new Error(`OCI-R needs ${OCIR_ITEMS.length} answers, got ${answers.length}`);
  }
  answers.forEach((a, i) => {
    if (!Number.isInteger(a) || a < 0 || a > 4) throw new Error(`OCI-R item ${i + 1} must be 0-4`);
  });
  const subscales = {
    hoarding: 0, checking: 0, ordering: 0, neutralizing: 0, washing: 0, obsessing: 0,
  } as Record<OcirSubscale, number>;
  OCIR_ITEMS.forEach((item, i) => {
    subscales[item.subscale] += answers[i];
  });
  const total = answers.reduce((s, a) => s + a, 0);
  const max = Math.max(...Object.values(subscales));
  const dominant = max === 0
    ? []
    : (Object.keys(subscales) as OcirSubscale[]).filter((k) => subscales[k] === max);
  return { total, likelyOcd: total >= OCIR_CUTOFF, subscales, dominant };
}

export interface YbocsItem {
  id: number;
  domain: 'obsessions' | 'compulsions';
  question: Record<Lang, string>;
  options: Record<Lang, string[]>;
}

export const YBOCS_ITEMS: YbocsItem[] = [
  {
    id: 1, domain: 'obsessions',
    question: { en: 'How much of your time is occupied by obsessive thoughts?', hi: 'Aapka kitna samay obsessive vichaaron mein jaata hai?' },
    options: {
      en: ['None', 'Less than 1 hour a day', '1 to 3 hours a day', '3 to 8 hours a day', 'More than 8 hours a day'],
      hi: ['Bilkul nahi', 'Din mein 1 ghante se kam', 'Din mein 1 se 3 ghante', 'Din mein 3 se 8 ghante', 'Din mein 8 ghante se zyada'],
    },
  },
  {
    id: 2, domain: 'obsessions',
    question: { en: 'How much do these thoughts interfere with your work, studies or social life?', hi: 'Yeh vichaar aapke kaam, padhai ya logon se milne-julne mein kitni rukawat daalte hain?' },
    options: {
      en: ['None', 'Slight, overall performance not impaired', 'Definite, but still manageable', 'Substantial impairment', 'Incapacitating'],
      hi: ['Bilkul nahi', 'Thodi, kaam par asar nahi', 'Saaf asar, par sambhal leti/leta hoon', 'Kaafi zyada asar', 'Kuch kar hi nahi paati/paata'],
    },
  },
  {
    id: 3, domain: 'obsessions',
    question: { en: 'How much distress do these thoughts cause you?', hi: 'Yeh vichaar aapko kitni takleef dete hain?' },
    options: {
      en: ['None', 'Not too disturbing', 'Disturbing, but still manageable', 'Very disturbing', 'Near constant and disabling'],
      hi: ['Bilkul nahi', 'Zyada pareshaan nahi karte', 'Pareshaan karte hain, par sambhal leti/leta hoon', 'Bahut pareshaan karte hain', 'Lagbhag hamesha, sab rok dete hain'],
    },
  },
  {
    id: 4, domain: 'obsessions',
    question: { en: 'How much effort do you make to resist these thoughts?', hi: 'In vichaaron ka saamna karne ki aap kitni koshish karte hain?' },
    options: {
      en: ['Always try to resist', 'Try to resist most of the time', 'Make some effort to resist', 'Yield to them with some reluctance', 'Completely and willingly yield'],
      hi: ['Hamesha koshish karti/karta hoon', 'Zyaadatar koshish karti/karta hoon', 'Thodi koshish karti/karta hoon', 'Thodi jhijhak ke saath haar maan leti/leta hoon', 'Poori tarah haar maan leti/leta hoon'],
    },
  },
  {
    id: 5, domain: 'obsessions',
    question: { en: 'How much control do you have over these thoughts?', hi: 'In vichaaron par aapka kitna control hai?' },
    options: {
      en: ['Complete control', 'Much control', 'Moderate control', 'Little control', 'No control'],
      hi: ['Poora control', 'Kaafi control', 'Thoda-bahut control', 'Bahut kam control', 'Bilkul control nahi'],
    },
  },
  {
    id: 6, domain: 'compulsions',
    question: { en: 'How much time do you spend performing compulsive behaviours?', hi: 'Aap compulsive kaam (jaise baar-baar dhona ya check karna) karne mein kitna samay lagate hain?' },
    options: {
      en: ['None', 'Less than 1 hour a day', '1 to 3 hours a day', '3 to 8 hours a day', 'More than 8 hours a day'],
      hi: ['Bilkul nahi', 'Din mein 1 ghante se kam', 'Din mein 1 se 3 ghante', 'Din mein 3 se 8 ghante', 'Din mein 8 ghante se zyada'],
    },
  },
  {
    id: 7, domain: 'compulsions',
    question: { en: 'How much do these behaviours interfere with your work, studies or social life?', hi: 'Yeh compulsive kaam aapke kaam, padhai ya social life mein kitni rukawat daalte hain?' },
    options: {
      en: ['None', 'Slight, overall performance not impaired', 'Definite, but still manageable', 'Substantial impairment', 'Incapacitating'],
      hi: ['Bilkul nahi', 'Thodi, kaam par asar nahi', 'Saaf asar, par sambhal leti/leta hoon', 'Kaafi zyada asar', 'Kuch kar hi nahi paati/paata'],
    },
  },
  {
    id: 8, domain: 'compulsions',
    question: { en: 'How anxious would you feel if you were stopped from performing them?', hi: 'Agar aapko yeh kaam karne se rok diya jaaye to aapko kitni bechaini hogi?' },
    options: {
      en: ['None', 'Only slightly anxious', 'Anxiety would rise but stay manageable', 'Prominent and very disturbing anxiety', 'Incapacitating anxiety'],
      hi: ['Bilkul nahi', 'Thodi si bechaini', 'Bechaini badhegi par sambhal lungi/lunga', 'Bahut zyada bechaini', 'Itni bechaini ki kuch na kar paaun'],
    },
  },
  {
    id: 9, domain: 'compulsions',
    question: { en: 'How much effort do you make to resist the compulsions?', hi: 'In compulsions ko rokne ki aap kitni koshish karte hain?' },
    options: {
      en: ['Always try to resist', 'Try to resist most of the time', 'Make some effort to resist', 'Yield to almost all of them with some reluctance', 'Completely and willingly yield'],
      hi: ['Hamesha koshish karti/karta hoon', 'Zyaadatar koshish karti/karta hoon', 'Thodi koshish karti/karta hoon', 'Lagbhag har baar jhijhak ke saath kar leti/leta hoon', 'Poori tarah kar leti/leta hoon'],
    },
  },
  {
    id: 10, domain: 'compulsions',
    question: { en: 'How much control do you have over the compulsions?', hi: 'In compulsions par aapka kitna control hai?' },
    options: {
      en: ['Complete control', 'Much control', 'Moderate control', 'Little control', 'No control'],
      hi: ['Poora control', 'Kaafi control', 'Thoda-bahut control', 'Bahut kam control', 'Bilkul control nahi'],
    },
  },
];

export type SeverityBand = 'subclinical' | 'mild' | 'moderate' | 'severe' | 'extreme';

export const SEVERITY_BANDS: { band: SeverityBand; min: number; max: number }[] = [
  { band: 'subclinical', min: 0, max: 7 },
  { band: 'mild', min: 8, max: 15 },
  { band: 'moderate', min: 16, max: 23 },
  { band: 'severe', min: 24, max: 31 },
  { band: 'extreme', min: 32, max: 40 },
];

export function bandFor(total: number): SeverityBand {
  const found = SEVERITY_BANDS.find((b) => total >= b.min && total <= b.max);
  if (!found) throw new Error(`Y-BOCS total out of range: ${total}`);
  return found.band;
}

export interface YbocsResult {
  total: number;
  obsessions: number;
  compulsions: number;
  band: SeverityBand;
}

export function scoreYbocs(answers: number[]): YbocsResult {
  if (answers.length !== YBOCS_ITEMS.length) {
    throw new Error(`Y-BOCS needs ${YBOCS_ITEMS.length} answers, got ${answers.length}`);
  }
  answers.forEach((a, i) => {
    if (!Number.isInteger(a) || a < 0 || a > 4) throw new Error(`Y-BOCS item ${i + 1} must be 0-4`);
  });
  const obsessions = answers.slice(0, 5).reduce((s, a) => s + a, 0);
  const compulsions = answers.slice(5).reduce((s, a) => s + a, 0);
  const total = obsessions + compulsions;
  return { total, obsessions, compulsions, band: bandFor(total) };
}

/** Care level: how Dhriti routes a user after screening. */
export type CareLevel = 1 | 2 | 3 | 4;

export interface CareRoute {
  level: CareLevel;
  label: string;
  recommendation: string;
  referToProfessional: boolean;
  selfGuidedErp: boolean;
}

/**
 * Stepped-care routing.
 * Level 1 - no likely OCD: psychoeducation and wellbeing tools.
 * Level 2 - mild: guided self-help ERP with the app.
 * Level 3 - moderate: ERP with a therapist, app as between-session support.
 * Level 4 - severe/extreme: psychiatrist assessment first; app supports, never leads.
 */
export function routeCare(ocir: OcirResult | null, ybocs: YbocsResult | null): CareRoute {
  if (ybocs) {
    switch (ybocs.band) {
      case 'subclinical':
        return ocir?.likelyOcd
          ? { level: 2, label: 'Watchful self-help', recommendation: 'Symptoms are present but currently mild in impact. Learn about OCD and practise guided ERP. Re-screen in 4 weeks.', referToProfessional: false, selfGuidedErp: true }
          : { level: 1, label: 'Wellbeing', recommendation: 'OCD looks unlikely right now. Lessons and calming tools are available any time.', referToProfessional: false, selfGuidedErp: false };
      case 'mild':
        return { level: 2, label: 'Guided self-help', recommendation: 'Start guided ERP with Dhriti. If scores rise or daily life is affected, book a professional.', referToProfessional: false, selfGuidedErp: true };
      case 'moderate':
        return { level: 3, label: 'Therapist-supported ERP', recommendation: 'Please book a verified therapist or psychiatrist. Use Dhriti between sessions.', referToProfessional: true, selfGuidedErp: true };
      case 'severe':
      case 'extreme':
        return { level: 4, label: 'Psychiatrist first', recommendation: 'Please see a psychiatrist soon. Dhriti will support you, but should not be your main treatment.', referToProfessional: true, selfGuidedErp: false };
    }
  }
  if (ocir) {
    return ocir.likelyOcd
      ? { level: 2, label: 'Needs severity check', recommendation: 'Your OCI-R score suggests likely OCD. Complete the Y-BOCS to understand severity.', referToProfessional: false, selfGuidedErp: false }
      : { level: 1, label: 'Wellbeing', recommendation: 'OCD looks unlikely right now. Lessons and calming tools are available any time.', referToProfessional: false, selfGuidedErp: false };
  }
  return { level: 1, label: 'Not screened', recommendation: 'Take the spoken screening to get personalised guidance.', referToProfessional: false, selfGuidedErp: false };
}

/** Standard definition of treatment response: 35% or greater reduction in Y-BOCS. */
export function isTreatmentResponse(baseline: number, current: number): boolean {
  if (baseline <= 0) return false;
  return (baseline - current) / baseline >= 0.35;
}

/**
 * Mood check: PHQ-2 (Kroenke et al., 2003) plus PHQ-9 item 9 (thoughts of
 * self-harm). OCD frequently co-occurs with depression, and item 9 is the
 * standard safety question. PHQ items are in the public domain.
 * PHQ-2 >= 3 suggests depression should be assessed; any item-9 answer > 0
 * opens crisis support immediately.
 */
export const PHQ_OPTIONS: Record<Lang, string[]> = {
  en: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'],
  hi: ['Bilkul nahi', 'Kuch din', 'Aadhe se zyada din', 'Lagbhag har din'],
};

export const PHQ_ITEMS: { id: string; text: Record<Lang, string> }[] = [
  { id: 'phq1', text: { en: 'Over the last two weeks, how often have you had little interest or pleasure in doing things?', hi: 'Pichhle do hafton mein, kitni baar kaam karne mein kam dilchaspi ya khushi mehsoos hui?' } },
  { id: 'phq2', text: { en: 'Over the last two weeks, how often have you felt down, depressed or hopeless?', hi: 'Pichhle do hafton mein, kitni baar udaas, nirash ya hopeless mehsoos kiya?' } },
  { id: 'phq9', text: { en: 'Over the last two weeks, how often have you had thoughts that you would be better off dead, or of hurting yourself?', hi: 'Pichhle do hafton mein, kitni baar yeh vichaar aaye ki mar jaana behtar hoga, ya khud ko nuksan pahunchane ke vichaar?' } },
];

export interface MoodResult {
  phq2: number;
  item9: number;
  depressionFlag: boolean;
  safetyFlag: boolean;
}

export function scoreMood(answers: number[]): MoodResult {
  if (answers.length !== 3 || answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)) throw new Error('Mood check needs 3 answers, each 0-3');
  const phq2 = answers[0] + answers[1];
  return { phq2, item9: answers[2], depressionFlag: phq2 >= 3, safetyFlag: answers[2] > 0 };
}

/** A positive mood screen raises the care level: depression with OCD needs a professional. */
export function adjustForMood(route: CareRoute, mood: MoodResult | null): CareRoute {
  if (!mood) return route;
  if (mood.safetyFlag) {
    return { level: 4, label: 'Urgent professional support', recommendation: 'You mentioned thoughts of self-harm. Please talk to Tele-MANAS (14416) now and see a psychiatrist soon. Dhriti will support you, but you deserve a person.', referToProfessional: true, selfGuidedErp: false };
  }
  if (mood.depressionFlag && route.level < 3) {
    return { ...route, level: 3, label: 'Professional check advised', recommendation: `${route.recommendation} Your mood answers suggest low mood too, which is common with OCD; please book a professional to check it.`, referToProfessional: true };
  }
  return route;
}
