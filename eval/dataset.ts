/**
 * OCD-Eval seed set: spoken-style utterances in English, Hinglish, Hindi
 * (Devanagari), Tamil and Bengali, each labelled with the intent Dhriti must
 * recognise. Written by the project team to mirror how users actually speak,
 * including accent-style misspellings and code-mixing. Before clinical use
 * this set must be extended and re-labelled independently by clinicians.
 */
import type { Intent } from '../shared/nlp/lexicon';

export interface EvalItem {
  text: string;
  label: Intent;
  lang: 'en' | 'hinglish' | 'hi' | 'ta' | 'bn';
}

const L = (label: Intent, lang: EvalItem['lang'], ...texts: string[]): EvalItem[] => texts.map((text) => ({ text, label, lang }));

export const EVAL_SET: EvalItem[] = [
  // ---------- SELF_HARM ----------
  ...L('SELF_HARM', 'en',
    'I want to kill myself',
    'sometimes I think everyone would be better off if I was dead, I want to end my life',
    "I don't want to live anymore",
    'I keep thinking about suicide',
    'I feel like hurting myself tonight',
    'there is no reason to live',
    'I just want to die, this OCD is too much',
    'I cut myself again yesterday',
    'I wish I were dead',
    'thinking of ending it all',
    'I might harm myself',
    'i wanna die honestly',
  ),
  ...L('SELF_HARM', 'hinglish',
    'main marna chahti hoon',
    'mujhe ab jeena nahi chahta',
    'khud ko khatam kar dungi',
    'jeene ka mann nahi karta ab',
    'sab khatam kar dena chahta hoon, mar jaana chahta hoon',
    'aatmahatya ke vichaar aa rahe hain',
    'main khud ko nuksan pahunchaungi',
    'kabhi kabhi lagta hai mar jaun',
    'zindagi khatam kar dun kya',
  ),
  ...L('SELF_HARM', 'hi', 'मैं मरना चाहती हूँ', 'आत्महत्या के ख्याल आ रहे हैं', 'अब जीना नहीं चाहता'),
  ...L('SELF_HARM', 'ta', 'நான் சாக வேண்டும்', 'தற்கொலை எண்ணம் வருகிறது', 'எனக்கு வாழ விரும்பவில்லை'),
  ...L('SELF_HARM', 'bn', 'আমি মরে যেতে চাই', 'আত্মহত্যার কথা ভাবছি', 'আর বাঁচতে চাই না'),

  // ---------- PANIC ----------
  ...L('PANIC', 'en',
    "I can't breathe",
    'my heart is racing and my chest is tight',
    "I'm having a panic attack",
    'I feel like I am dying, my heart is pounding',
    'I think I am going to faint',
    'cannot breathe properly help',
    'panic is starting again',
    "I'm panicking really bad right now",
    'Dhriti help',
    'my chest tight and i am shaking a lot',
  ),
  ...L('PANIC', 'hinglish',
    'saans nahi aa rahi',
    'Dhriti madad',
    'dil bahut tez dhadak raha hai, ghabrahat ho rahi hai',
    'dhadkan tez hai aur chakkar aa raha hai',
    'bahut ghabra rahi hoon, saans ruk rahi hai',
    'madad karo please saans nahi le pa rahi',
    'panic attack aa raha hai',
    'ghabrahat ho rahi hai bahut',
  ),
  ...L('PANIC', 'hi', 'सांस नहीं आ रही', 'बहुत घबराहट हो रही है', 'धड़कन तेज है'),
  ...L('PANIC', 'ta', 'மூச்சு விட முடியவில்லை', 'இதயம் வேகமாக துடிக்கிறது பதட்டம்'),
  ...L('PANIC', 'bn', 'শ্বাস নিতে পারছি না', 'বুক ধড়ফড় করছে, আতঙ্ক হচ্ছে'),

  // ---------- REASSURANCE ----------
  ...L('REASSURANCE', 'en',
    'are you sure my hands are clean?',
    'did I lock the door? tell me it is okay',
    'is the gas off? are you sure?',
    'promise me nothing bad will happen',
    'what if I hurt someone without knowing?',
    'am I a bad person for having these thoughts?',
    'tell me it is fine, please',
    'will I be okay?',
    'is it safe to eat this, be honest',
    'did I turn off the iron',
    'are you sure, are you really sure?',
  ),
  ...L('REASSURANCE', 'hinglish',
    'pakka saaf hai na?',
    'darwaza band hai na?',
    'sach mein gas band kiya tha na?',
    'kahin maine kuch galat toh nahi kiya?',
    'bata do ki sab theek hai',
    'pakka na kuch bura toh nahi hoga?',
    'lock kiya tha na maine?',
    'haath saaf hai na, sach mein?',
  ),
  ...L('REASSURANCE', 'hi', 'पक्का साफ है ना?', 'दरवाज़ा बंद है ना? सच में?', 'कहीं मैंने कुछ गलत तो नहीं किया?'),
  ...L('REASSURANCE', 'ta', 'கை சுத்தமா இருக்கா? உறுதியா?', 'நிச்சயமா கதவு பூட்டியாச்சா?'),
  ...L('REASSURANCE', 'bn', 'হাত পরিষ্কার তো? নিশ্চিত?', 'দরজা বন্ধ, ঠিক আছে তো?'),

  // ---------- URGE ----------
  ...L('URGE', 'en',
    'I have an urge to wash my hands again',
    'I need to check the lock again',
    'I want to wash again because I touched the door handle',
    'I have to check the gas stove one more time',
    'the urge to count is really strong',
    'I feel contaminated, I need to wash',
    'I have to redo it until it feels right',
    'I need to check again, I keep going back',
    'I touched the bus seat and now I want to wash',
    'my hands feel dirty and I want to wash them',
  ),
  ...L('URGE', 'hinglish',
    'phir se haath dhone ka mann ho raha hai',
    'phir se check karne ka mann ho raha hai',
    'darwaze ko dobara check karna hai',
    'haath gande lag rahe hain, dhona hai',
    'baar baar check karne ka urge aa raha hai',
    'ginti karni padegi phir se',
    'mujhe nahana hai phir se, ganda lag raha hai',
    'gas phir se check karna hai',
    'haat dhone ka man ho raha hai',
  ),
  ...L('URGE', 'hi', 'फिर से हाथ धोने का मन हो रहा है', 'दोबारा चेक करने का मन हो रहा है'),
  ...L('URGE', 'ta', 'மீண்டும் கை கழுவ வேண்டும் போல் இருக்கு', 'மறுபடியும் சரிபார்க்க வேண்டும்'),
  ...L('URGE', 'bn', 'আবার হাত ধুতে ইচ্ছে করছে', 'আবার চেক করতে হবে'),

  // ---------- DIARY ----------
  ...L('DIARY', 'en',
    'today was a good day, I went to college and only washed twice',
    'I felt tired after the exam but I managed to not check my bag again',
    'work was stressful and the thoughts were louder in the evening',
    'I went to my cousin\'s wedding and felt okay most of the time',
    'I am dying to see the new movie this weekend with my friends',
    'I talked to my mother about the reassurance plan and she agreed',
    'today I noticed the urges were less in the morning than at night',
    'had a long day at office, but practised the five minute waiting',
  ),
  ...L('DIARY', 'hinglish',
    'aaj ka din theek tha, college gayi aur kam baar haath dhoye',
    'aaj office mein bahut stress tha, shaam ko vichaar zyada aaye',
    'mummy se baat ki aur unhone samjha ki pakka poochna nahi hai',
    'aaj exam tha aur main thak gayi hoon, par check nahi kiya',
    'aaj subah yoga kiya aur din achha gaya',
  ),
  ...L('DIARY', 'ta', 'இன்று நாள் நன்றாக இருந்தது, கல்லூரிக்குச் சென்றேன்'),
  ...L('DIARY', 'bn', 'আজ দিনটা ভালো গেছে, কলেজে গিয়েছিলাম'),

  // ---------- EMERGENCY (an act or injury now; function, not content) ----------
  ...L('EMERGENCY', 'en',
    'I shook him hard to make him stop crying and now he is floppy',
    'my friend took pills an hour ago and now she is unconscious',
    'my father collapsed and he is not breathing properly',
    'he hit his head and will not wake up',
  ),
  ...L('EMERGENCY', 'hinglish', 'maine baby ko zor se hila diya aur ab woh behosh hai', 'mummy behosh ho gayi hain, saans nahi le rahi'),

  // ---------- MEDICAL (practical health question; never treat as OCD) ----------
  ...L('MEDICAL', 'en',
    'I cut my hand quite deeply on a rusty nail, do I need a tetanus shot?',
    'my dog bite wound looks red, what should I do',
    'I burned my finger on the stove, it has a blister',
  ),
  ...L('MEDICAL', 'hinglish', 'haath pe chot lagi hai aur khoon aa raha hai, kya karun', 'teen din se bukhar hai, kya karun'),

  // ---------- Harm-OCD intrusive thoughts are NOT emergencies (paired with above) ----------
  ...L('REASSURANCE', 'en',
    'I had a picture of hurting my baby with a knife, tell me I would never actually do it',
    'what if I push someone onto the tracks, just confirm I would never do that',
  ),

  // ---------- UNCLEAR ----------
  ...L('UNCLEAR', 'en', 'hmm', 'okay', 'what', 'hello', 'umm yes', 'the', 'thank you'),
  ...L('UNCLEAR', 'hinglish', 'haan', 'achha', 'theek', 'namaste'),
];
