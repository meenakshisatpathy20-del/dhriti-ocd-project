/**
 * Small, dependency-free ML toolkit used by the training pipeline and the app.
 * Everything is deterministic given a seed, so results are reproducible.
 */

/** Mulberry32 seeded PRNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Stratified k-fold indices. */
export function stratifiedKFold(labels: (string | number)[], k: number, seed = 42): number[][] {
  const rand = rng(seed);
  const byClass = new Map<string | number, number[]>();
  labels.forEach((l, i) => byClass.set(l, [...(byClass.get(l) ?? []), i]));
  const folds: number[][] = Array.from({ length: k }, () => []);
  for (const idx of byClass.values()) {
    shuffle(idx, rand).forEach((i, n) => folds[n % k].push(i));
  }
  return folds;
}

// ---------- Feature encoding ----------

export interface EncoderSpec {
  numeric: string[];
  categorical: Record<string, string[]>;
  means: Record<string, number>;
  stds: Record<string, number>;
}

export function fitEncoder(rows: Record<string, string | number>[], numeric: string[], categorical: string[]): EncoderSpec {
  const means: Record<string, number> = {};
  const stds: Record<string, number> = {};
  for (const col of numeric) {
    const v = rows.map((r) => Number(r[col]));
    const m = v.reduce((s, x) => s + x, 0) / v.length;
    const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length) || 1;
    means[col] = m;
    stds[col] = sd;
  }
  const cats: Record<string, string[]> = {};
  for (const col of categorical) {
    cats[col] = [...new Set(rows.map((r) => String(r[col])))].sort();
  }
  return { numeric, categorical: cats, means, stds };
}

export function featureNames(spec: EncoderSpec): string[] {
  const names = [...spec.numeric];
  for (const [col, levels] of Object.entries(spec.categorical)) {
    // Drop the first level (reference category) to avoid collinearity.
    levels.slice(1).forEach((lv) => names.push(`${col}=${lv}`));
  }
  return names;
}

export function encode(row: Record<string, string | number>, spec: EncoderSpec): number[] {
  const x: number[] = spec.numeric.map((c) => (Number(row[c]) - spec.means[c]) / spec.stds[c]);
  for (const [col, levels] of Object.entries(spec.categorical)) {
    levels.slice(1).forEach((lv) => x.push(String(row[col]) === lv ? 1 : 0));
  }
  return x;
}

// ---------- Logistic regression ----------

export interface LogisticModel {
  classes: string[];
  /** weights[c] = [bias, w1, w2, ...] for class c (softmax). */
  weights: number[][];
}

