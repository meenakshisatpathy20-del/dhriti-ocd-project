/**
 * Psychoeducation lessons. Short, read aloud by Dhriti, each ending with one
 * spoken quiz question. Content follows standard CBT/ERP psychoeducation.
 */

export interface Lesson {
  id: string;
  title: { en: string; hi: string };
  minutes: number;
  summary: { en: string; hi: string };
  sections: { heading: string; body: string }[];
  quiz: { question: string; options: string[]; answer: number; explain: string };
}

export const LESSONS: Lesson[] = [
  {
    id: 'what-is-ocd',
    title: { en: 'What is OCD?', hi: 'OCD kya hai?' },
    minutes: 3,
    summary: {
      en: 'OCD is a common, treatable condition of unwanted thoughts and repeated actions. It is not your fault.',
      hi: 'OCD ek aam aur ilaaj-yogya condition hai jismein anchahe vichaar aur baar-baar kiye jaane waale kaam hote hain. Yeh aapki galti nahi hai.',
    },
    sections: [
      { heading: 'Obsessions', body: 'Obsessions are unwanted thoughts, images or urges that keep coming back and cause anxiety, disgust or doubt. Common themes are germs, harm, things being "just right", and upsetting religious or sexual thoughts.' },
      { heading: 'Compulsions', body: 'Compulsions are actions or mental rituals done to reduce that anxiety: washing, checking, arranging, counting, praying a certain way, or asking others for reassurance.' },
      { heading: 'It is common and treatable', body: "India's National Mental Health Survey (2015-16) found OCD in nearly 1 in 100 adults. OCD is not a personality quirk or a weakness. Exposure and response prevention (ERP) therapy, and medicines prescribed by a psychiatrist, help most people improve." },
    ],
    quiz: {
      question: 'Which of these is a compulsion?',
      options: ['Having a sudden thought about germs', 'Washing hands again to feel less anxious', 'Feeling tired after work'],
      answer: 1,
      explain: 'A compulsion is something you do to reduce the anxiety. The thought itself is the obsession.',
    },
  },
  {
    id: 'ocd-cycle',
    title: { en: 'The OCD cycle', hi: 'OCD ka chakra' },
    minutes: 3,
    summary: {
      en: 'Compulsions bring quick relief, and that relief teaches the brain to repeat the cycle.',
      hi: 'Compulsion turant rahat deta hai, aur wahi rahat dimaag ko yeh chakra dohraana sikhaati hai.',
    },
    sections: [
      { heading: 'Five steps', body: 'Trigger (touching a door handle) → obsession ("I might get sick") → anxiety → compulsion (washing) → short relief. Then the next trigger starts it all again.' },
      { heading: 'Why relief is the trap', body: 'The relief convinces the brain that the compulsion prevented danger. So the next time the anxiety comes faster and the urge feels stronger.' },
      { heading: 'Breaking the cycle', body: 'Recovery means letting the anxiety rise and fall on its own, without the compulsion. Each time you do this, the brain learns that you can cope with uncertainty.' },
    ],
    quiz: {
      question: 'Why do compulsions make OCD stronger over time?',
      options: ['Because the quick relief teaches the brain to repeat them', 'Because they are tiring', 'Because other people notice them'],
      answer: 0,
      explain: 'The relief rewards the compulsion, so the brain keeps asking for it.',
    },
  },
  {
    id: 'erp',
    title: { en: 'How ERP works', hi: 'ERP kaise kaam karta hai' },
    minutes: 4,
    summary: {
      en: 'Exposure and response prevention means facing triggers step by step, without doing the compulsion.',
      hi: 'ERP ka matlab hai dheere-dheere triggers ka saamna karna, compulsion kiye bina.',
    },
    sections: [
      { heading: 'Exposure', body: 'You choose a trigger and face it on purpose, starting with easier ones. You rate your anxiety from 0 to 10 (called SUDS).' },
      { heading: 'Response prevention', body: "You don't do the compulsion. Not washing, not checking, not asking. You let the anxiety be there." },
      { heading: 'The ladder', body: 'List situations from easiest to hardest and climb one step at a time. Dhriti helps you build this ladder by voice and practise each step.' },
      { heading: 'What to expect', body: 'Anxiety usually rises, peaks and then falls by itself. Even when it does not fall much, practising teaches you that you can carry uncertainty and still live your life.' },
    ],
    quiz: {
      question: 'During ERP, what do you do when the urge comes?',
      options: ['Do the compulsion quickly to get it over with', 'Notice the urge and let the anxiety be there without the compulsion', 'Avoid the trigger completely'],
      answer: 1,
      explain: 'Response prevention means staying with the anxiety without the compulsion.',
    },
  },
  {
    id: 'reassurance',
    title: { en: 'The reassurance trap', hi: 'Tasalli ka jaal' },
    minutes: 3,
    summary: {
      en: 'Asking "are you sure?" is also a compulsion. That is why Dhriti will never answer it with certainty.',
      hi: '"Pakka?" poochna bhi ek compulsion hai. Isliye Dhriti kabhi pakka jawab nahi deti.',
    },
    sections: [
      { heading: 'Why asking feels good', body: 'Hearing "yes, it is locked" calms you for a few minutes. But the doubt returns, often stronger, and you need to ask again.' },
      { heading: 'Why Dhriti says "I can\'t be certain"', body: "It is not unkind. It is the treatment. Each time you sit with the doubt instead of asking, OCD loses a little power." },
      { heading: 'For your family', body: 'Family can say: "I love you, and I know this is hard. I won\'t answer that, because it feeds the OCD." Agree on this together, when you are calm.' },
    ],
    quiz: {
      question: 'What is the most helpful reply to "Are you sure my hands are clean?"',
      options: ['"Yes, completely clean, don\'t worry."', '"I can\'t be certain, and you can handle not knowing."', '"Wash them once more to be safe."'],
      answer: 1,
      explain: 'Giving certainty feeds the cycle. Supporting you to tolerate uncertainty weakens it.',
    },
  },
  {
    id: 'thoughts',
    title: { en: 'Intrusive thoughts are not you', hi: 'Ghuspaithiya vichaar aap nahi hain' },
    minutes: 3,
    summary: {
      en: 'Almost everyone has strange or upsetting thoughts. In OCD the problem is how much they feel like they matter.',
      hi: 'Lagbhag sabko ajeeb ya bure vichaar aate hain. OCD mein dikkat yeh hai ki woh bahut zaroori lagte hain.',
    },
    sections: [
      { heading: 'Everyone has them', body: 'Research across many countries found that the large majority of people have unwanted intrusive thoughts. Having a thought does not mean you want it or will act on it.' },
      { heading: 'Thought-action fusion', body: 'OCD tells you that thinking something is as bad as doing it, or makes it more likely. It does not.' },
      { heading: 'Label it', body: 'Say out loud: "This is the OCD talking." Then return to what you were doing. You do not need to argue with the thought or cancel it with a prayer or a good thought.' },
    ],
    quiz: {
      question: 'Does having an upsetting thought mean you want it to happen?',
      options: ['Yes', 'No, thoughts are not wishes or actions'],
      answer: 1,
      explain: 'Thoughts are just thoughts. OCD makes them feel important.',
    },
  },
  {
    id: 'family',
    title: { en: 'Family and OCD', hi: 'Parivaar aur OCD' },
    minutes: 3,
    summary: {
      en: 'Families often get pulled into rituals out of love. Small changes at home make a big difference.',
      hi: 'Parivaar pyaar mein rituals mein shaamil ho jaata hai. Ghar par chhote badlav bada fark laate hain.',
    },
    sections: [
      { heading: 'Accommodation', body: 'Checking the lock for someone, waiting while they wash, or answering the same question again are called family accommodation. They are kind, but they keep OCD going.' },
      { heading: 'Step back together', body: 'Choose one ritual, agree on a plan when everyone is calm, and reduce help gradually. Praise effort, not perfection.' },
      { heading: 'Look after yourselves', body: 'Living with OCD is tiring for everyone. Family members can also speak to the treating professional.' },
    ],
    quiz: {
      question: 'Which of these is family accommodation?',
      options: ['Checking the gas again because your sister asked', 'Going for a walk together', 'Cooking dinner'],
      answer: 0,
      explain: 'Doing a ritual on someone\'s behalf is accommodation.',
    },
  },
  {
    id: 'panic',
    title: { en: 'Panic attacks', hi: 'Panic attack' },
    minutes: 3,
    summary: {
      en: 'Panic attacks are frightening but not dangerous. Slow breathing out helps the body settle.',
      hi: 'Panic attack daraavne hote hain par khatarnaak nahi. Dheere saans chhodna shareer ko shaant karta hai.',
    },
    sections: [
      { heading: 'What happens', body: 'The body\'s alarm system fires: racing heart, fast breathing, dizziness, a feeling of doom. It usually peaks within about ten minutes.' },
      { heading: 'Panic and OCD', body: 'Panic attacks are different from OCD, but they can happen alongside it. If they happen often, tell your doctor.' },
      { heading: 'Longer out-breaths', body: 'Breathing out for longer than you breathe in activates the body\'s calming system. Dhriti\'s panic mode helps you do this by listening to your breath.' },
    ],
    quiz: {
      question: 'Which helps most during a panic attack?',
      options: ['Breathing out slowly, longer than you breathe in', 'Holding your breath as long as possible', 'Running outside'],
      answer: 0,
      explain: 'A long, slow exhale calms the nervous system.',
    },
  },
  {
    id: 'treatment',
    title: { en: 'Getting professional help', hi: 'Professional madad lena' },
    minutes: 3,
    summary: {
      en: 'CBT with ERP and medicines from a psychiatrist are the proven treatments. Dhriti helps you between visits.',
      hi: 'ERP ke saath CBT aur psychiatrist ki dawai saabit ilaaj hain. Dhriti visits ke beech madad karti hai.',
    },
    sections: [
      { heading: 'Who to see', body: 'A psychiatrist (MBBS with MD/DNB/DPM in Psychiatry) can diagnose OCD and prescribe medicine. A clinical psychologist registered with the Rehabilitation Council of India can provide CBT and ERP.' },
      { heading: 'Medicines', body: 'Some medicines help OCD, but only a psychiatrist should start, change or stop them. Dhriti never gives medicine advice.' },
      { heading: 'Free help now', body: 'Tele-MANAS (14416 or 1-800-891-4416) is the Government of India\'s free mental-health helpline, open 24x7 in many Indian languages.' },
    ],
    quiz: {
      question: 'Who should decide about OCD medicines?',
      options: ['A psychiatrist', 'An app', 'A friend who took them'],
      answer: 0,
      explain: 'Only a psychiatrist should start, change or stop medicine.',
    },
  },
  {
    id: 'relapse',
    title: { en: 'Slips and staying well', hi: 'Phisalna aur theek rehna' },
    minutes: 2,
    summary: {
      en: 'A bad day is a slip, not a failure. Keep practising and keep your plan.',
      hi: 'Ek bura din phisalna hai, haar nahi. Practice jaari rakhiye.',
    },
    sections: [
      { heading: 'Slips are normal', body: 'Stress, exams or illness can bring symptoms back for a while. That does not erase your progress.' },
      { heading: 'Your plan', body: 'Know your early signs, keep a few ERP practices in your week, and know who to contact. Dhriti keeps your history so you can see how far you have come.' },
    ],
    quiz: {
      question: 'After a bad day with many compulsions, what is the best next step?',
      options: ['Give up, it is not working', 'Treat it as a slip and do one small practice today', 'Avoid all triggers forever'],
      answer: 1,
      explain: 'Recovery is not a straight line. Getting back to practice is what counts.',
    },
  },
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
