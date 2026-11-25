/**
 * Published results of the OCD-EVAL study ("Knowing vs. Doing", 8 Nov 2026),
 * transcribed from the study's README / results/summary.md. Source:
 * https://github.com/meenakshisatpathy20-del/OCD-EVAL
 */
export const STUDY = {
  title: 'Knowing vs. Doing: an OCD eval for AI models',
  url: 'https://github.com/meenakshisatpathy20-del/OCD-EVAL',
  video: 'https://youtu.be/OeligOh9AaE',
  headline:
    'Models know OCD: they triage clinical interviews almost perfectly. But when a person with OCD asks them for reassurance, some do what an OCD specialist would not: reassure, encourage avoidance, or treat an intrusive thought as danger. The failures follow safety style, not model size.',
  partA: [
    { model: 'Claude Opus 5.5', strict: 1.0 },
    { model: 'Claude Haiku 5.5', strict: 1.0 },
    { model: 'Claude Sonnet 5.5', strict: 0.97 },
    { model: 'Gemini 3.5-flash-lite', strict: 0.93 },
    { model: 'Gemini 3.1-flash-lite', strict: 0.83 },
  ],
  partB: [
    { model: 'Claude Haiku 5.5', ocd: 0.33, controls: 1.0 },
    { model: 'Claude Sonnet 5.5', ocd: 1.0, controls: 1.0 },
    { model: 'Gemini 3.6-flash', ocd: 1.0, controls: 1.0 },
    { model: 'Gemini 3.5-flash-lite', ocd: 1.0, controls: 1.0 },
    { model: 'Gemini 3.1-flash-lite', ocd: 1.0, controls: 1.0 },
    { model: 'Gemini 3.8-flash (partial)', ocd: 1.0, controls: 1.0 },
  ],
  partC: [
    { model: 'Claude Haiku 5.5', turnsHeld: 1.56 },
    { model: 'Claude Sonnet 5.5', turnsHeld: 4.0 },
    { model: 'Gemini 3.1-flash-lite', turnsHeld: 4.78 },
    { model: 'Gemini 3.5-flash-lite', turnsHeld: 4.89 },
  ],
  lessons: [
    { finding: 'Safety reflexes treat harm-OCD intrusive thoughts as danger ("step away from the baby", crisis lines).', inDhriti: 'Risk is judged on function (an act or injury), not violent words. A risk-framing guardrail strips distance, knife and crisis-line advice from replies to intrusive thoughts.' },
    { finding: 'A "fact" or statistic is reassurance in another form.', inDhriti: 'The agent recognises fact, bargain, guilt and proxy tactics and keeps declining, warmly, with no compromise version.' },
    { finding: 'Models send the question to someone else (priest, partner).', inDhriti: 'Proxy replies suggest asking for company, never for the answer; scrupulosity replies route the urge to the therapist only.' },
    { finding: 'A model that refuses everything would pass the OCD tasks.', inDhriti: 'Paired controls: real emergencies get 108/112 at once, injuries get practical medical advice.' },
  ],
};
