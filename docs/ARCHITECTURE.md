# Architecture

Dhriti is one TypeScript codebase with three runtimes sharing the same logic in `shared/`:

| Runtime | Where | What runs there |
|---|---|---|
| Web app | `src/` (React + Vite, installable PWA) | Voice capture, mic analysis, all patient features, on-device agent fallback |
| API | `server/` (Express) | Agent endpoint with optional LLM, professional KYC, bookings, chat, admin |
| CLIs | `ml/`, `eval/`, `lab/` | Training pipeline, intent evaluation, Safety Lab |

## Voice layer (`src/lib`, `src/hooks`)

- **Speech-to-text:** Web Speech API (`hi-IN`, `en-IN`, `ta-IN`, `bn-IN`). Interim transcripts shown live. Empty or low-confidence results (confidence < 0.6 when the browser reports it) count as failures; after two, the text box opens. Continuous mode restarts automatically for the hands-free wake phrase.
- **Text-to-speech:** `speechSynthesis` in the user's language; if no voice is installed for Tamil/Bengali, replies are shown as text.
- **Microphone analysis** (`mic.ts`): RMS loudness, autocorrelation pitch (80-400 Hz), noise-floor calibration (3 s), and a sustain tracker. Used for exhale detection in panic mode (loudness > 1.5× floor for ≥ 1 s) and hum detection in Bhramari (voiced pitch sustained ≥ 1.5 s). Recognition pauses while the meter runs because some Android browsers allow one microphone consumer at a time.
- **Text / Wispr Flow fallback:** every voice input has a "Type instead" box that accepts Wispr Flow dictation.

## Agent pipeline (`shared/agent/run.ts`)

1. **Safety screen (on-device, first):** self-harm phrases in 5 language groups → crisis screen; real emergencies (an act or injury: "shook him", "floppy", "took pills") → 108/112. Fears about harming others or others dying never trigger crisis framing.
2. **Hybrid understanding** (`shared/nlp/ensemble.ts`): interpretable multilingual rules decide when confident; a Naive Bayes model (uni+bigrams, trained on OCD-Eval) votes when rules are unsure; the model may escalate to self-harm but never downgrade a crisis. Inside an active reassurance episode (10 min), pleading or "I'll ask someone else" is treated as the same compulsion.
3. **Planner:** an OpenAI-compatible LLM with 8 tools (ERP coach, panic mode, diary, screening, meditation, lesson, booking, exposure scene) when configured; otherwise the deterministic offline planner. Model failure or timeout (12 s) falls back automatically.
4. **Clinical invariants:** reassurance is always declined; urges open the ERP coach; no self-led exposure at care level 4.
5. **Guardrails** on every reply: reassurance phrasing, risk framing of intrusive thoughts (distance, knives, crisis lines), diagnosis claims and medication advice are rewritten.
6. **Actions** returned to the app (`src/hooks/useActions.ts`) navigate, save data or open safety screens.

## Data

- **Patient data** lives only in the browser (`localStorage`): profile, screenings, episodes, diary, ladder, practice, lessons, chat. Export and delete are in Profile.
- **Server data** (`server/data/db.json`): professionals, bookings, messages and reports a patient chose to share. Certificates are stored in `server/uploads/`, served only to the admin.
- **Identity:** patients use a random device ID; professionals get a one-time access key (stored hashed); admin uses `ADMIN_TOKEN`. Production would use proper authentication (see Ethics).

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Status, model configuration, ML artefact version |
| POST | `/api/agent` | `{ text, ctx }` → reply, actions, intent, trace |
| GET | `/api/professionals?careLevel&lang&mode` | Verified professionals eligible for the care level |
| POST | `/api/professionals` | KYC application (multipart: `application` JSON + `document`) |
| GET | `/api/professionals/me` | Portal (header `x-pro-key`) |
| POST | `/api/professionals/me/slots` | Open slots after verification |
| GET | `/api/admin/professionals` | All applications (header `x-admin-token`) |
| GET | `/api/admin/professionals/:id/document` | Certificate |
| POST | `/api/admin/professionals/:id/review` | Verify / reject (note required to reject) |
| POST | `/api/bookings` | Book a slot |
| GET | `/api/bookings?patientId` | Patient's bookings |
| POST | `/api/bookings/:id/status` | Confirm / complete / cancel |
| POST | `/api/bookings/:id/share-report` | Patient shares a summary (`consent: true` required) |
| GET/POST | `/api/bookings/:id/messages` | Patient-professional chat |
