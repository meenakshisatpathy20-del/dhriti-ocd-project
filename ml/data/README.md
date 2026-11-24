# Data

## `raw/ocd_patient_dataset.csv`

- **Name:** OCD Patient Dataset: Demographics & Clinical Data
- **Original source:** Kaggle (uploaded by user "ohinhaque"); copy obtained from a public GitHub mirror
  (`Raghu99484/ocd-patient-dataset`).
- **Size:** 1,500 rows, 17 columns (demographics, symptom duration, obsession and compulsion type,
  Y-BOCS obsession and compulsion scores, depression/anxiety diagnosis, medication).
- **SHA-256:** `dc6bd23c61f1e3ae2c57ddd7e4c408b7e2805b260ef0f44c35e590644ea6d2c5`
- **Licence:** check the original Kaggle page before any redistribution beyond academic use.

### Important: data quality

Our audit (`npm run ml`, see `ml/reports/REPORT.md`) shows this dataset is **synthetic and not
clinically valid**:

- about 48% of rows have Y-BOCS subscale scores above 20 (the real maximum is 20 per subscale, 40 total);
- obsession and compulsion scores are uncorrelated (r = 0.03), whereas they correlate in clinical data;
- contamination obsessions are not linked to washing compulsions (chi-square p = 0.83).

We therefore use it only to build and test an auditable ML pipeline. All clinical rules in Dhriti come
from published, validated instruments (OCI-R, Y-BOCS) and consensus definitions.
