# Dhriti (धृति) · a voice-first OCD companion for India

> *Dhriti* is Sanskrit for steadfast resolve: in the Bhagavad Gita (18.33), the steadiness that holds the mind, the breath and our actions. That is the core skill of OCD treatment: noticing the urge and **not** acting on it.

Dhriti helps people with obsessive-compulsive disorder practise **exposure and response prevention (ERP)** at the exact moment an urge hits, by **talking** in Hindi, Hinglish, English, Tamil or Bengali. It screens with validated instruments, routes people to the right level of care, connects them with **KYC-verified psychiatrists and RCI psychologists**, and is tested in a **Safety Lab** built on our own research benchmark, [OCD-EVAL](https://github.com/meenakshisatpathy20-del/OCD-EVAL).

> **Research prototype.** Dhriti supports care; it does not diagnose or replace a clinician. In crisis in India call **Tele-MANAS 14416** (free, 24x7), or **112** for emergencies.

**Live demo:** https://dhriti-gqgghbcmg4ercacg.koreacentral-01.azurewebsites.net/ · open on a phone in Chrome for voice, motion and cardboard VR. Tip: **Profile → Load demo data** fills four weeks of fictional history.

## Screenshots

| Talk to Dhriti (voice-first home) | Urge coach (ERP) |
|---|---|
| ![Home](docs/screenshots/home.png) | ![Urge coach](docs/screenshots/coach.png) |

**360° exposure practice.** Six furnished, life-size scenes, one for each common OCD theme. Each step of the exposure hierarchy turns your view to the trigger, walks you closer and marks it. Dhriti asks for your anxiety every minute and tells you when it has dropped enough to move on.

| Station washroom, step 2: walk up to the tap | Harm OCD: kitchen knife |
|---|---|
| ![360 step](docs/screenshots/vr-step.png) | ![Knife scene](docs/screenshots/vr-knife.png) |
| **Checking: gas stove** | **Scrupulosity: prayer room** |
| ![Stove scene](docs/screenshots/vr-stove.png) | ![Prayer scene](docs/screenshots/vr-prayer.png) |

| Spoken screening (OCI-R, Y-BOCS, mood) | 14-day progress report for the clinician |
|---|---|
| ![Screening](docs/screenshots/screening.png) | ![Report](docs/screenshots/report.png) |
| **Generative music (works offline)** | **Verified professionals and booking** |
| ![Music](docs/screenshots/music.png) | ![Care](docs/screenshots/care.png) |

**Safety Lab: an open evaluation platform built on our OCD-EVAL benchmark**

| Overview | Leaderboard (any model vs. the published study) |
|---|---|
| ![Lab](docs/screenshots/lab.png) | ![Leaderboard](docs/screenshots/lab-leaderboard.png) |
| **Dhriti's own report, run live in the browser** | **Quick check: grade any single reply** |
| ![Lab Dhriti](docs/screenshots/lab-dhriti.png) | ![Quick check](docs/screenshots/lab-quick.png) |

<p align="center"><img src="docs/screenshots/mobile-home.png" width="230" alt="Home on a phone" /> &nbsp; <img src="docs/screenshots/mobile-panic.png" width="230" alt="Panic SOS on a phone" /></p>
<p align="center"><i>On a phone: home and the Panic SOS breathing screen.</i></p>

## How a person with OCD uses Dhriti

| Moment | What they do | What Dhriti does |
|---|---|---|
| **An urge hits** ("I have to wash again") | Tap the mic and say it, in Hindi, Hinglish, English, Tamil or Bengali | Recognises the compulsion, trigger and fear; starts a 2-minute ERP wait with calm music; asks for anxiety (0-10) by voice; logs the outcome without judgement |
| **"Are you sure it's clean?"** | Asks for reassurance, again and again | Kindly declines every form of reassurance (facts, bargains, guilt, "ask someone else") and points back to the therapist's ERP plan |
| **Panic** | Presses SOS or says "Dhriti, madad" | Calm screen; the mic hears each out-breath and the star dims as breathing slows; one tap calls a trusted person or Tele-MANAS 14416 |
| **Practice** | Opens a 360° scene that matches their OCD (on a phone, in a cardboard viewer, or in a headset) | Walks them step by step towards the trigger and tells them when anxiety has fallen enough to move on; saves each session for the report |
| **Low mood or risk** | Says something like "no point living" | Opens crisis support immediately (Tele-MANAS 14416, 112) and stops the ERP flow |
| **Seeing a professional** | Takes the spoken screening; books a verified psychiatrist or RCI psychologist | Routes to the right care level; shares the 14-day report only with consent; the therapist's ERP plan then guides every reply |


---

## Why voice?

OCD urges and panic strike when hands are wet, busy or shaking. Typing is the one thing people can't do in that moment, but they can speak. People also describe intrusive thoughts more honestly in their mother tongue, and the Y-BOCS was designed as a spoken clinical interview. In Dhriti, voice is the main way in, not an add-on.

## The research: OCD-EVAL ("Knowing vs. Doing")

Dhriti is built on our own benchmark, **[OCD-EVAL](https://github.com/meenakshisatpathy20-del/OCD-EVAL)** ([video walkthrough](https://youtu.be/OeligOh9AaE)), created on 8 November 2026. It asks two questions about AI models: can they **recognise** OCD like a clinician, and do they **behave** the way ERP requires when a person with OCD talks to them?

**Design: content vs. function.** OCD is defined by how a thought works (unwanted, resisted, neutralised), not by what it is about. So each OCD task has a **paired control** with the same frightening words and the opposite right answer. A model that reacts to words instead of meaning must fail one side, and a model can't score well by always refusing or always escalating.

| Part | What it tests | Tasks | Grading |
|---|---|---|---|
| **A · Knowing** | Triage of raw first-session interviews: symptom labels, diagnosis, DSM-5-TR insight, 10 Y-BOCS items, next step | 10 (5 pairs: harm OCD vs. real risk, absent-insight OCD vs. psychosis, "not just right" OCD vs. OCPD, avoidance-hidden vs. mild OCD, scrupulosity vs. GAD) | Code only; validated with 14 wrong answers and trivial strategies (they score 0.20-0.40) |
| **B · Doing** | One companion-app reply when the user's ERP plan says "don't reassure me" | 6 (3 OCD + 3 controls: shaken baby, rusty-bin cut, Mass with flu) | Claude Opus judge answers yes/no per behaviour with a quote; code decides pass/fail. 130/130 agreement with hand labels over 4 rounds |
| **C · Pressure** | The same chats over 5 turns: fact reframe, bargain, guilt, "I'll ask someone else" | 3 × 5 turns | Same judge, every turn |

**Results** (7 models, 3 trials per task; all cases synthetic):

| Model | A · triage strict pass | B · OCD chats | B · controls | C · turns held (of 5) |
|---|---|---|---|---|
| Claude Opus 5.5 | 100% | – (judge) | – | – |
| Claude Haiku 5.5 | 100% | **33%** | 100% | **1.56** |
| Claude Sonnet 5.5 | 97% | 100% | 100% | 4.00 |
| Gemini 3.5-flash-lite | 93% | 100% | 100% | 4.89 |
| Gemini 3.1-flash-lite | 83% | 100% | 100% | 4.78 |
| Gemini 3.6-flash | quota | 100% | 100% | – |
| Gemini 3.8-flash | – | 100% (14 of 18 replies, quota) | 100% | – |

**Findings.** (1) *Knowing is not doing:* Claude Haiku triaged the postpartum harm-OCD interview perfectly, yet in chat told that mother to step away from her baby and asked whether he was safe in all 6 harm-OCD conversations. (2) *Failures follow safety style, not model size:* small Gemini lite models held the line better than Claude Sonnet. (3) Most breaks happen at turn 0, before any pressure: a safety reflex triggered by the words "knife" and "baby".

**How Dhriti uses it.**
- **Design:** each finding became a guardrail. Risk is judged on function, not violent words; the agent recognises the fact, bargain, guilt and proxy tactics; real emergencies still get 108/112 at once.
- **Safety Lab** (`/lab`): an open platform built on the OCD-EVAL scenarios. It lets anyone test a model by API key or copy-paste, compare it with the published study, and export transcripts in OCD-EVAL format to re-grade with the original LLM judge.
- **Honest limits:** the Lab's offline grader matches all 65 of OCD-EVAL's hand-labelled verdicts, but it is a rule-based stand-in for the LLM judge. Dhriti was designed using these scenarios, so its own Lab score (3/3 OCD, 2/3 controls, 5/5 turns) shows it behaves as designed; it is not a blind benchmark result. OCD-EVAL itself has 19 tasks, one author and synthetic English cases. See [lab/RESULTS.md](lab/RESULTS.md) and the OCD-EVAL limitations.

## Features

| Area | What it does | Voice |
|---|---|---|
| **Talk to Dhriti** (AI agent) | Understands what you say and acts: opens the urge coach, panic mode, diary, lessons, booking | Speak in 4 languages + Hinglish; optional hands-free "Dhriti, madad" |
| **Spoken screening** | OCI-R (≥21 = likely OCD), Y-BOCS severity bands, and a mood check (PHQ-2 + the PHQ-9 self-harm item) that raises care for low mood and opens crisis support immediately if needed | Answer in your own words ("kaafi", "more than 8 hours") |
| **Stepped-care routing** | Care levels 1-4: wellbeing → guided self-help → therapist-supported ERP → psychiatrist first | – |
| **Urge coach (ERP)** | Extracts trigger, fear and compulsion; 2-minute waiting rounds with spoken 0-10 anxiety ratings; outcome logged without judgement | "Phir se haath dhone ka mann ho raha hai" |
| **Therapist ERP plan** | The professional writes the patient's ERP plan in the portal; the patient accepts it; Dhriti repeats it word for word during urges and reassurance requests | ✓ |
| **Reassurance guard** | Never answers "are you sure?"; recognises fact / bargain / guilt / proxy pressure; tracks reassurance loops | Fully spoken |
| **Voice panic button** | Calm screen; calibrated microphone hears each exhale and a star dims as breaths lengthen; "Maa ko bulao" opens WhatsApp to a trusted contact | Breath is the input |
| **Exposure ladder** | Build ERP steps by voice ("bus ki seat chhoona, saat"); profile-matched suggestions | ✓ |
| **360° practice** | Six furnished exposure scenes (contamination, checking ×2, harm, symmetry, scrupulosity) with scene sound; a guided camera walks you closer to the trigger step by step; ERP coaching from your anxiety ratings ("stay with it" / "ready for the next step"); look around by drag, phone motion, **cardboard split-screen VR on any phone**, or a WebXR headset; sessions saved to the report | "aage", "bas", anxiety numbers; tap = next step in cardboard |
| **Meditate & music** | Bhramari humming (mic detects voiced pitch and paces you), thought labelling ("yeh OCD bol raha hai"), spoken body scan, generative ambient music assigned per situation | You speak, not just listen |
| **Lessons** | 9 psychoeducation lessons (OCD, the cycle, ERP, reassurance, intrusive thoughts, family, panic, treatment, relapse), read aloud, voice quiz | ✓ |
| **Voice diary & report** | Private spoken diary; 14-day report with Y-BOCS trend, peak-anxiety trend, outcomes; printable PDF; shared only with consent | ✓ |
| **Professional marketplace** | KYC onboarding (council, registration number, qualification, certificate upload); human verification console; booking online/offline; patient-doctor chat; consented report sharing | Chat works with dictation |
| **Safety Lab (OCD-EVAL platform)** | Our OCD-EVAL benchmark as an open evaluation lab: **test any model** with your own API key (OpenAI, Gemini, Groq, OpenRouter, any OpenAI-compatible API; key never stored) raw and behind Dhriti's safety layer; a **guided copy-paste wizard** for any chatbot (6 or 21 replies); **saved, shareable reports**; a **leaderboard** next to the published study; quick single-reply check; exports in OCD-EVAL transcript format | – |
| **Wispr Flow mode** | Every text box is dictation-ready; a global mode switches all input to text boxes for Wispr Flow | See [docs/WISPR_FLOW.md](docs/WISPR_FLOW.md) |
| **Privacy & calm** | Data stays on the device; Quiet mode for shared homes; calm visuals; export / delete all data; works offline (service worker) | – |
| **Warm design** | Doodled cosmos, Tara the star mascot (bobs, blinks, listens, celebrates), orbiting planets round the mic, sound bars, star-burst celebrations, breathing ring; all motion stops in calm mode | – |
| **Chat safety** | Risky messages to a professional show crisis help at once and are flagged urgent in the portal | – |

## The AI/ML pipeline, end to end

```mermaid
flowchart LR
  V[Voice / Wispr Flow / text] --> S[1 · On-device safety screen<br/>self-harm, emergency]
  S --> U[2 · Hybrid NLP<br/>multilingual rules + Naive Bayes]
  U --> A[3 · Agent planner<br/>LLM with tools, or offline planner]
  A --> I[4 · Clinical invariants<br/>no reassurance, urge → ERP, level 4 → psychiatrist]
  I --> G[5 · Guardrails<br/>reassurance, risk framing, diagnosis, medication]
  G --> R[Spoken reply + app actions]
  R --> M[6 · Measurement<br/>OCI-R, Y-BOCS, SUDS, outcomes]
  M --> C[7 · Stepped care<br/>verified professional + consented report]
```

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Research components

| Component | Command | Output |
|---|---|---|
| **ML pipeline** on the public OCD patient dataset (1,500 records): audit → train → cross-validate → export | `npm run ml` | [ml/reports/REPORT.md](ml/reports/REPORT.md) |
| **OCD-Eval (intent)**: does Dhriti understand what people say? 145 labelled utterances (8 intents) in 5 language groups + held-out set, self-harm release gate | `npm run eval` | [eval/RESULTS.md](eval/RESULTS.md) |
| **Safety Lab (OCD-EVAL behaviour)**: Dhriti's agent vs. our OCD-EVAL scenarios, grader validated against hand labels | `npm run lab` | [lab/RESULTS.md](lab/RESULTS.md) |
| **Unit tests** (59) | `npm test` | – |

### Key findings (honest)

1. **The public OCD dataset is synthetic.** Our audit found ~48% of rows exceed the Y-BOCS subscale maximum (20), obsession and compulsion scores are uncorrelated (r = 0.03), and contamination is not linked to washing (χ² p = 0.83). Models trained on it perform at chance. So **clinical decisions in Dhriti come only from validated instruments and published thresholds**; the pipeline is built to be re-run on real, ethically collected data.
2. **Keyword rules do not generalise.** On a held-out set, exact-phrase self-harm recall was 0.25. We added a broad, self-directed soft-risk check-in (held-out safety catch 1.00), then made explicit suicidal statements open crisis support directly (held-out self-harm recall now 1.00, but optimistic because the misses informed the fix), plus an optional language-model layer. A fresh, clinician-labelled held-out set is the next step.
3. **Knowing is not doing.** Our OCD-EVAL study showed models that triage OCD perfectly can still tell a mother with harm OCD to step away from her baby. Dhriti turns those findings into guardrails; in the Safety Lab it passes 3/3 OCD conversations and holds the line for 5/5 turns under pressure, and its offline grader agrees with 100% of OCD-EVAL's 65 hand-labelled verdicts. (Not a blind benchmark: see [lab/RESULTS.md](lab/RESULTS.md).)

## Deploy (recommended for demos)

Dhriti is one Node service (web app + API). The free Render plan is enough.

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New → Blueprint** → pick this repository. Render reads `render.yaml`.
3. Click **Apply**. After about 3-5 minutes you get a public HTTPS link (HTTPS is required for the microphone).
4. In the service's **Environment** tab, copy `ADMIN_TOKEN` (generated for you) for the `/admin` page.
5. Optional: set `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` to connect any OpenAI-compatible model.

Notes: on the free plan the service sleeps after 15 minutes idle (the first visit then takes about 50 seconds), and bookings, chats and uploaded certificates reset on restart (patient data lives on the phone and is unaffected). Open the link once a few minutes before presenting. A `Dockerfile` is included for Railway, Fly.io or Cloud Run.

## Run it locally

Requirements: Node.js 20+ (22 recommended). Chrome on Android or desktop gives the best speech recognition.

```bash
npm install
npm run dev          # web on http://localhost:5173, API on http://localhost:8787
```

Production build:

```bash
npm run build && npm start      # serves the app and API on http://localhost:8787
```

Optional: connect the agent to any OpenAI-compatible chat API by copying `.env.example` to `.env` and setting `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL`. Without them the agent runs fully offline. Admin console: `/admin` (token from `ADMIN_TOKEN`, default `dhriti-admin` for local demos).

### Demo path (5 minutes)

0. Optional: **Profile → Load demo data** fills four weeks of fictional history (Y-BOCS 22 → 14), so charts and reports are not empty.
1. Onboard in Hindi → **Talk to Dhriti**: say *"phir se haath dhone ka mann ho raha hai"* → urge coach opens with trigger/fear/urge → rate anxiety by voice.
2. Say *"pakka saaf hai na?"* twice → reassurance is declined and the loop is detected.
3. **SOS** → breathe out into the mic and watch the star dim.
4. **Screening** → OCI-R + Y-BOCS by voice → care level → **Find a professional** → book → chat → share report.
5. **For professionals** → apply with KYC → **/admin** verify → sign in to the portal and see the shared report.
6. **360° practice** → *Railway station washroom* → Begin → rate anxiety → *Next step* and watch the view walk up to the tap (on a phone: *Cardboard viewer*).
7. **Safety Lab** → *⭐ Dhriti* → *Run again in your browser* → see Dhriti pass the OCD-EVAL scenarios turn by turn; *New evaluation* tests any model with an API key (Groq and Gemini have free tiers).
8. **ML pipeline** → show the data audit and why the models are not used clinically.

## Project structure

```
shared/      clinical instruments, NLP, agent, ML toolkit, lab (used by web, API and CLIs)
src/         React app (pages, voice components, doodle-cosmos design system)
server/      Express API: agent, professionals/KYC, bookings, chat, admin
ml/          dataset, pipeline, generated model and report
eval/        OCD-Eval intent dataset, held-out set, runner and results
lab/         vendored OCD-EVAL scenarios, Safety Lab runner and results
tests/       unit tests
docs/        architecture, clinical basis, ML, evaluation, Wispr Flow, ethics & privacy
```

## Documentation

- **[Full presentation guide (PDF)](docs/Dhriti_Full_Presentation_Guide.pdf)**: 15-20 minute script, explanations, demo runbook, viva Q&A
- [Quick revision guide (PDF)](docs/Dhriti_Quick_Revision_Guide.pdf)
- [Deploy on Azure](docs/DEPLOY_AZURE.md)

- [Architecture](docs/ARCHITECTURE.md)
- [Clinical basis](docs/CLINICAL.md)
- [ML pipeline](docs/ML.md)
- [Evaluation & Safety Lab](docs/EVALUATION.md)
- [Wispr Flow](docs/WISPR_FLOW.md)
- [Ethics, privacy & safety](docs/ETHICS_PRIVACY.md)

## Author

Meenakshi Satpathy · research project on voice-first, ERP-based support for OCD in India.
