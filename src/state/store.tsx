import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppLang } from '../../shared/i18n/phrases';
import type { OcirResult, YbocsResult, CareRoute, CareLevel } from '../../shared/clinical/instruments';
import { routeCare } from '../../shared/clinical/instruments';
import type { EpisodeExtraction } from '../../shared/nlp/extract';
import type { ErpOutcome } from '../../shared/nlp/answers';
import type { ReassuranceEvent } from '../../shared/nlp/reassurance';
import type { ChatTurn } from '../../shared/agent/types';

/**
 * Personal data lives only on this device (localStorage). Nothing here is sent
 * to the server unless the user explicitly shares a report with a professional
 * they booked. Raw audio is never stored anywhere.
 */

export interface Profile {
  patientId: string;
  name: string;
  lang: AppLang;
  onboarded: boolean;
  consentAt: string | null;
  trustedContact: { name: string; phone: string } | null;
  quiet: boolean;
  calm: boolean;
  wisprMode: boolean;
  muted: boolean;
}

export interface ScreeningRecord {
  id: string;
  at: string;
  ocir: { answers: number[]; result: OcirResult } | null;
  ybocs: { answers: number[]; result: YbocsResult } | null;
  route: CareRoute;
}

export interface Episode {
  id: string;
  at: string;
  utterance: string;
  extraction: EpisodeExtraction;
  suds: { sec: number; value: number }[];
  outcome: ErpOutcome | null;
  durationSec: number;
  source: 'urge' | 'ladder' | 'vr';
}

export interface DiaryEntry {
  id: string;
  at: string;
  text: string;
  mood: number | null;
}

export interface LadderStep {
  id: string;
  situation: string;
  suds: number;
  practised: number;
  mastered: boolean;
}

export interface PracticeLog {
  id: string;
  at: string;
  kind: 'panic' | 'bhramari' | 'label' | 'bodyscan' | 'vr';
  detail: string;
  minutes: number;
}

export interface AppData {
  profile: Profile;
  screenings: ScreeningRecord[];
  episodes: Episode[];
  diary: DiaryEntry[];
  ladder: LadderStep[];
  reassurance: ReassuranceEvent[];
  practice: PracticeLog[];
  lessons: Record<string, { completedAt: string; quizCorrect: boolean }>;
  chat: ChatTurn[];
}

const KEY = 'dhriti:v1';

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

function fresh(): AppData {
  return {
    profile: { patientId: uid(), name: '', lang: 'hi', onboarded: false, consentAt: null, trustedContact: null, quiet: false, calm: false, wisprMode: false, muted: false },
    screenings: [], episodes: [], diary: [], ladder: [], reassurance: [], practice: [], lessons: {}, chat: [],
  };
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as AppData;
    const base = fresh();
    return { ...base, ...parsed, profile: { ...base.profile, ...parsed.profile } };
  } catch {
    return fresh();
  }
}

interface Store {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  setProfile: (p: Partial<Profile>) => void;
  route: CareRoute;
  careLevel: CareLevel;
  latestScreening: ScreeningRecord | null;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked: the app keeps working in memory */
    }
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);
  const setProfile = useCallback((p: Partial<Profile>) => setData((d) => ({ ...d, profile: { ...d.profile, ...p } })), []);
  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setData(fresh());
  }, []);

  const latestScreening = data.screenings[data.screenings.length - 1] ?? null;
  const route = useMemo(() => latestScreening?.route ?? routeCare(null, null), [latestScreening]);

  const value = useMemo(() => ({ data, update, setProfile, route, careLevel: route.level, latestScreening, reset }), [data, update, setProfile, route, latestScreening, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
