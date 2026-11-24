import { phrase } from '../i18n/phrases';
import { extractEpisode } from '../nlp/extract';
import { isReassuranceLoop } from '../nlp/reassurance';
import { tokens, containsPhrase } from '../nlp/normalize';
import { parseRating } from '../nlp/numbers';
import type { HybridClassification } from '../nlp/ensemble';
import type { AgentAction, AgentContext, ChatTurn } from './types';
import { detectTactic, emergencyReply, erpReply, medicalReply } from './erp';

/**
 * Offline planner. Deterministic, explainable, works without network.
 * Maps an understood intent to a spoken reply and app actions.
 */
export function planOffline(text: string, c: HybridClassification, ctx: AgentContext): { reply: string; actions: AgentAction[]; trace: string[] } {
  const { lang } = ctx;
  const trace: string[] = [`intent=${c.intent} (${c.source}, conf ${c.confidence})`];
  const toks = tokens(text);

  switch (c.intent) {
    case 'SELF_HARM':
      trace.push('safety: crisis protocol');
      return { reply: phrase('crisis', lang), actions: [{ type: 'CRISIS' }], trace };

    case 'EMERGENCY':
      trace.push('safety: real-world emergency (an act or injury, not a thought)');
      return { reply: emergencyReply(lang), actions: [{ type: 'EMERGENCY' }], trace };

    case 'MEDICAL':
      trace.push('practical health question: give guidance, do not treat as OCD');
      return { reply: medicalReply(lang, text), actions: [], trace };

    case 'PANIC':
      trace.push('tool: start_panic_mode');
      return { reply: phrase('panicStart', lang), actions: [{ type: 'START_PANIC' }], trace };

    case 'REASSURANCE': {
      const loop = isReassuranceLoop([...ctx.reassurance, { at: ctx.now ?? Date.now(), text }], ctx.now);
      const tactic = detectTactic(text);
      const theme = themeOf(text, ctx.history);
      trace.push(`reassurance declined (theme=${theme}, tactic=${tactic ?? 'none'}, loop=${loop})`);
      return { reply: erpReply(lang, theme, tactic), actions: [{ type: 'DECLINE_REASSURANCE', loop }], trace };
    }

    case 'URGE': {
      const episode = extractEpisode(text);
      trace.push(`extracted compulsion=${episode.compulsion}`);
      if (ctx.careLevel === 4) {
        trace.push('care level 4: support + refer, no self-led exposure');
        return {
          reply: phrase('urgeAck', lang) + ' ' + (lang === 'hi' ? 'Chaliye saath mein saans lete hain, aur psychiatrist se baat karna zaroori hai.' : "Let's breathe together for a moment. Talking to a psychiatrist is important for you right now."),
          actions: [{ type: 'START_MEDITATION', kind: 'label' }, { type: 'BOOK_PROFESSIONAL' }],
          trace,
        };
      }
      trace.push('tool: start_erp_coach');
      return { reply: `${phrase('urgeAck', lang)} ${phrase('urgeWait', lang)}`, actions: [{ type: 'START_ERP', episode }], trace };
    }

    case 'DIARY': {
      const mood = parseRating(text);
      trace.push('tool: save_diary_entry');
      const reply = lang === 'hi'
        ? 'Shukriya batane ke liye. Maine ise aapki diary mein save kar diya hai.'
        : 'Thank you for sharing that. I have saved it to your diary.';
      return { reply, actions: [{ type: 'SAVE_DIARY', text, mood }], trace };
    }

    default: {
      // Navigation requests ("screening", "meditation", "lesson", "doctor", "VR").
      const nav = navigationIntent(toks);
      if (nav) {
        trace.push(`navigation: ${nav.type}`);
        return { reply: lang === 'hi' ? 'Theek hai, chaliye shuru karte hain.' : "Okay, let's begin.", actions: [nav], trace };
      }
      trace.push('unclear: ask again');
      return { reply: phrase('didNotCatch', lang), actions: [], trace };
    }
  }
}

function navigationIntent(toks: string[]): AgentAction | null {
  const has = (...ps: string[]) => ps.some((p) => containsPhrase(toks, p));
  if (has('screening', 'test', 'check my symptoms', 'jaanch')) return { type: 'START_SCREENING' };
  if (has('bhramari', 'hum', 'humming')) return { type: 'START_MEDITATION', kind: 'bhramari' };
  if (has('body scan')) return { type: 'START_MEDITATION', kind: 'bodyscan' };
  if (has('meditation', 'meditate', 'dhyan', 'relax')) return { type: 'START_MEDITATION', kind: 'label' };
  if (has('lesson', 'learn', 'what is ocd', 'ocd kya hai', 'seekhna')) return { type: 'OPEN_LESSON', lessonId: 'what-is-ocd' };
  if (has('doctor', 'therapist', 'psychiatrist', 'appointment', 'book')) return { type: 'BOOK_PROFESSIONAL' };
  if (has('vr', '360', 'exposure', 'practice scene')) return { type: 'OPEN_EXPOSURE' };
  return null;
}

/** The OCD theme of a conversation: this message first, then recent user turns. */
export function themeOf(text: string, history: ChatTurn[]) {
  const own = extractEpisode(text).compulsion;
  if (own !== 'other' && own !== 'reassurance' && own !== 'mental') return own;
  const context = history.filter((h) => h.role === 'user').slice(-4).map((h) => h.content).join(' ');
  const ctxType = extractEpisode(`${context} ${text}`).compulsion;
  return ctxType === 'reassurance' ? own : ctxType;
}
