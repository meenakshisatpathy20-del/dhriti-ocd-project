/**
 * Spoken phrases Dhriti says out loud, in four languages.
 * Hindi lines are written in Roman script (Hinglish) because that is how most
 * young users type and read; speech synthesis reads them with a Hindi voice.
 * Tamil and Bengali lines are working translations and need native-speaker review.
 */

export type AppLang = 'en' | 'hi' | 'ta' | 'bn';

export const LANGS: { id: AppLang; label: string; speech: string; native: string }[] = [
  { id: 'hi', label: 'Hindi / Hinglish', speech: 'hi-IN', native: 'हिन्दी' },
  { id: 'en', label: 'English', speech: 'en-IN', native: 'English' },
  { id: 'ta', label: 'Tamil', speech: 'ta-IN', native: 'தமிழ்' },
  { id: 'bn', label: 'Bengali', speech: 'bn-IN', native: 'বাংলা' },
];

export function speechCode(lang: AppLang): string {
  return LANGS.find((l) => l.id === lang)?.speech ?? 'en-IN';
}

type PhraseKey =
  | 'greeting'
  | 'askLanguage'
  | 'disclaimer'
  | 'urgeAck'
  | 'urgeWait'
  | 'askAnxiety'
  | 'askOutcome'
  | 'noJudgement'
  | 'reassuranceDecline'
  | 'panicStart'
  | 'panicBreatheIn'
  | 'panicBreatheOut'
  | 'panicWell'
  | 'crisis'
  | 'noise'
  | 'askNumber'
  | 'confirmIntent'
  | 'silence'
  | 'familyAlert'
  | 'labelThought'
  | 'humLonger'
  | 'humGood'
  | 'screeningIntro'
  | 'notDiagnosis'
  | 'listening'
  | 'didNotCatch';

