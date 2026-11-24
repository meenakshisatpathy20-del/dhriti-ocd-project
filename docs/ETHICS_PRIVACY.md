# Ethics, privacy and safety

## Principles

1. **Support, not diagnosis.** Screening results are labelled as such; diagnosis and medication are always for clinicians.
2. **Safety first, on device.** Crisis and emergency detection run before any network call and override every model.
3. **Function over content.** Intrusive thoughts are never treated as dangerousness (a key finding of our OCD-EVAL study).
4. **Minimum data.** Patient data stays on the phone; voice audio is never stored by Dhriti.
5. **Consent for sharing.** Reports reach a professional only after an explicit, per-booking consent; diary text is never shared.
6. **Human-verified professionals.** KYC with council registration and certificate, reviewed by a person.

## Privacy details

- Speech is converted to text by the browser's speech service (on Chrome this may use a cloud service); Dhriti keeps only the text, locally.
- When a language model is configured, the current message and the last few conversation turns are sent to that provider. Use a provider and region compliant with India's **Digital Personal Data Protection Act, 2023**; health data is sensitive personal data.
- Users can export or delete all their data from Profile.
- Quiet mode and a neutral app name support privacy in shared homes.

## Known limitations of this prototype

- Authentication is simplified (device ID, one-time professional key, admin token). A production version needs proper accounts, encryption at rest, audit logs and role-based access.
- Professional verification is manual; integration with the NMC Indian Medical Register and the RCI Central Rehabilitation Register would strengthen it.
- The intent rules and eval sets were written by the project team; clinician labelling and real-world speech data are needed.
- Tamil and Bengali content needs native-speaker review; the Hindi questionnaire wording is not a validated translation.
- The public OCD dataset is synthetic (see ML report); no clinical rule is derived from it.

## Before any real-world pilot

- Institutional ethics committee approval and informed consent.
- A supervising psychiatrist and an escalation protocol.
- Telemedicine Practice Guidelines (2020) compliance for consultations.
- Pre-registered outcomes: Y-BOCS change (≥ 35% = response), urges resisted/delayed, reassurance requests, time to professional care, retention, safety events.
