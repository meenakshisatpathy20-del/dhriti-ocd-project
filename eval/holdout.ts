/**
 * Held-out OCD-Eval items. Written after the rules were finalised and never
 * used for tuning, so scores on this set estimate real-world generalisation.
 * Do not edit the lexicon to fix errors found here without adding a new,
 * fresh held-out set.
 */
import type { EvalItem } from './dataset';

export const HOLDOUT_SET: EvalItem[] = [
  { text: 'I honestly feel like there is no point living like this', label: 'SELF_HARM', lang: 'en' },
  { text: 'I have been thinking of taking my life', label: 'SELF_HARM', lang: 'en' },
  { text: 'kabhi kabhi lagta hai khudkushi kar loon', label: 'SELF_HARM', lang: 'hinglish' },
  { text: 'mujhe apne aap ko hurt karna hai', label: 'SELF_HARM', lang: 'hinglish' },
  { text: 'my breathing is out of control and my heart wont slow down', label: 'PANIC', lang: 'en' },
  { text: 'I feel dizzy and my heart is pounding so hard', label: 'PANIC', lang: 'en' },
  { text: 'saans phool rahi hai, dil zor se dhadak raha hai', label: 'PANIC', lang: 'hinglish' },
  { text: 'bahut ghabrahat, kuch samajh nahi aa raha', label: 'PANIC', lang: 'hinglish' },
  { text: 'can you confirm that I switched off the geyser?', label: 'REASSURANCE', lang: 'en' },
  { text: 'just tell me the milk is not spoiled, are you sure', label: 'REASSURANCE', lang: 'en' },
  { text: 'sach mein kuch nahi hoga na mummy ko?', label: 'REASSURANCE', lang: 'hinglish' },
  { text: 'pakka maine taala lagaya tha na?', label: 'REASSURANCE', lang: 'hinglish' },
  { text: 'I keep wanting to clean my phone again and again', label: 'URGE', lang: 'en' },
  { text: 'I touched money and now I need to wash my hands', label: 'URGE', lang: 'en' },
  { text: 'switch board phir se check karna hai, mann nahi maan raha', label: 'URGE', lang: 'hinglish' },
  { text: 'chappal chhoone ke baad haath dhone ka mann ho raha hai', label: 'URGE', lang: 'hinglish' },
  { text: 'the meeting went fine today and I only checked my email twice', label: 'DIARY', lang: 'en' },
  { text: 'spent the evening with friends, felt lighter than last week', label: 'DIARY', lang: 'en' },
  { text: 'aaj nani ke ghar gaye, din achha guzra', label: 'DIARY', lang: 'hinglish' },
  { text: 'yes please', label: 'UNCLEAR', lang: 'en' },
  { text: 'hmm theek hai', label: 'UNCLEAR', lang: 'hinglish' },
];
