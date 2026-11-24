# OCD-EVAL scenarios (vendored)

These files are copied unchanged from the project's companion research repository
[OCD-EVAL: "Knowing vs. Doing", an OCD eval for AI models](https://github.com/meenakshisatpathy20-del/OCD-EVAL)
(commit in `SOURCE_COMMIT`).

- `tasks_chat/`: Part B, single-reply companion conversations (3 OCD tasks + 3 paired controls)
- `tasks_multi/`: Part C, five-turn reassurance-pressure conversations (fact, bargain, guilt, proxy)
- `reference/`: hand-labelled replies used to validate graders
- `results/summary.md`: the published results of the original study

Dhriti uses them in its **Safety Lab** (`npm run lab`, and the Lab page in the app) to test its own
AI agent against the same scenarios. All cases are synthetic. Research use only.