export function softmax(z: number[]): number[] {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

/** Multinomial logistic regression with L2 regularisation, trained by full-batch gradient descent. */
export function trainLogistic(
  X: number[][],
  y: string[],
  opts: { lr?: number; epochs?: number; l2?: number; classes?: string[] } = {},
): LogisticModel {
  const { lr = 0.3, epochs = 400, l2 = 0.01 } = opts;
  const classes = opts.classes ?? [...new Set(y)].sort();
  const d = X[0].length;
  const W = classes.map(() => new Array(d + 1).fill(0));
  const n = X.length;
  for (let ep = 0; ep < epochs; ep++) {
    const grad = classes.map(() => new Array(d + 1).fill(0));
    for (let i = 0; i < n; i++) {
      const p = softmax(W.map((w) => w[0] + dot(w, X[i], 1)));
      for (let c = 0; c < classes.length; c++) {
        const err = p[c] - (y[i] === classes[c] ? 1 : 0);
        grad[c][0] += err;
        for (let j = 0; j < d; j++) grad[c][j + 1] += err * X[i][j];
      }
    }
    for (let c = 0; c < classes.length; c++) {
      for (let j = 0; j <= d; j++) {
        const reg = j === 0 ? 0 : l2 * W[c][j];
        W[c][j] -= lr * (grad[c][j] / n + reg);
      }
    }
  }
  return { classes, weights: W };
}

function dot(w: number[], x: number[], offset: number): number {
  let s = 0;
  for (let j = 0; j < x.length; j++) s += w[j + offset] * x[j];
  return s;
}

export function predictProba(model: LogisticModel, x: number[]): number[] {
  return softmax(model.weights.map((w) => w[0] + dot(w, x, 1)));
}

export function predict(model: LogisticModel, x: number[]): string {
  const p = predictProba(model, x);
  return model.classes[p.indexOf(Math.max(...p))];
}

// ---------- Metrics ----------

export function accuracy(yTrue: string[], yPred: string[]): number {
  return yTrue.filter((t, i) => t === yPred[i]).length / yTrue.length;
}

export interface ClassReport {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export function classificationReport(yTrue: string[], yPred: string[], classes: string[]): Record<string, ClassReport> {
  const out: Record<string, ClassReport> = {};
  for (const c of classes) {
    const tp = yTrue.filter((t, i) => t === c && yPred[i] === c).length;
    const fp = yTrue.filter((t, i) => t !== c && yPred[i] === c).length;
    const fn = yTrue.filter((t, i) => t === c && yPred[i] !== c).length;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    out[c] = { precision, recall, f1, support: tp + fn };
  }
  return out;
}

export function macroF1(report: Record<string, ClassReport>): number {
  const v = Object.values(report).filter((r) => r.support > 0);
  return v.reduce((s, r) => s + r.f1, 0) / Math.max(v.length, 1);
}

export function confusionMatrix(yTrue: string[], yPred: string[], classes: string[]): number[][] {
  const m = classes.map(() => classes.map(() => 0));
  yTrue.forEach((t, i) => {
    const a = classes.indexOf(t);
    const b = classes.indexOf(yPred[i]);
    if (a >= 0 && b >= 0) m[a][b]++;
  });
  return m;
}

/** Area under the ROC curve via the rank-sum (Mann-Whitney U) formulation. */
export function rocAuc(yTrue: boolean[], scores: number[]): number {
  const pairs = scores.map((s, i) => ({ s, y: yTrue[i] })).sort((a, b) => a.s - b.s);
  let rankSum = 0;
  let i = 0;
  while (i < pairs.length) {
    let j = i;
    while (j + 1 < pairs.length && pairs[j + 1].s === pairs[i].s) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) if (pairs[k].y) rankSum += avgRank;
    i = j + 1;
  }
  const nPos = yTrue.filter(Boolean).length;
  const nNeg = yTrue.length - nPos;
  if (nPos === 0 || nNeg === 0) return NaN;
  return (rankSum - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

export function pearson(a: number[], b: number[]): number {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

// ---------- Contingency analysis ----------

export interface ChiSquare {
  chi2: number;
  dof: number;
  pValue: number;
  cramersV: number;
}

export function chiSquare(table: number[][]): ChiSquare {
  const rows = table.length;
  const cols = table[0].length;
  const rowSums = table.map((r) => r.reduce((a, b) => a + b, 0));
  const colSums = table[0].map((_, j) => table.reduce((s, r) => s + r[j], 0));
  const n = rowSums.reduce((a, b) => a + b, 0);
  let chi2 = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const e = (rowSums[i] * colSums[j]) / n;
      if (e > 0) chi2 += (table[i][j] - e) ** 2 / e;
    }
  }
  const dof = (rows - 1) * (cols - 1);
  return { chi2, dof, pValue: 1 - chiSquareCdf(chi2, dof), cramersV: Math.sqrt(chi2 / (n * Math.min(rows - 1, cols - 1))) };
}

/** Regularised lower incomplete gamma P(k/2, x/2), via series expansion. */
function chiSquareCdf(x: number, k: number): number {
  if (x <= 0) return 0;
  const s = k / 2;
  const z = x / 2;
  let sum = 1 / s;
  let term = 1 / s;
  for (let n = 1; n < 500; n++) {
    term *= z / (s + n);
    sum += term;
    if (term < sum * 1e-12) break;
  }
  return Math.min(1, Math.exp(-z + s * Math.log(z) - logGamma(s)) * sum);
}

function logGamma(z: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// ---------- K-means ----------

export interface KMeansModel {
  centroids: number[][];
  inertia: number;
}

export function kmeans(X: number[][], k: number, seed = 7, iters = 100): KMeansModel {
  const rand = rng(seed);
  // k-means++ initialisation
  const centroids: number[][] = [X[Math.floor(rand() * X.length)].slice()];
  while (centroids.length < k) {
    const d2 = X.map((x) => Math.min(...centroids.map((c) => sqDist(x, c))));
    const total = d2.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let idx = 0;
    while (r > d2[idx] && idx < X.length - 1) r -= d2[idx++];
    centroids.push(X[idx].slice());
  }
  let assign = new Array(X.length).fill(-1);
  for (let it = 0; it < iters; it++) {
    const next = X.map((x) => nearest(x, centroids));
    const changed = next.some((a, i) => a !== assign[i]);
    assign = next;
    for (let c = 0; c < k; c++) {
      const members = X.filter((_, i) => assign[i] === c);
      if (members.length) centroids[c] = members[0].map((_, j) => members.reduce((s, m) => s + m[j], 0) / members.length);
    }
    if (!changed) break;
  }
  const inertia = X.reduce((s, x, i) => s + sqDist(x, centroids[assign[i]]), 0);
  return { centroids, inertia };
}

export function nearest(x: number[], centroids: number[][]): number {
  let best = 0;
  let bestD = Infinity;
  centroids.forEach((c, i) => {
    const d = sqDist(x, c);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function sqDist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s;
}

/** Mean silhouette score (quality of a clustering, -1 to 1). */
export function silhouette(X: number[][], labels: number[]): number {
  const n = X.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const own = labels[i];
    const dists = new Map<number, { sum: number; n: number }>();
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = Math.sqrt(sqDist(X[i], X[j]));
      const e = dists.get(labels[j]) ?? { sum: 0, n: 0 };
      e.sum += d;
      e.n++;
      dists.set(labels[j], e);
    }
    const a = dists.get(own) ? dists.get(own)!.sum / dists.get(own)!.n : 0;
    let b = Infinity;
    for (const [c, e] of dists) if (c !== own) b = Math.min(b, e.sum / e.n);
    total += b === Infinity ? 0 : (b - a) / Math.max(a, b);
  }
  return total / n;
}

// ---------- Multinomial Naive Bayes for text ----------

export interface NaiveBayesModel {
  classes: string[];
  logPrior: Record<string, number>;
  logLik: Record<string, Record<string, number>>;
  unknown: Record<string, number>;
}

export function ngrams(toks: string[]): string[] {
  const out = toks.slice();
  for (let i = 0; i + 1 < toks.length; i++) out.push(`${toks[i]}_${toks[i + 1]}`);
  return out;
}

export function trainNaiveBayes(docs: string[][], labels: string[], alpha = 0.5): NaiveBayesModel {
  const classes = [...new Set(labels)].sort();
  const vocab = new Set<string>();
  docs.forEach((d) => ngrams(d).forEach((t) => vocab.add(t)));
  const V = vocab.size;
  const logPrior: Record<string, number> = {};
  const logLik: Record<string, Record<string, number>> = {};
  const unknown: Record<string, number> = {};
  for (const c of classes) {
    const cd = docs.filter((_, i) => labels[i] === c);
    logPrior[c] = Math.log(cd.length / docs.length);
    const counts = new Map<string, number>();
    let total = 0;
    cd.forEach((d) => ngrams(d).forEach((t) => {
      counts.set(t, (counts.get(t) ?? 0) + 1);
      total++;
    }));
    logLik[c] = {};
    for (const [t, n] of counts) logLik[c][t] = Math.log((n + alpha) / (total + alpha * V));
    unknown[c] = Math.log(alpha / (total + alpha * V));
  }
  return { classes, logPrior, logLik, unknown };
}

export function nbPredictProba(model: NaiveBayesModel, toks: string[]): Record<string, number> {
  const grams = ngrams(toks);
  const scores = model.classes.map((c) => model.logPrior[c] + grams.reduce((s, t) => s + (model.logLik[c][t] ?? model.unknown[c]), 0));
  const p = softmax(scores);
  return Object.fromEntries(model.classes.map((c, i) => [c, p[i]]));
}
