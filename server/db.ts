import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import type { KycApplication } from '../shared/clinical/kyc';

/**
 * A small JSON-file database. Enough for a research prototype and easy to
 * inspect during a demo; swap for PostgreSQL in production.
 */

export type KycStatus = 'pending' | 'verified' | 'rejected';

export interface Professional extends KycApplication {
  id: string;
  status: KycStatus;
  reviewNote?: string;
  documentPath?: string;
  accessKeyHash: string;
  createdAt: string;
  reviewedAt?: string;
  demo?: boolean;
  slots: string[];
}

export interface Booking {
  id: string;
  professionalId: string;
  patientId: string;
  patientAlias: string;
  slot: string;
  mode: 'online' | 'offline';
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  note?: string;
  sharedReport?: unknown;
  carePlan?: { text: string; at: string };
  createdAt: string;
}

export interface Message {
  id: string;
  bookingId: string;
  from: 'patient' | 'professional';
  text: string;
  urgent?: boolean;
  at: string;
}

export interface LabRun {
  id: string;
  name: string;
  method: 'api' | 'api+dhriti' | 'manual' | 'dhriti';
  model?: string;
  provider?: string;
  createdAt: string;
  summary: unknown;
  report: unknown;
}

interface Schema {
  labRuns: LabRun[];
  professionals: Professional[];
  bookings: Booking[];
  messages: Message[];
}

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'data');
const FILE = join(DIR, 'db.json');

export const hashKey = (k: string) => createHash('sha256').update(k).digest('hex');
export const newKey = () => randomBytes(18).toString('base64url');
export const newId = () => randomUUID();

function nextSlots(days = 5): string[] {
  const out: string[] = [];
  const start = new Date();
  start.setMinutes(0, 0, 0);
  for (let d = 1; d <= days; d++) {
    for (const h of [10, 12, 16, 18]) {
      const s = new Date(start);
      s.setDate(start.getDate() + d);
      s.setHours(h);
      out.push(s.toISOString());
    }
  }
  return out;
}

/** Clearly-labelled fictional professionals so the marketplace works in a demo. */
function seed(): Schema {
  const base = { accessKeyHash: hashKey('demo'), createdAt: new Date().toISOString(), reviewedAt: new Date().toISOString(), demo: true, consentToVerify: true, slots: nextSlots() };
  const pros: Professional[] = [
    { ...base, id: 'demo-psy-1', status: 'verified', name: 'Dr. Ananya Rao (demo profile)', role: 'psychiatrist', email: 'demo1@example.com', phone: '9000000001', council: 'Karnataka Medical Council', registrationNumber: 'KMC-45821', registrationYear: 2012, qualification: 'MBBS + MD (Psychiatry)', institution: 'Demo Medical College', experienceYears: 12, specialisations: ['OCD', 'Anxiety disorders', 'ERP'], languages: ['English', 'Hindi', 'Kannada'], city: 'Bengaluru', modes: ['online', 'offline'], feeInr: 1200, bio: 'Demo profile for the research prototype. Focus on OCD and anxiety, combining medication review with ERP.' },
    { ...base, id: 'demo-cp-1', status: 'verified', name: 'Rahul Verma (demo profile)', role: 'clinical_psychologist', email: 'demo2@example.com', phone: '9000000002', council: 'Rehabilitation Council of India (RCI)', registrationNumber: 'A23456', registrationYear: 2016, qualification: 'M.Phil Clinical Psychology', institution: 'Demo Institute of Mental Health', experienceYears: 8, specialisations: ['OCD', 'ERP', 'CBT', 'Family therapy'], languages: ['Hindi', 'English'], city: 'Indore', modes: ['online'], feeInr: 800, bio: 'Demo profile. CBT and ERP for OCD, including family sessions on reducing accommodation.' },
    { ...base, id: 'demo-cp-2', status: 'verified', name: 'Priyanka Iyer (demo profile)', role: 'clinical_psychologist', email: 'demo3@example.com', phone: '9000000003', council: 'Rehabilitation Council of India (RCI)', registrationNumber: 'A34567', registrationYear: 2018, qualification: 'M.Phil Clinical Psychology', institution: 'Demo University', experienceYears: 6, specialisations: ['OCD', 'Panic disorder', 'CBT'], languages: ['Tamil', 'English'], city: 'Chennai', modes: ['online', 'offline'], feeInr: 900, bio: 'Demo profile. ERP and panic treatment in Tamil and English.' },
    { ...base, id: 'demo-psy-2', status: 'verified', name: 'Dr. Sourav Ghosh (demo profile)', role: 'psychiatrist', email: 'demo4@example.com', phone: '9000000004', council: 'West Bengal Medical Council', registrationNumber: 'WBMC-67012', registrationYear: 2009, qualification: 'MBBS + DNB (Psychiatry)', institution: 'Demo Medical College, Kolkata', experienceYears: 15, specialisations: ['OCD', 'Anxiety disorders'], languages: ['Bengali', 'Hindi', 'English'], city: 'Kolkata', modes: ['online', 'offline'], feeInr: 1000, bio: 'Demo profile. Psychiatric assessment and medication management for OCD.' },
    { ...base, id: 'demo-pending-1', status: 'pending', slots: [], name: 'Dr. Meera Kulkarni (demo application)', role: 'psychiatrist', email: 'demo5@example.com', phone: '9000000005', council: 'Maharashtra Medical Council', registrationNumber: 'MMC-2019-08812', registrationYear: 2019, qualification: 'MBBS + MD (Psychiatry)', institution: 'Demo Medical College, Pune', experienceYears: 5, specialisations: ['OCD', 'Child & adolescent'], languages: ['Marathi', 'Hindi', 'English'], city: 'Pune', modes: ['online'], feeInr: 1000, bio: 'Demo application waiting for verification.' },
  ];
  return { labRuns: [], professionals: pros, bookings: [], messages: [] };
}

let cache: Schema | null = null;

export function db(): Schema {
  if (cache) return cache;
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  cache = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Schema) : seed();
  cache.labRuns = cache.labRuns ?? [];
  save();
  return cache;
}

export function save(): void {
  if (!cache) return;
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(cache, null, 2));
  renameSync(tmp, FILE);
}

export function publicProfessional(p: Professional) {
  const { accessKeyHash: _k, documentPath: _d, email: _e, phone: _p, ...rest } = p;
  return rest;
}

export { nextSlots };
