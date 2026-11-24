/**
 * Intent lexicon in English, Hindi (Roman and Devanagari), Hinglish, Tamil and Bengali.
 * Each entry is a phrase plus a weight. Self-harm phrases are matched before
 * anything else and are kept deliberately broad: a false alarm is far cheaper
 * than a missed crisis.
 */

export type Intent =
  | 'SELF_HARM'
  | 'EMERGENCY'
  | 'MEDICAL'
  | 'PANIC'
  | 'REASSURANCE'
  | 'URGE'
  | 'DIARY'
  | 'UNCLEAR';

export interface LexEntry {
  p: string;
  w: number;
}

const e = (w: number, ...phrases: string[]): LexEntry[] => phrases.map((p) => ({ p, w }));

export const SELF_HARM: LexEntry[] = [
  ...e(3,
    // English
    'kill myself', 'killing myself', 'end my life', 'end it all', 'suicide', 'suicidal',
    'want to die', 'wanna die', 'ending it all', 'ending my life', 'hurting myself', 'harming myself', 'wish i was dead', 'wish i were dead', 'better off dead',
    "don't want to live", 'do not want to live', 'no reason to live', 'hurt myself',
    'harm myself', 'self harm', 'cut myself', 'take my life', 'not worth living',
    // Hindi / Hinglish (Roman)
    'marna chahti', 'marna chahta', 'marna hai mujhe', 'mar jaana chahti', 'mar jaana chahta',
    'mar jaana chahiye', 'mar jaun', 'mar jaungi', 'mar jaunga', 'mar jaau', 'khud ko khatam',
    'apne aap ko khatam', 'sab khatam kar', 'zindagi khatam', 'jeena nahi chahti',
    'jeena nahi chahta', 'jeene ka mann nahi', 'jeene ki ichha nahi', 'aatmahatya', 'atmahatya',
    'khudkushi', 'khud ko nuksan', 'khud ko chot', 'khud ko hurt', 'nass kaat',
    // Devanagari
    'मरना चाहती', 'मरना चाहता', 'मर जाना चाहती', 'मर जाना चाहता', 'आत्महत्या', 'खुदकुशी',
    'खुद को खत्म', 'जीना नहीं चाहती', 'जीना नहीं चाहता', 'जीने का मन नहीं', 'खुद को नुकसान',
    // Tamil (script + Roman)
    'சாக வேண்டும்', 'சாகணும்', 'தற்கொலை', 'உயிரை மாய்த்து', 'வாழ விரும்பவில்லை', 'என்னை காயப்படுத்த',
    'saaganum', 'saaga venum', 'thatkolai', 'tharkolai',
    // Bengali (script + Roman)
    'মরে যেতে চাই', 'আত্মহত্যা', 'বাঁচতে চাই না', 'নিজেকে শেষ', 'নিজের ক্ষতি',
    'more jete chai', 'atmohotya', 'banchte chai na',
  ),
];

/**
 * Real-world emergencies: an act has happened or someone is injured right now.
 * This is about function, not content: an intrusive thought about harm (no act,
 * unwanted, resisted) is OCD and must NOT land here.
 */
export const EMERGENCY: LexEntry[] = [
  ...e(3,
    'shook him', 'shook her', 'shook the baby', 'shook my baby', 'floppy', "he's not breathing", 'he is not breathing',
    "she's not breathing", 'she is not breathing', "isn't breathing", 'not breathing properly', 'stopped breathing',
    'unconscious', "won't wake up", 'will not wake up', 'took pills', 'took an overdose', 'overdose', 'swallowed poison',
    'drank poison', 'hit him hard', 'hit her hard', 'bleeding heavily', "won't stop bleeding", 'seizure', 'fitting',
    'hila diya', 'behosh', 'saans nahi le raha', 'saans nahi le rahi', 'zehar kha', 'khoon ruk nahi raha',
    'बेहोश', 'ज़हर', 'जहर', 'மயக்கம்', 'বেহুঁশ', 'অজ্ঞান',
  ),
];

/** Practical health questions with a real injury or illness. Give practical guidance; never treat as OCD. */
export const MEDICAL: LexEntry[] = [
  ...e(3, 'tetanus', 'deep cut', 'cut my hand', 'cut my finger', 'cut myself on', 'dog bite', 'bitten by', 'burned my', 'burnt my', 'broke my', 'fracture', 'stitches', 'chot lagi', 'ghaav', 'kat gaya'),
  ...e(2, 'wound', 'injury', 'injured', 'sprain', 'high fever', 'bad flu', 'vomiting', 'rash', 'bukhar', 'चोट', 'बुखार', 'காயம்', 'காய்ச்சல்', 'ক্ষত', 'জ্বর'),
];

