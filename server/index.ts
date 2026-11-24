import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { existsSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAgent } from '../shared/agent/run';
import type { AgentContext } from '../shared/agent/types';
import { eligibleForCareLevel, validateKyc, type KycApplication } from '../shared/clinical/kyc';
import type { NaiveBayesModel } from '../shared/ml/core';
import nbJson from '../shared/ml/intent-nb.json';
import mlModel from '../shared/ml/model.json';
import { db, hashKey, newId, newKey, nextSlots, publicProfessional, save, type Booking, type Professional } from './db';
import { modelFromEnv, modelInfo } from './llm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
try {
  if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));
} catch {
  /* optional */
}

const PORT = Number(process.env.PORT ?? 8787);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'dhriti-admin';
const nb = nbJson as unknown as NaiveBayesModel;
const model = modelFromEnv();

const app = express();
app.use(express.json({ limit: '256kb' }));

const upload = multer({
  storage: multer.diskStorage({
    destination: join(ROOT, 'server/uploads'),
    filename: (_req, file, cb) => cb(null, `${newId()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)),
});

const bad = (res: Response, status: number, error: string, extra: object = {}) => res.status(status).json({ error, ...extra });

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.header('x-admin-token') !== ADMIN_TOKEN) return bad(res, 401, 'Admin token required');
  next();
}

function professionalFromKey(req: Request): Professional | undefined {
  const key = req.header('x-pro-key');
  if (!key) return undefined;
  const h = hashKey(key);
  return db().professionals.find((p) => p.accessKeyHash === h && !p.demo);
}

// ---------- Health ----------

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: modelInfo(), ml: { version: mlModel.version, datasetRows: mlModel.dataset.rows, auditVerdict: mlModel.auditVerdict } });
});

// ---------- Agent ----------

app.post('/api/agent', async (req, res) => {
  const { text, ctx } = req.body as { text?: string; ctx?: Partial<AgentContext> };
  if (typeof text !== 'string' || !text.trim()) return bad(res, 400, 'text is required');
  if (text.length > 1000) return bad(res, 413, 'text too long');
  const context: AgentContext = {
    lang: ctx?.lang && ['en', 'hi', 'ta', 'bn'].includes(ctx.lang) ? ctx.lang : 'en',
    careLevel: ([1, 2, 3, 4] as const).includes(ctx?.careLevel as 1) ? (ctx!.careLevel as AgentContext['careLevel']) : 1,
    name: typeof ctx?.name === 'string' ? ctx.name.slice(0, 40) : undefined,
    reassurance: Array.isArray(ctx?.reassurance) ? ctx!.reassurance.slice(-20) : [],
    history: Array.isArray(ctx?.history) ? ctx!.history.slice(-8).filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string') : [],
  };
  try {
    res.json(await runAgent(text.trim(), context, { nb, model }));
  } catch (err) {
    bad(res, 500, (err as Error).message);
  }
});

// ---------- Professionals: public directory ----------

app.get('/api/professionals', (req, res) => {
  const careLevel = Number(req.query.careLevel ?? 1);
  const lang = typeof req.query.lang === 'string' ? req.query.lang : '';
  const mode = typeof req.query.mode === 'string' ? req.query.mode : '';
  const list = db().professionals
    .filter((p) => p.status === 'verified')
    .filter((p) => eligibleForCareLevel(p.role, careLevel))
    .filter((p) => !lang || p.languages.includes(lang))
    .filter((p) => !mode || p.modes.includes(mode as 'online'))
    .map(publicProfessional);
  res.json(list);
});

// ---------- Professionals: onboarding (KYC) ----------

app.post('/api/professionals', upload.single('document'), (req, res) => {
  let application: Partial<KycApplication>;
  try {
    application = JSON.parse(String(req.body.application ?? '{}'));
  } catch {
    return bad(res, 400, 'application must be JSON');
  }
  const issues = validateKyc(application, !!req.file);
  if (issues.length) return bad(res, 422, 'Please fix the highlighted fields', { issues });
  const data = db();
  const dup = data.professionals.find((p) => p.registrationNumber.toLowerCase() === application.registrationNumber!.toLowerCase() && p.council === application.council);
  if (dup) return bad(res, 409, 'This registration number is already on Dhriti');
  const accessKey = newKey();
  const pro: Professional = {
    ...(application as KycApplication),
    id: newId(),
    status: 'pending',
    documentPath: req.file?.filename,
    accessKeyHash: hashKey(accessKey),
    createdAt: new Date().toISOString(),
    slots: [],
  };
  data.professionals.push(pro);
  save();
  res.status(201).json({ id: pro.id, status: pro.status, accessKey });
});

app.get('/api/professionals/me', (req, res) => {
  const pro = professionalFromKey(req);
  if (!pro) return bad(res, 401, 'Professional key required');
  const bookings = db().bookings.filter((b) => b.professionalId === pro.id);
  res.json({ profile: publicProfessional(pro), bookings });
});

app.post('/api/professionals/me/slots', (req, res) => {
  const pro = professionalFromKey(req);
  if (!pro) return bad(res, 401, 'Professional key required');
  if (pro.status !== 'verified') return bad(res, 403, 'Slots open after verification');
  const slots = Array.isArray(req.body.slots) ? req.body.slots.filter((s: unknown) => typeof s === 'string' && !Number.isNaN(Date.parse(s as string))) : nextSlots();
  pro.slots = slots.slice(0, 60);
  save();
  res.json({ slots: pro.slots });
});

// ---------- Admin: verification ----------

app.get('/api/admin/professionals', requireAdmin, (_req, res) => {
  res.json(db().professionals.map((p) => ({ ...publicProfessional(p), email: p.email, phone: p.phone, hasDocument: !!p.documentPath })));
});

app.get('/api/admin/professionals/:id/document', requireAdmin, (req, res) => {
  const p = db().professionals.find((x) => x.id === req.params.id);
  if (!p?.documentPath) return bad(res, 404, 'No document');
  res.sendFile(join(ROOT, 'server/uploads', p.documentPath));
});

app.post('/api/admin/professionals/:id/review', requireAdmin, (req, res) => {
  const p = db().professionals.find((x) => x.id === req.params.id);
  if (!p) return bad(res, 404, 'Not found');
  const { status, note } = req.body as { status?: string; note?: string };
  if (status !== 'verified' && status !== 'rejected') return bad(res, 400, 'status must be verified or rejected');
  if (status === 'rejected' && !note) return bad(res, 400, 'A reason is required when rejecting');
  p.status = status;
  p.reviewNote = note;
  p.reviewedAt = new Date().toISOString();
  if (status === 'verified' && p.slots.length === 0) p.slots = nextSlots();
  save();
  res.json(publicProfessional(p));
});

// ---------- Bookings ----------

app.post('/api/bookings', (req, res) => {
  const { professionalId, patientId, patientAlias, slot, mode, note } = req.body as Partial<Booking>;
  if (!professionalId || !patientId || !slot || (mode !== 'online' && mode !== 'offline')) return bad(res, 400, 'professionalId, patientId, slot and mode are required');
  const p = db().professionals.find((x) => x.id === professionalId && x.status === 'verified');
  if (!p) return bad(res, 404, 'Professional not available');
  if (!p.modes.includes(mode)) return bad(res, 400, `This professional does not offer ${mode} sessions`);
  if (!p.slots.includes(slot)) return bad(res, 409, 'That slot was just taken. Please choose another.');
  p.slots = p.slots.filter((s) => s !== slot);
  const booking: Booking = {
    id: newId(), professionalId, patientId, patientAlias: (patientAlias || 'Patient').slice(0, 40), slot, mode,
    status: p.demo ? 'confirmed' : 'requested', note: note?.slice(0, 500), createdAt: new Date().toISOString(),
  };
  db().bookings.push(booking);
  save();
  res.status(201).json(booking);
});

app.get('/api/bookings', (req, res) => {
  const patientId = String(req.query.patientId ?? '');
  if (!patientId) return bad(res, 400, 'patientId required');
  const list = db().bookings.filter((b) => b.patientId === patientId).map((b) => ({ ...b, professional: publicProfessional(db().professionals.find((p) => p.id === b.professionalId)!) }));
  res.json(list);
});

function bookingAccess(req: Request): { booking: Booking; as: 'patient' | 'professional' } | null {
  const booking = db().bookings.find((b) => b.id === req.params.id);
  if (!booking) return null;
  const pro = professionalFromKey(req);
  if (pro && pro.id === booking.professionalId) return { booking, as: 'professional' };
  const patientId = req.header('x-patient-id');
  if (patientId && patientId === booking.patientId) return { booking, as: 'patient' };
  return null;
}

app.post('/api/bookings/:id/status', (req, res) => {
  const access = bookingAccess(req);
  if (!access) return bad(res, 403, 'Not allowed');
  const { status } = req.body as { status?: Booking['status'] };
  const allowed = access.as === 'professional' ? ['confirmed', 'completed', 'cancelled'] : ['cancelled'];
  if (!status || !allowed.includes(status)) return bad(res, 400, `status must be one of ${allowed.join(', ')}`);
  access.booking.status = status;
  if (status === 'cancelled') {
    const p = db().professionals.find((x) => x.id === access.booking.professionalId);
    if (p && Date.parse(access.booking.slot) > Date.now()) p.slots = [...p.slots, access.booking.slot].sort();
  }
  save();
  res.json(access.booking);
});

app.post('/api/bookings/:id/share-report', (req, res) => {
  const access = bookingAccess(req);
  if (!access || access.as !== 'patient') return bad(res, 403, 'Only the patient can share their report');
  if (req.body?.consent !== true) return bad(res, 400, 'Explicit consent is required to share your report');
  access.booking.sharedReport = { ...req.body.report, sharedAt: new Date().toISOString() };
  save();
  res.json({ ok: true });
});

app.get('/api/bookings/:id/messages', (req, res) => {
  const access = bookingAccess(req);
  if (!access) return bad(res, 403, 'Not allowed');
  res.json(db().messages.filter((m) => m.bookingId === access.booking.id));
});

app.post('/api/bookings/:id/messages', (req, res) => {
  const access = bookingAccess(req);
  if (!access) return bad(res, 403, 'Not allowed');
  const text = String(req.body?.text ?? '').trim().slice(0, 2000);
  if (!text) return bad(res, 400, 'Message is empty');
  const msg = { id: newId(), bookingId: access.booking.id, from: access.as, text, at: new Date().toISOString() };
  db().messages.push(msg);
  save();
  res.status(201).json(msg);
});

// ---------- Static app in production ----------

const dist = join(ROOT, 'dist');
if (process.env.NODE_ENV === 'production' && existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  bad(res, err.message.includes('File too large') ? 413 : 500, err.message);
});

db();
app.listen(PORT, () => {
  const m = modelInfo();
  console.log(`Dhriti API on http://localhost:${PORT} | agent: ${m.configured ? `model ${m.model}` : 'offline planner'} | admin token: ${ADMIN_TOKEN === 'dhriti-admin' ? 'default (set ADMIN_TOKEN)' : 'set'}`);
});
