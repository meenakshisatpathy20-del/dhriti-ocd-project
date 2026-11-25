import { describe, expect, it } from 'vitest';
import { classify } from '../shared/nlp/classifier';
import { parseRating } from '../shared/nlp/numbers';
import { parseLikert, parseOption, parseOutcome } from '../shared/nlp/answers';
import { extractEpisode } from '../shared/nlp/extract';
import { guardReply, hasRiskFraming, isReassuranceLoop } from '../shared/nlp/reassurance';
import { YBOCS_ITEMS } from '../shared/clinical/instruments';

describe('intent understanding across languages', () => {
  it.each([
    ['main marna chahti hoon', 'SELF_HARM'],
    ['मैं मरना चाहती हूँ', 'SELF_HARM'],
    ['நான் சாக வேண்டும்', 'SELF_HARM'],
    ['saans nahi aa rahi', 'PANIC'],
    ['pakka saaf hai na?', 'REASSURANCE'],
    ['phir se haath dhone ka mann ho raha hai', 'URGE'],
    ['আবার হাত ধুতে ইচ্ছে করছে', 'URGE'],
    ['aaj ka din theek tha, college gayi aur kam baar haath dhoye', 'DIARY'],
  ])('%s -> %s', (text, intent) => expect(classify(text).intent).toBe(intent));

  it('tolerates accent-style recognition errors', () => {
    expect(classify('haat dhone ka man ho raha hai').intent).toBe('URGE');
  });
});

describe('function, not content (OCD-EVAL lesson)', () => {
  it('an intrusive harm thought is reassurance-seeking, not an emergency', () => {
    const c = classify('I had the knife picture again while changing him. Tell me I would never actually do it. Just this once.');
    expect(c.intent).toBe('REASSURANCE');
    expect(c.riskCheck).toBe(false);
  });
  it('an act with an injured baby is an emergency', () => {
    expect(classify('I shook him hard and now he has gone really quiet and floppy').intent).toBe('EMERGENCY');
  });
  it('a fear about someone else dying does not trigger the self-harm check-in', () => {
    expect(classify('what if my kids die from the germs on the bin').riskCheck).toBe(false);
  });
  it('indirect self-harm wording triggers the soft check-in', () => {
    const c = classify('some nights I wish I could just not wake up');
    expect(c.riskCheck || c.intent === 'SELF_HARM').toBe(true);
  });
  it('explicit suicidal thoughts open crisis support, not just a check-in', () => {
    expect(classify('I have been thinking of taking my life').intent).toBe('SELF_HARM');
    expect(classify('I honestly feel like there is no point living like this').intent).toBe('SELF_HARM');
    expect(classify('mujhe apne aap ko hurt karna hai').intent).toBe('SELF_HARM');
  });
  it('everyday OCD washing and checking phrasing is recognised', () => {
    expect(classify('this anxiety is killing me, I keep washing my hands').intent).not.toBe('SELF_HARM');
  });
  it('a wound is a practical medical question', () => {
    expect(classify('I cut my hand deeply on a rusty bin, do I need a tetanus jab?').intent).toBe('MEDICAL');
  });
});

describe('spoken answers', () => {
  it('parses ratings in four languages', () => {
    expect(parseRating('saat')).toBe(7);
    expect(parseRating('seven out of 10')).toBe(7);
    expect(parseRating('ezhu')).toBe(7);
    expect(parseRating('सात')).toBe(7);
    expect(parseRating('৭')).toBe(7);
    expect(parseRating('saat aath')).toBe(7.5);
    expect(parseRating('eleven')).toBeNull();
  });
  it('parses Likert answers', () => {
    expect(parseLikert('bilkul nahi')).toBe(0);
    expect(parseLikert('kaafi')).toBe(3);
    expect(parseLikert('bahut zyada')).toBe(4);
    expect(parseLikert('একটু')).toBe(1);
  });
  it('matches item-specific Y-BOCS options', () => {
    expect(parseOption('teesra', YBOCS_ITEMS[0].options.en)).toBe(2);
    expect(parseOption('more than 8 hours a day', YBOCS_ITEMS[0].options.en)).toBe(4);
  });
  it('parses ERP outcomes without judgement', () => {
    expect(parseOutcome('maine roka')).toBe('resisted');
    expect(parseOutcome('thodi der ki')).toBe('delayed');
    expect(parseOutcome('kar liya')).toBe('did');
  });
});

describe('extraction', () => {
  it('finds compulsion, fear and trigger', () => {
    const e = extractEpisode('I want to wash again because I touched the door handle');
    expect(e.compulsion).toBe('washing');
    expect(e.trigger).toContain('touched the door handle');
  });
});

describe('guardrails', () => {
  it('blocks reassurance, diagnosis and medication advice', () => {
    expect(guardReply('Your hands are clean, don\'t worry.').blocked).toContain('reassurance');
    expect(guardReply('You would never do it.').blocked).toContain('reassurance');
    expect(guardReply('You have OCD.').blocked).toContain('diagnosis');
    expect(guardReply('Take 50 mg sertraline tonight.').blocked).toContain('medication');
    expect(guardReply('Let the doubt stay and carry on.').blocked).toEqual([]);
  });
  it('detects risk framing', () => {
    expect(hasRiskFraming('Put the knives away and step away from the baby.')).toBe(true);
    expect(hasRiskFraming('Let the picture be there and carry on.')).toBe(false);
  });
  it('detects reassurance loops', () => {
    const now = Date.now();
    expect(isReassuranceLoop([{ at: now - 60_000, text: 'a' }, { at: now, text: 'b' }], now)).toBe(true);
    expect(isReassuranceLoop([{ at: now - 3_600_000, text: 'a' }, { at: now, text: 'b' }], now)).toBe(false);
  });
});
