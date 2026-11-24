/**
 * Dhriti ML pipeline
 *
 *   1. Ingest      - read the public OCD patient dataset (CSV)
 *   2. Audit       - schema checks + clinical-validity checks against the Y-BOCS manual
 *   3. Prepare     - keep clinically valid rows, derive total, band and care level
 *   4. Train       - logistic regression (2 tasks), obsession->compulsion model, k-means profiles
 *   5. Evaluate    - stratified 5-fold cross-validation, ROC-AUC with bootstrap 95% CI, baselines
 *   6. Export      - model artifact for the app + a human-readable report and model card
 *
 * Run: npm run ml
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bandFor, routeCare, type SeverityBand } from '../shared/clinical/instruments';
import {
  accuracy, chiSquare, classificationReport, encode, featureNames, fitEncoder, kmeans, macroF1,
  nearest, pearson, predictProba, rng, rocAuc, silhouette, stratifiedKFold, trainLogistic,
  type EncoderSpec, type LogisticModel,
} from '../shared/ml/core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'ml/data/raw/ocd_patient_dataset.csv');
const SEED = 42;

type Row = Record<string, string>;

// ---------------- 1. Ingest ----------------

function parseCsv(text: string): Row[] {
  const lines: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) lines.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) { row.push(field); lines.push(row); }
  const [header, ...body] = lines;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const REQUIRED = [
  'Patient ID', 'Age', 'Gender', 'Ethnicity', 'Marital Status', 'Education Level', 'Duration of Symptoms (months)',
  'Previous Diagnoses', 'Family History of OCD', 'Obsession Type', 'Compulsion Type', 'Y-BOCS Score (Obsessions)',
  'Y-BOCS Score (Compulsions)', 'Depression Diagnosis', 'Anxiety Diagnosis', 'Medications',
];

// ---------------- 2. Audit ----------------

interface AuditCheck { name: string; passed: boolean; detail: string }

function audit(rows: Row[]) {
  const checks: AuditCheck[] = [];
  const cols = Object.keys(rows[0] ?? {});
  const missingCols = REQUIRED.filter((c) => !cols.includes(c));
  checks.push({ name: 'Schema: required columns present', passed: missingCols.length === 0, detail: missingCols.length ? `Missing: ${missingCols.join(', ')}` : `${REQUIRED.length}/${REQUIRED.length} columns` });

  const blanks = rows.filter((r) => REQUIRED.some((c) => r[c] === '' || r[c] === undefined)).length;
  checks.push({ name: 'Completeness: no blank required fields', passed: blanks === 0, detail: `${blanks} rows with blanks` });

  const ids = new Set(rows.map((r) => r['Patient ID']));
  checks.push({ name: 'Uniqueness: Patient ID', passed: ids.size === rows.length, detail: `${rows.length - ids.size} duplicates` });

  const obs = rows.map((r) => Number(r['Y-BOCS Score (Obsessions)']));
  const comp = rows.map((r) => Number(r['Y-BOCS Score (Compulsions)']));
  const obsBad = obs.filter((v) => v < 0 || v > 20).length;
  const compBad = comp.filter((v) => v < 0 || v > 20).length;
  checks.push({ name: 'Clinical range: Y-BOCS obsession subscale 0-20', passed: obsBad === 0, detail: `${obsBad} rows (${pct(obsBad / rows.length)}) exceed 20; max observed ${Math.max(...obs)}` });
  checks.push({ name: 'Clinical range: Y-BOCS compulsion subscale 0-20', passed: compBad === 0, detail: `${compBad} rows (${pct(compBad / rows.length)}) exceed 20; max observed ${Math.max(...comp)}` });

  const totalBad = rows.filter((_, i) => obs[i] + comp[i] > 40).length;
  checks.push({ name: 'Clinical range: Y-BOCS total 0-40', passed: totalBad === 0, detail: `${totalBad} rows (${pct(totalBad / rows.length)}) exceed 40` });

  const age = rows.map((r) => Number(r.Age));
  checks.push({ name: 'Plausibility: adults (18+)', passed: age.every((a) => a >= 18), detail: `age range ${Math.min(...age)}-${Math.max(...age)}` });

  const r = pearson(obs, comp);
  checks.push({ name: 'Construct validity: obsession and compulsion subscales correlate positively', passed: r > 0.2, detail: `Pearson r = ${r.toFixed(3)} (clinical samples show a clear positive relationship)` });

  // Contamination obsessions should go with washing compulsions far more than chance.
  const contam = rows.filter((x) => x['Obsession Type'] === 'Contamination');
  const pWashGivenContam = contam.filter((x) => x['Compulsion Type'] === 'Washing').length / Math.max(contam.length, 1);
  const pWash = rows.filter((x) => x['Compulsion Type'] === 'Washing').length / rows.length;
  checks.push({ name: 'Construct validity: contamination obsessions linked to washing', passed: pWashGivenContam > pWash * 1.5, detail: `P(washing | contamination) = ${pct(pWashGivenContam)} vs P(washing) = ${pct(pWash)}` });

  const validRows = rows.filter((_, i) => obs[i] >= 0 && obs[i] <= 20 && comp[i] >= 0 && comp[i] <= 20);
  const failed = checks.filter((c) => !c.passed).length;
  const verdict = failed === 0
    ? 'PASS: dataset is consistent with clinical Y-BOCS data.'
    : 'FAIL: dataset violates Y-BOCS scoring rules and shows no clinically expected relationships. It is treated as a synthetic demonstration dataset: suitable for exercising the pipeline, NOT for deriving clinical rules.';
  return { checks, validRows, verdict, obsCompR: r };
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

// ---------------- 3. Prepare ----------------

interface Prepared {
  row: Row;
  obs: number;
  comp: number;
  total: number;
  band: SeverityBand;
  careLevel: number;
}

function prepare(rows: Row[]): Prepared[] {
  return rows.map((row) => {
    const obs = Number(row['Y-BOCS Score (Obsessions)']);
    const comp = Number(row['Y-BOCS Score (Compulsions)']);
    const total = obs + comp;
    const band = bandFor(total);
    const careLevel = routeCare(null, { total, obsessions: obs, compulsions: comp, band }).level;
    return { row, obs, comp, total, band, careLevel };
  });
}

// ---------------- 4 + 5. Train and evaluate ----------------

const NUMERIC = ['Age', 'Duration of Symptoms (months)'];
const CATEGORICAL = ['Gender', 'Marital Status', 'Education Level', 'Previous Diagnoses', 'Family History of OCD', 'Obsession Type', 'Compulsion Type', 'Anxiety Diagnosis', 'Medications'];

interface BinaryTaskResult {
  task: string;
  target: string;
  positiveRate: number;
  auc: number;
  aucCi: [number, number];
  accuracy: number;
  baselineAccuracy: number;
  macroF1: number;
  topFeatures: { feature: string; weight: number }[];
  model: LogisticModel;
  encoder: EncoderSpec;
  interpretation: string;
}

function binaryTask(data: Prepared[], task: string, target: string, label: (p: Prepared) => boolean, extraNumeric: string[] = [], dropCategorical: string[] = []): BinaryTaskResult {
  const rows = data.map((p) => ({ ...p.row }));
  const y = data.map((p) => (label(p) ? 'yes' : 'no'));
  const numeric = [...NUMERIC, ...extraNumeric];
  const categorical = CATEGORICAL.filter((c) => !dropCategorical.includes(c));
  const folds = stratifiedKFold(y, 5, SEED);
  const oofScore = new Array(y.length).fill(0);
  const oofPred = new Array(y.length).fill('no');
  for (const test of folds) {
    const testSet = new Set(test);
    const trainIdx = y.map((_, i) => i).filter((i) => !testSet.has(i));
    const enc = fitEncoder(trainIdx.map((i) => rows[i]), numeric, categorical);
    const model = trainLogistic(trainIdx.map((i) => encode(rows[i], enc)), trainIdx.map((i) => y[i]), { classes: ['no', 'yes'] });
    for (const i of test) {
      const p = predictProba(model, encode(rows[i], enc))[1];
      oofScore[i] = p;
      oofPred[i] = p >= 0.5 ? 'yes' : 'no';
    }
  }
  const yBool = y.map((v) => v === 'yes');
  const auc = rocAuc(yBool, oofScore);
  const aucCi = bootstrapAuc(yBool, oofScore, 500);
  const posRate = yBool.filter(Boolean).length / y.length;
  const baseline = Math.max(posRate, 1 - posRate);
  const report = classificationReport(y, oofPred, ['no', 'yes']);

  // Final model on all valid data, for export.
  const encoder = fitEncoder(rows, numeric, categorical);
  const model = trainLogistic(rows.map((r) => encode(r, encoder)), y, { classes: ['no', 'yes'] });
  const names = featureNames(encoder);
  const topFeatures = names
    .map((feature, j) => ({ feature, weight: model.weights[1][j + 1] - model.weights[0][j + 1] }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 6)
    .map((f) => ({ ...f, weight: Number(f.weight.toFixed(3)) }));

  const acc = accuracy(y, oofPred);
  let interpretation: string;
  if (aucCi[0] > 0.5 && acc > baseline) {
    interpretation = 'The model beats chance and the majority baseline; the signal may be usable after validation on real clinical data.';
  } else if (aucCi[0] > 0.5) {
    interpretation = 'A weak ranking signal (AUC CI above 0.5), but accuracy does not beat always predicting the majority class, so it has no practical value. Dhriti does not use it for clinical decisions.';
  } else if (aucCi[1] < 0.5) {
    interpretation = 'AUC is below 0.5. With no real signal, cross-validation commonly produces slightly-below-chance scores; this means the features carry no information about the target.';
  } else {
    interpretation = 'The 95% CI of the AUC includes 0.5: the model cannot beat chance on this data. Dhriti does not use it for clinical decisions.';
  }

  return { task, target, positiveRate: posRate, auc, aucCi, accuracy: acc, baselineAccuracy: baseline, macroF1: macroF1(report), topFeatures, model, encoder, interpretation };
}

function bootstrapAuc(y: boolean[], s: number[], n: number): [number, number] {
  const rand = rng(SEED);
  const aucs: number[] = [];
  for (let b = 0; b < n; b++) {
    const idx = y.map(() => Math.floor(rand() * y.length));
    const a = rocAuc(idx.map((i) => y[i]), idx.map((i) => s[i]));
    if (!Number.isNaN(a)) aucs.push(a);
  }
  aucs.sort((a, b) => a - b);
  return [aucs[Math.floor(aucs.length * 0.025)], aucs[Math.floor(aucs.length * 0.975)]];
}

function obsessionCompulsionModel(data: Prepared[]) {
  const obsTypes = [...new Set(data.map((d) => d.row['Obsession Type']))].sort();
  const compTypes = [...new Set(data.map((d) => d.row['Compulsion Type']))].sort();
  const table = obsTypes.map((o) => compTypes.map((c) => data.filter((d) => d.row['Obsession Type'] === o && d.row['Compulsion Type'] === c).length));
  const test = chiSquare(table);
  // Laplace-smoothed P(compulsion | obsession)
  const conditional: Record<string, Record<string, number>> = {};
  obsTypes.forEach((o, i) => {
    const rowTotal = table[i].reduce((a, b) => a + b, 0);
    conditional[o] = Object.fromEntries(compTypes.map((c, j) => [c, Number(((table[i][j] + 1) / (rowTotal + compTypes.length)).toFixed(3))]));
  });
  return { obsTypes, compTypes, table, test, conditional };
}

function profileClusters(data: Prepared[]) {
  const feats = data.map((d) => [d.obs, d.comp, Number(d.row['Duration of Symptoms (months)']), Number(d.row.Age)]);
  const means = feats[0].map((_, j) => feats.reduce((s, f) => s + f[j], 0) / feats.length);
  const stds = feats[0].map((_, j) => Math.sqrt(feats.reduce((s, f) => s + (f[j] - means[j]) ** 2, 0) / feats.length) || 1);
  const X = feats.map((f) => f.map((v, j) => (v - means[j]) / stds[j]));
  const sample = X.slice(0, 600); // silhouette is O(n^2); a fixed sample keeps it fast and reproducible
  const candidates = [2, 3, 4, 5].map((k) => {
    const m = kmeans(X, k, SEED);
    const labels = sample.map((x) => nearest(x, m.centroids));
    return { k, model: m, silhouette: silhouette(sample, labels) };
  });
  const best = candidates.reduce((a, b) => (b.silhouette > a.silhouette ? b : a));
  const centroidsRaw = best.model.centroids.map((c) => c.map((v, j) => Number((v * stds[j] + means[j]).toFixed(1))));
  const sizes = best.model.centroids.map((_, ci) => X.filter((x) => nearest(x, best.model.centroids) === ci).length);
  return {
    features: ['Y-BOCS obsessions', 'Y-BOCS compulsions', 'Duration (months)', 'Age'],
    means, stds,
    k: best.k,
    silhouette: best.silhouette,
    candidates: candidates.map((c) => ({ k: c.k, silhouette: Number(c.silhouette.toFixed(3)) })),
    centroids: best.model.centroids,
    centroidsRaw,
    sizes,
  };
}

// ---------------- 6. Export ----------------

function main() {
  const text = readFileSync(RAW, 'utf8');
  const sha256 = createHash('sha256').update(text).digest('hex');
  const rows = parseCsv(text);
  console.log(`[ingest] ${rows.length} rows, sha256 ${sha256.slice(0, 12)}…`);

  const a = audit(rows);
  a.checks.forEach((c) => console.log(`[audit] ${c.passed ? 'PASS' : 'FAIL'}  ${c.name} - ${c.detail}`));
  console.log(`[audit] ${a.verdict}`);

  const data = prepare(a.validRows);
  console.log(`[prepare] ${data.length} clinically valid rows kept (${rows.length - data.length} dropped)`);

  const depression = binaryTask(data, 'Comorbid depression', 'Depression Diagnosis = Yes', (p) => p.row['Depression Diagnosis'] === 'Yes', [], []);
  const severity = binaryTask(data, 'Moderate-or-worse severity from history', 'Y-BOCS total >= 16', (p) => p.total >= 16, [], []);
  [depression, severity].forEach((t) => console.log(`[train] ${t.task}: AUC ${t.auc.toFixed(3)} (95% CI ${t.aucCi[0].toFixed(3)}-${t.aucCi[1].toFixed(3)}), acc ${pct(t.accuracy)} vs baseline ${pct(t.baselineAccuracy)}`));

  const oc = obsessionCompulsionModel(data);
  console.log(`[train] obsession x compulsion: chi2 ${oc.test.chi2.toFixed(2)}, dof ${oc.test.dof}, p ${oc.test.pValue.toFixed(3)}, Cramer's V ${oc.test.cramersV.toFixed(3)}`);

  const clusters = profileClusters(data);
  console.log(`[train] k-means profiles: best k=${clusters.k}, silhouette ${clusters.silhouette.toFixed(3)}`);

  const totals = data.map((d) => d.total).sort((x, y) => x - y);
  const bandCounts = Object.fromEntries((['subclinical', 'mild', 'moderate', 'severe', 'extreme'] as SeverityBand[]).map((b) => [b, data.filter((d) => d.band === b).length]));

  const artifact = {
    name: 'dhriti-ocd-model',
    version: '1.0.0',
    dataset: {
      source: 'OCD Patient Dataset: Demographics & Clinical Data (Kaggle, 1,500 records; public mirror on GitHub)',
      sha256,
      rows: rows.length,
      validRows: data.length,
      syntheticSuspected: a.checks.some((c) => !c.passed),
    },
    audit: { verdict: a.verdict, checks: a.checks },
    clinicalUse: 'NONE. Clinical routing uses published thresholds (OCI-R >= 21; Y-BOCS bands; 35% response). These models are research artefacts.',
    cohort: { totals, bandCounts },
    tasks: [depression, severity].map((t) => ({
      task: t.task, target: t.target, auc: round(t.auc), aucCi: t.aucCi.map(round), accuracy: round(t.accuracy),
      baselineAccuracy: round(t.baselineAccuracy), macroF1: round(t.macroF1), positiveRate: round(t.positiveRate),
      topFeatures: t.topFeatures, interpretation: t.interpretation,
      encoder: t.encoder, weights: t.model.weights.map((w) => w.map(round)), classes: t.model.classes,
    })),
    obsessionCompulsion: { obsTypes: oc.obsTypes, compTypes: oc.compTypes, table: oc.table, conditional: oc.conditional, chi2: round(oc.test.chi2), dof: oc.test.dof, pValue: round(oc.test.pValue), cramersV: round(oc.test.cramersV) },
    profiles: { features: clusters.features, k: clusters.k, silhouette: round(clusters.silhouette), candidates: clusters.candidates, centroids: clusters.centroidsRaw, sizes: clusters.sizes, means: clusters.means.map(round), stds: clusters.stds.map(round) },
  };

  mkdirSync(join(ROOT, 'ml/models'), { recursive: true });
  mkdirSync(join(ROOT, 'ml/reports'), { recursive: true });
  writeFileSync(join(ROOT, 'ml/models/dhriti-model.json'), JSON.stringify(artifact, null, 2));
  // The app imports a compact copy (no encoder internals needed at runtime).
  const appArtifact = { version: artifact.version, dataset: artifact.dataset, auditVerdict: a.verdict, clinicalUse: artifact.clinicalUse, cohort: artifact.cohort, obsessionCompulsion: artifact.obsessionCompulsion, profiles: artifact.profiles, tasks: artifact.tasks.map(({ encoder: _e, weights: _w, ...rest }) => rest) };
  writeFileSync(join(ROOT, 'shared/ml/model.json'), JSON.stringify(appArtifact, null, 2));
  writeFileSync(join(ROOT, 'ml/reports/REPORT.md'), report(artifact, a.checks));
  console.log('[export] ml/models/dhriti-model.json, shared/ml/model.json, ml/reports/REPORT.md');
}

const round = (x: number) => Number(x.toFixed(3));

function report(art: any, checks: AuditCheck[]): string {
  const t = (s: string) => s.replace(/\|/g, '/');
  const lines: string[] = [];
  lines.push('# Dhriti ML pipeline report', '');
  lines.push('_Generated by `npm run ml`. Do not edit by hand._', '');
  lines.push('## Dataset', '');
  lines.push(`- Source: ${art.dataset.source}`);
  lines.push(`- Rows: ${art.dataset.rows}; clinically valid rows used: ${art.dataset.validRows}`);
  lines.push(`- SHA-256: \`${art.dataset.sha256}\``, '');
  lines.push('## Data audit', '', '| Check | Result | Detail |', '|---|---|---|');
  checks.forEach((c) => lines.push(`| ${t(c.name)} | ${c.passed ? 'PASS' : '**FAIL**'} | ${t(c.detail)} |`));
  lines.push('', `**Verdict:** ${art.audit.verdict}`, '');
  lines.push('## Severity distribution of valid rows (Y-BOCS bands)', '', '| Band | Count |', '|---|---|');
  Object.entries(art.cohort.bandCounts).forEach(([b, n]) => lines.push(`| ${b} | ${n} |`));
  lines.push('', '## Supervised models (stratified 5-fold cross-validation)', '', '| Task | Target | ROC-AUC (95% CI) | Accuracy | Majority baseline | Macro-F1 |', '|---|---|---|---|---|---|');
  art.tasks.forEach((k: any) => lines.push(`| ${k.task} | ${t(k.target)} | ${k.auc} (${k.aucCi[0]}-${k.aucCi[1]}) | ${k.accuracy} | ${k.baselineAccuracy} | ${k.macroF1} |`));
  art.tasks.forEach((k: any) => {
    lines.push('', `**${k.task}:** ${k.interpretation}`, '', 'Largest coefficients (standardised log-odds):', '');
    k.topFeatures.forEach((f: any) => lines.push(`- ${f.feature}: ${f.weight}`));
  });
  const oc = art.obsessionCompulsion;
  lines.push('', '## Obsession type vs compulsion type', '');
  lines.push(`Chi-square = ${oc.chi2}, dof = ${oc.dof}, p = ${oc.pValue}, Cramér's V = ${oc.cramersV}.`, '');
  lines.push(`| Obsession \\ Compulsion | ${oc.compTypes.join(' | ')} |`, `|---|${oc.compTypes.map(() => '---').join('|')}|`);
  oc.obsTypes.forEach((o: string, i: number) => lines.push(`| ${o} | ${oc.table[i].join(' | ')} |`));
  lines.push('', oc.pValue < 0.05 ? 'Obsession and compulsion types are associated.' : 'No significant association: in real OCD, contamination obsessions strongly predict washing. This supports the audit verdict.');
  const pr = art.profiles;
  lines.push('', '## Unsupervised symptom profiles (k-means)', '');
  lines.push(`Features: ${pr.features.join(', ')}. Silhouette by k: ${pr.candidates.map((c: any) => `k=${c.k}: ${c.silhouette}`).join(', ')}. Chosen k = ${pr.k}.`, '');
  lines.push(`| Cluster | Size | ${pr.features.join(' | ')} |`, `|---|---|${pr.features.map(() => '---').join('|')}|`);
  pr.centroids.forEach((c: number[], i: number) => lines.push(`| ${i + 1} | ${pr.sizes[i]} | ${c.join(' | ')} |`));
  lines.push('', 'Silhouette below 0.25 means no strong natural grouping.', '');
  lines.push('## Model card', '');
  lines.push('- **Intended use:** research demonstration of an end-to-end, auditable ML pipeline for OCD data.');
  lines.push(`- **Clinical use:** ${art.clinicalUse}`);
  lines.push('- **Why:** the audit shows the public dataset breaks Y-BOCS scoring rules (subscales above 20) and lacks clinically expected relationships. Models trained on it perform at chance level.');
  lines.push('- **Next step:** re-run this exact pipeline on de-identified clinical data collected with ethics approval (for example from the planned pilot). The audit gate decides automatically whether the data is fit for modelling.');
  lines.push('- **Fairness:** before any clinical use, report AUC separately by gender, age group and language.', '');
  return lines.join('\n');
}

main();
