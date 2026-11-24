# ML pipeline

`npm run ml` runs `ml/pipeline.ts` end to end in about one second, deterministically (seed 42).

| Stage | What happens |
|---|---|
| 1 Ingest | Reads `ml/data/raw/ocd_patient_dataset.csv` (1,500 rows, SHA-256 recorded) |
| 2 Audit | Schema, completeness, uniqueness, Y-BOCS range rules (subscales 0-20, total 0-40), plausibility, and two construct-validity checks (obsession-compulsion correlation; contamination → washing) |
| 3 Prepare | Keeps clinically valid rows; derives total, severity band and care level using the same code as the app |
| 4 Train | Multinomial logistic regression (L2, gradient descent) for two tasks; obsession × compulsion conditional model; k-means profiles (k chosen by silhouette) |
| 5 Evaluate | Stratified 5-fold CV, out-of-fold ROC-AUC with bootstrap 95% CI, accuracy vs. majority baseline, macro-F1, χ² and Cramér's V |
| 6 Export | `ml/models/dhriti-model.json` (full artefact), `shared/ml/model.json` (app copy), `ml/reports/REPORT.md` (report + model card) |

All maths is implemented in `shared/ml/core.ts` (no external ML library), so every step can be read and explained.

## Results and interpretation

See [ml/reports/REPORT.md](../ml/reports/REPORT.md). In short, the dataset fails the audit (it is synthetic), and the models do not beat chance or the majority baseline. **That is the expected, correct outcome** and the reason Dhriti uses published clinical thresholds for every decision. The pipeline's value is that it is auditable and reusable: re-run it on de-identified pilot data, and the audit gate decides automatically whether the data is fit for modelling.

## Where ML is used in the product

| Model | Trained on | Used for |
|---|---|---|
| Naive Bayes intent model | OCD-Eval utterances (`eval/dataset.ts`) | Second opinion when rules are unsure; can escalate to self-harm, never downgrade |
| Cohort distribution | Valid dataset rows | A research-demo comparison on the screening result, clearly labelled as not clinical |
| Obsession × compulsion table, k-means profiles | Valid dataset rows | Shown on the ML page; not used for decisions because the audit failed |