export const PHRASES: Record<PhraseKey, Record<AppLang, string>> = {
  greeting: {
    en: "Hello, I'm Dhriti. I'm here with you.",
    hi: 'Namaste, main Dhriti hoon. Main aapke saath hoon.',
    ta: 'வணக்கம், நான் த்ருதி. நான் உங்களுடன் இருக்கிறேன்.',
    bn: 'নমস্কার, আমি ধৃতি। আমি আপনার সাথে আছি।',
  },
  askLanguage: {
    en: 'Which language would you like to talk in?',
    hi: 'Aap kis bhasha mein baat karna chahenge?',
    ta: 'எந்த மொழியில் பேச விரும்புகிறீர்கள்?',
    bn: 'আপনি কোন ভাষায় কথা বলতে চান?',
  },
  disclaimer: {
    en: 'Dhriti supports care. It does not diagnose or replace a doctor.',
    hi: 'Dhriti care mein madad karti hai. Yeh diagnosis nahi karti, na doctor ki jagah leti hai.',
    ta: 'த்ருதி சிகிச்சைக்கு உதவுகிறது. இது நோயறிதல் செய்யாது, மருத்துவருக்கு மாற்றும் அல்ல.',
    bn: 'ধৃতি যত্নে সাহায্য করে। এটি রোগ নির্ণয় করে না, ডাক্তারের বিকল্পও নয়।',
  },
  urgeAck: {
    en: "That sounds hard. Thank you for telling me. You can do this.",
    hi: 'Yeh mushkil hai. Batane ke liye shukriya. Aap kar sakte hain.',
    ta: 'இது கடினமாக இருக்கும். சொன்னதற்கு நன்றி. உங்களால் முடியும்.',
    bn: 'এটা কঠিন। বলার জন্য ধন্যবাদ। আপনি পারবেন।',
  },
  urgeWait: {
    en: "Let's wait together for two minutes. You don't have to do anything with the urge.",
    hi: 'Chaliye do minute saath mein rukte hain. Is urge ke saath kuch karna zaroori nahi.',
    ta: 'இரண்டு நிமிடம் சேர்ந்து காத்திருப்போம். இந்த உந்துதலுக்கு எதுவும் செய்ய வேண்டியதில்லை.',
    bn: 'চলুন দুই মিনিট একসাথে অপেক্ষা করি। এই তাড়নায় কিছু করতে হবে না।',
  },
  askAnxiety: {
    en: 'How strong is your anxiety right now, from 0 to 10?',
    hi: 'Abhi anxiety kitni hai, 0 se 10?',
    ta: 'இப்போது பதட்டம் எவ்வளவு, 0 முதல் 10 வரை?',
    bn: 'এখন উদ্বেগ কতটা, ০ থেকে ১০?',
  },
  askOutcome: {
    en: 'Did you resist it, delay it, or do it?',
    hi: 'Aapne roka, der ki, ya kar liya?',
    ta: 'நீங்கள் தடுத்தீர்களா, தாமதித்தீர்களா, அல்லது செய்தீர்களா?',
    bn: 'আপনি আটকালেন, দেরি করলেন, নাকি করে ফেললেন?',
  },
  noJudgement: {
    en: 'Every answer is okay. Noticing it is already progress.',
    hi: 'Har jawab theek hai. Dhyan dena hi pehla kadam hai.',
    ta: 'எந்த பதிலும் சரிதான். கவனிப்பதே முன்னேற்றம்.',
    bn: 'যেকোনো উত্তরই ঠিক আছে। লক্ষ্য করাটাই অগ্রগতি।',
  },
  reassuranceDecline: {
    en: "I can't be certain for you, and that's the practice. Let's sit with this uncertainty for a little while.",
    hi: 'Main pakka nahi bata sakti, aur yahi practice hai. Is uncertainty ke saath thoda rukte hain.',
    ta: 'நான் உறுதியாகச் சொல்ல முடியாது, அதுதான் பயிற்சி. இந்த நிச்சயமின்மையுடன் சிறிது நேரம் இருப்போம்.',
    bn: 'আমি নিশ্চিত করে বলতে পারব না, এটাই অনুশীলন। এই অনিশ্চয়তার সাথে একটু থাকি।',
  },
  panicStart: {
    en: "I'm right here. You are safe to breathe slowly with me.",
    hi: 'Main yahin hoon. Mere saath dheere-dheere saans lijiye.',
    ta: 'நான் இங்கேயே இருக்கிறேன். என்னுடன் மெதுவாக மூச்சு விடுங்கள்.',
    bn: 'আমি এখানেই আছি। আমার সাথে ধীরে ধীরে শ্বাস নিন।',
  },
  panicBreatheIn: {
    en: 'Breathe in gently.',
    hi: 'Dheere se saans andar lijiye.',
    ta: 'மெதுவாக மூச்சை உள்ளிழுங்கள்.',
    bn: 'আস্তে শ্বাস নিন।',
  },
  panicBreatheOut: {
    en: 'Now breathe out slowly into the mic.',
    hi: 'Ab mic mein dheere bahar chhodiye.',
    ta: 'இப்போது மைக்கில் மெதுவாக வெளியே விடுங்கள்.',
    bn: 'এবার মাইকে ধীরে শ্বাস ছাড়ুন।',
  },
  panicWell: {
    en: 'Good. Your breath is getting longer.',
    hi: 'Bahut achha. Aapki saans lambi ho rahi hai.',
    ta: 'நன்று. உங்கள் மூச்சு நீளமாகிறது.',
    bn: 'খুব ভালো। আপনার শ্বাস লম্বা হচ্ছে।',
  },
  crisis: {
    en: "You are not alone. Please talk to Tele-MANAS on 14416 right now. It's free and open all day and night.",
    hi: 'Aap akele nahi hain. Abhi Tele-MANAS 14416 par baat kijiye. Yeh free hai aur din-raat khula hai.',
    ta: 'நீங்கள் தனியாக இல்லை. இப்போதே டெலி-மனஸ் 14416 இல் பேசுங்கள். இது இலவசம், எப்போதும் திறந்திருக்கும்.',
    bn: 'আপনি একা নন। এখনই টেলি-মানস ১৪৪১৬-এ কথা বলুন। এটি বিনামূল্যে, দিনরাত খোলা।',
  },
  noise: {
    en: "It's a bit noisy. Could you say that once more?",
    hi: 'Thoda shor hai, ek baar phir boliye?',
    ta: 'கொஞ்சம் சத்தமாக உள்ளது. மீண்டும் ஒருமுறை சொல்லுங்கள்?',
    bn: 'একটু শব্দ হচ্ছে, আরেকবার বলবেন?',
  },
  askNumber: {
    en: 'Please say one number from 0 to 10.',
    hi: '0 se 10 mein ek number boliye.',
    ta: '0 முதல் 10 வரை ஒரு எண்ணைச் சொல்லுங்கள்.',
    bn: '০ থেকে ১০-এর মধ্যে একটি সংখ্যা বলুন।',
  },
  confirmIntent: {
    en: 'Did you mean',
    hi: 'Kya aapka matlab tha',
    ta: 'நீங்கள் சொன்னது இதுவா',
    bn: 'আপনি কি বলতে চেয়েছিলেন',
  },
  silence: {
    en: "I'm listening. Speak whenever you're ready.",
    hi: 'Main sun rahi hoon. Jab chahein boliye.',
    ta: 'நான் கேட்கிறேன். தயாரானதும் பேசுங்கள்.',
    bn: 'আমি শুনছি। যখন ইচ্ছে বলুন।',
  },
  familyAlert: {
    en: 'I need you right now. Please call me.',
    hi: 'Mujhe abhi aapki zaroorat hai. Please mujhe call kijiye.',
    ta: 'எனக்கு இப்போது நீங்கள் தேவை. தயவுசெய்து அழையுங்கள்.',
    bn: 'আমার এখনই তোমাকে দরকার। দয়া করে ফোন করো।',
  },
  labelThought: {
    en: "Say it out loud: 'This is the OCD talking.' Then let it pass like a cloud.",
    hi: "Zor se boliye: 'Yeh OCD bol raha hai.' Phir use baadal ki tarah guzarne dijiye.",
    ta: "சத்தமாகச் சொல்லுங்கள்: 'இது OCD பேசுகிறது.' பிறகு மேகம் போல கடந்து போக விடுங்கள்.",
    bn: "জোরে বলুন: 'এটা OCD কথা বলছে।' তারপর মেঘের মতো চলে যেতে দিন।",
  },
  humLonger: {
    en: 'Lovely. Try making the next hum a little longer.',
    hi: 'Bahut sundar. Agli baar thoda lamba gungunaaiye.',
    ta: 'அருமை. அடுத்த முறை கொஞ்சம் நீளமாக ஹம் செய்யுங்கள்.',
    bn: 'চমৎকার। পরেরবার একটু লম্বা গুনগুন করুন।',
  },
  humGood: {
    en: 'That was a long, steady hum. Well done.',
    hi: 'Yeh lamba aur sthir tha. Shabash.',
    ta: 'அது நீண்ட, நிலையான ஹம். நன்று.',
    bn: 'এটা লম্বা আর স্থির ছিল। দারুণ।',
  },
  screeningIntro: {
    en: "I'll read some statements. Answer in your own words: not at all, a little, moderately, a lot, or extremely.",
    hi: 'Main kuch baatein padhungi. Apne shabdon mein jawab dijiye: bilkul nahi, thoda, kuch had tak, kaafi, ya bahut zyada.',
    ta: 'சில வாக்கியங்களைப் படிக்கிறேன். உங்கள் வார்த்தைகளில் பதில் சொல்லுங்கள்: இல்லை, கொஞ்சம், மிதமாக, அதிகம், மிக அதிகம்.',
    bn: 'আমি কিছু কথা পড়ব। নিজের ভাষায় উত্তর দিন: একদম না, একটু, মাঝারি, অনেক, খুব বেশি।',
  },
  notDiagnosis: {
    en: 'This is a screening, not a diagnosis.',
    hi: 'Yeh screening hai, diagnosis nahi.',
    ta: 'இது ஒரு திரையிடல், நோயறிதல் அல்ல.',
    bn: 'এটি স্ক্রিনিং, রোগ নির্ণয় নয়।',
  },
  listening: {
    en: 'Listening…',
    hi: 'Sun rahi hoon…',
    ta: 'கேட்கிறேன்…',
    bn: 'শুনছি…',
  },
  didNotCatch: {
    en: "I didn't catch that. You can also type it.",
    hi: 'Main samajh nahi paayi. Aap likh bhi sakte hain.',
    ta: 'எனக்குப் புரியவில்லை. நீங்கள் தட்டச்சும் செய்யலாம்.',
    bn: 'আমি বুঝতে পারিনি। আপনি লিখেও দিতে পারেন।',
  },
};

export function phrase(key: PhraseKey, lang: AppLang): string {
  return PHRASES[key][lang] ?? PHRASES[key].en;
}
