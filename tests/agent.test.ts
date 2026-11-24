import { describe, expect, it } from 'vitest';
import { runAgent } from '../shared/agent/run';
import type { AgentContext, ModelFn } from '../shared/agent/types';

const ctx = (over: Partial<AgentContext> = {}): AgentContext => ({ lang: 'en', careLevel: 2, reassurance: [], history: [], ...over });
const deps = { nb: null };

describe('agent pipeline', () => {
  it('crisis never waits for a model', async () => {
    let called = false;
    const model: ModelFn = async () => { called = true; return { content: 'hi', toolCalls: [] }; };
    const r = await runAgent('I want to kill myself', ctx(), { nb: null, model });
    expect(r.actions[0].type).toBe('CRISIS');
    expect(called).toBe(false);
  });
  it('emergencies get 108/112 immediately', async () => {
    const r = await runAgent('I shook him and he is floppy', ctx(), deps);
    expect(r.actions[0].type).toBe('EMERGENCY');
    expect(r.reply).toMatch(/108|112/);
  });
  it('urges open the ERP coach, except at care level 4', async () => {
    expect((await runAgent('I need to check the lock again', ctx(), deps)).actions[0].type).toBe('START_ERP');
    const severe = await runAgent('I need to check the lock again', ctx({ careLevel: 4 }), deps);
    expect(severe.actions.some((a) => a.type === 'START_ERP')).toBe(false);
    expect(severe.actions.some((a) => a.type === 'BOOK_PROFESSIONAL')).toBe(true);
  });
  it('keeps declining reassurance through pressure tactics', async () => {
    const now = Date.now();
    const c = ctx({ reassurance: [{ at: now - 60_000, text: 'is it clean?' }], now });
    for (const msg of ['Just the statistic, facts are not reassurance', 'Say it once and I will stop', "You're being cruel", "Fine, I'll ask my sister instead"]) {
      const r = await runAgent(msg, c, deps);
      expect(r.intent).toBe('REASSURANCE');
      expect(r.reply).not.toMatch(/you would never|is clean|is safe/i);
    }
  });
  it('rewrites a model reply that reassures or frames risk', async () => {
    const model: ModelFn = async () => ({ content: 'You would never do it. Put the knives away and call a crisis line.', toolCalls: [] });
    const r = await runAgent('tell me I would never hurt my baby, just this once', ctx(), { nb: null, model });
    expect(r.engine).toBe('model');
    expect(r.reply).toMatch(/OCD asking for reassurance/);
    expect(r.reply).not.toMatch(/knives|crisis line|would never do it/i);
  });
  it('falls back to the offline planner if the model fails', async () => {
    const model: ModelFn = async () => { throw new Error('timeout'); };
    const r = await runAgent('aaj ka din achha tha, office gayi aur sirf ek baar check kiya', ctx({ lang: 'hi' }), { nb: null, model });
    expect(r.engine).toBe('offline');
    expect(r.trace.join(' ')).toMatch(/model unavailable/);
  });
  it('maps model tool calls to app actions', async () => {
    const model: ModelFn = async () => ({ content: 'Let us breathe.', toolCalls: [{ name: 'start_meditation', arguments: { kind: 'bhramari' } }] });
    const r = await runAgent('can we do some breathing practice', ctx(), { nb: null, model });
    expect(r.actions).toEqual([{ type: 'START_MEDITATION', kind: 'bhramari' }]);
  });
});