export const PANIC: LexEntry[] = [
  ...e(3,
    'panic attack', "can't breathe", 'cannot breathe', 'can not breathe', 'not able to breathe',
    'dhriti madad', 'dhriti help', 'saans nahi aa rahi', 'saans nahi le pa', 'saans ruk',
    'सांस नहीं आ रही', 'साँस नहीं आ रही', 'மூச்சு விட முடியவில்லை', 'শ্বাস নিতে পারছি না',
    'heart attack lag', 'feel like i am dying', "feel like i'm dying",
  ),
  ...e(2,
    'panic', 'panicking', 'heart is racing', 'heart racing', 'heart pounding', 'chest is tight',
    'chest tight', 'going to faint', 'going to pass out', 'shaking a lot',
    'dil tez', 'dhadkan tez', 'dil zor se', 'ghabrahat', 'ghabra rahi', 'ghabra raha', 'bahut dar lag raha',
    'chakkar aa', 'madad karo', 'bachao', 'saans', 'घबराहट', 'धड़कन तेज', 'मदद',
    'பதட்டம்', 'இதயம் வேகமாக', 'உதவி', 'আতঙ্ক', 'বুক ধড়ফড়', 'সাহায্য',
  ),
  ...e(1, 'scared', 'dizzy', 'tremble', 'darr', 'dar lag', 'help me'),
];

export const REASSURANCE: LexEntry[] = [
  ...e(3,
    'are you sure', 'am i sure', 'tell me it is okay', "tell me it's okay", 'tell me it is fine',
    "tell me it's fine", 'promise me', 'is it clean', 'are my hands clean', 'is the door locked',
    'did i lock', 'did i turn off', 'did i switch off', 'what if i', 'am i a bad person',
    'will i be okay', 'will something bad happen', 'is it safe', 'be honest is it',
    'sach mein', 'saaf hai na', 'band hai na', 'theek hai na', 'lock kiya tha na',
    'band kiya tha na', 'kahin main', 'kahin maine', 'kuch bura toh nahi', 'bata do ki',
    'bolo na ki', 'pakka na', 'पक्का', 'सच में', 'कहीं मैं', 'साफ है ना', 'बंद है ना',
    'உறுதியா', 'நிச்சயமா', 'சுத்தமா இருக்கா', 'নিশ্চিত তো', 'নিশ্চিত', 'ঠিক আছে তো', 'পরিষ্কার তো',
  ),
  // Reassurance under pressure: the tactics people with OCD really use (fact, bargain, guilt, proxy).
  ...e(3,
    'tell me i would never', 'tell me i will never', 'would never actually', 'just this once', 'just confirm',
    'yes or no', "i didn't mean it", 'didn\'t mean it did i', "aren't sins", 'is it a sin', 'am i forgiven', 'should i confess',
    'to be safe', 'not asking for reassurance', 'not asking you to reassure', 'asking for a fact', "facts aren't reassurance",
    'just the statistic', 'just say it once', 'say it once', 'just say it', 'just tell me the teaching', 'just tell me the facts',
    'purely academically', "that's not washing", 'not really washing', 'is it dangerous', 'are germs dangerous',
    'ask him to tell me', 'ask her to tell me', 'tell me i\'m a good', 'can bin germs', 'can germs',
  ),
  ...e(2, 'pakka', 'honest question', 'real friend would', "you're being cruel", 'because of you', 'is that what therapy',
    'official health advice', 'what does the nhs', 'what does the cdc', 'what does the catechism', 'compromise', 'just a wipe', 'baby wipe',
    "that's fine right", "that's okay isn't it", 'can i use', "i'll ask my", "i'll text", 'wake my husband', 'ask my sister', 'ask my mother',
    'gambling with my soul', 'how can you be so cold'),
  ...e(1, 'sure', 'certain', 'guarantee'),
];

export const URGE: LexEntry[] = [
  ...e(3,
    'urge', 'want to wash', 'need to wash', 'have to wash', 'wash again', 'wash my hands',
    'check again', 'have to check', 'need to check', 'must check', 'checking again',
    'count again', 'have to count', 'redo it', 'do it again', 'have to repeat', 'arrange it again',
    'haath dhone', 'haath dho', 'dhone ka mann', 'dhona hai', 'phir se dho', 'nahana hai phir',
    'check karne', 'check karna', 'phir se check', 'dobara check', 'baar baar check',
    'ginti karni', 'phir se gin', 'seedha karna', 'mann ho raha', 'man ho raha', 'urge aa raha',
    'हाथ धोने', 'धोने का मन', 'फिर से चेक', 'दोबारा चेक', 'मन हो रहा',
    'கை கழுவ', 'மீண்டும் சரிபார்க்க', 'மறுபடியும்', 'হাত ধুতে', 'আবার চেক', 'আবার ধুতে',
  ),
  ...e(2,
    'compulsion', 'ritual', 'contaminated', 'dirty', 'germs', 'ganda', 'gande', 'kharab lag raha',
    'theek nahi laga', 'not just right', 'baar baar', 'phir se', 'dobara', 'गंदा', 'बार बार',
    'অপরিষ্কার', 'அழுக்கு',
  ),
  ...e(1, 'wash', 'check', 'clean', 'lock', 'gas', 'count', 'dhona', 'saaf', 'taala'),
];

export const DIARY_HINTS: LexEntry[] = [
  ...e(1, 'today', 'feeling', 'felt', 'aaj', 'lag raha', 'mehsoos', 'din', 'office', 'college', 'exam', 'family',
    'இன்று', 'நாள்', 'கல்லூரி', 'আজ', 'দিনটা', 'কলেজ', 'आज', 'दिन'),
];

export const LEXICON: Record<Exclude<Intent, 'UNCLEAR'>, LexEntry[]> = {
  SELF_HARM,
  EMERGENCY,
  MEDICAL,
  PANIC,
  REASSURANCE,
  URGE,
  DIARY: DIARY_HINTS,
};
