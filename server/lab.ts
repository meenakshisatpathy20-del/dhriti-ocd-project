import { Router, type Request, type Response } from 'express';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { NaiveBayesModel } from '../shared/ml/core';
import { runLab } from '../shared/lab/simulate';
import { runRawModel } from '../shared/lab/raw';
import { gradeSubmission, validateSubmission, type Submission } from '../shared/lab/submit';
import { db, newId, save, type LabRun } from './db';
import { openAiCompatible } from './llm';

/**
 * Safety Lab API: an evaluation platform built on OCD-EVAL.
 *  POST /api/lab/evaluate   run any OpenAI-compatible model with the user's own key (background job)
 *  GET  /api/lab/jobs/:id   job progress
 *  POST /api/lab/runs       save a manual (copy-paste) evaluation; graded on the server
 *  GET  /api/lab/runs       leaderboard / history
 *  GET  /api/lab/runs/:id   full report
 * API keys are used for the run only and never stored or logged.
 */

interface Job { id: string; status: 'running' | 'done' | 'error'; done: number; total: number; runIds: string[]; error?: string; startedAt: number }
const jobs = new Map<string, Job>();
const MAX_CONCURRENT = 2;
const MAX_RUNS = 500;

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];
function isPrivate(ip: string): boolean {
  if (isIP(ip) === 4) return PRIVATE_V4.some((r) => r.test(ip));
  const v6 = ip.toLowerCase();
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80') || v6.startsWith('::ffff:127.') || v6.startsWith('::ffff:10.') || v6.startsWith('::ffff:192.168.');
}

/** Only public HTTPS endpoints may be called with a user's key (prevents the server being used to reach internal addresses). */
async function checkEndpoint(raw: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return 'Base URL is not a valid URL';
  }
  const allowLocal = process.env.LAB_ALLOW_PRIVATE === '1';
  if (u.protocol !== 'https:' && !(allowLocal && u.protocol === 'http:')) return 'Base URL must start with https://';
  if (allowLocal) return null;
  if (u.hostname === 'localhost' || u.hostname.endsWith('.internal') || u.hostname.endsWith('.local')) return 'Private addresses are not allowed';
  try {
    const addrs = await lookup(u.hostname, { all: true });
    if (addrs.some((a) => isPrivate(a.address))) return 'Private addresses are not allowed';
  } catch {
    return 'Could not resolve the base URL host';
  }
  return null;
}

const clean = (s: unknown, n: number) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const summaryOf = (r: LabRun) => ({ id: r.id, name: r.name, method: r.method, model: r.model, provider: r.provider, createdAt: r.createdAt, summary: r.summary });

function store(run: Omit<LabRun, 'id' | 'createdAt'>): string {
  const rec: LabRun = { ...run, id: newId(), createdAt: new Date().toISOString() };
  const data = db();
  data.labRuns.unshift(rec);
  data.labRuns = data.labRuns.slice(0, MAX_RUNS);
  save();
  return rec.id;
}

export function labRouter(nb: NaiveBayesModel): Router {
  const r = Router();

  r.post('/evaluate', async (req: Request, res: Response) => {
    const { baseUrl, apiKey, model, name, alsoDhriti } = req.body ?? {};
    const m = clean(model, 120);
    if (!baseUrl || !apiKey || !m) return res.status(400).json({ error: 'Base URL, API key and model are required' });
    const problem = await checkEndpoint(String(baseUrl));
    if (problem) return res.status(400).json({ error: problem });
    if ([...jobs.values()].filter((j) => j.status === 'running').length >= MAX_CONCURRENT) return res.status(429).json({ error: 'The lab is busy with other evaluations. Please try again in a minute.' });

    const fn = openAiCompatible(String(baseUrl), String(apiKey), m, 60_000, 4);
    // Quick connectivity check (no retries) so bad keys fail fast instead of 21 times.
    try {
      await openAiCompatible(String(baseUrl), String(apiKey), m, 30_000, 1)('Reply with OK.', [{ role: 'user', content: 'ping' }], []);
    } catch (e) {
      return res.status(400).json({ error: `Could not reach the model: ${(e as Error).message}` });
    }
    const provider = new URL(String(baseUrl)).hostname;
    const label = clean(name, 60) || m;
    const job: Job = { id: newId(), status: 'running', done: 0, total: alsoDhriti ? 42 : 21, runIds: [], startedAt: Date.now() };
    jobs.set(job.id, job);
    res.status(202).json({ jobId: job.id, total: job.total });

    (async () => {
      try {
        const raw = await runRawModel(fn, m, () => job.done++);
        job.runIds.push(store({ name: label, method: 'api', model: m, provider, summary: raw.summary, report: raw }));
        if (alsoDhriti) {
          const guarded = await runLab({ nb, model: fn, onStep: () => job.done++ });
          job.runIds.push(store({ name: `${label} + Dhriti safety layer`, method: 'api+dhriti', model: m, provider, summary: guarded.summary, report: guarded }));
        }
        job.status = 'done';
      } catch (e) {
        job.status = 'error';
        job.error = (e as Error).message.slice(0, 300);
      }
    })();
  });

  r.get('/jobs/:id', (req, res) => {
    const j = jobs.get(req.params.id);
    if (!j) return res.status(404).json({ error: 'Job not found (the server may have restarted)' });
    res.json(j);
  });

  r.post('/runs', (req, res) => {
    const { name, submission, model } = req.body ?? {};
    const err = validateSubmission(submission);
    if (err) return res.status(400).json({ error: err });
    const report = gradeSubmission(submission as Submission, 'raw-model');
    const id = store({ name: clean(name, 60) || 'Manual evaluation', method: 'manual', model: clean(model, 120) || undefined, summary: report.summary, report });
    res.status(201).json({ id, summary: report.summary });
  });

  r.get('/runs', (_req, res) => {
    res.json(db().labRuns.slice(0, 200).map(summaryOf));
  });

  r.get('/runs/:id', (req, res) => {
    const run = db().labRuns.find((x) => x.id === req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  });

  // Old jobs are forgotten after an hour.
  setInterval(() => {
    for (const [id, j] of jobs) if (Date.now() - j.startedAt > 3_600_000) jobs.delete(id);
  }, 600_000).unref();

  return r;
}
