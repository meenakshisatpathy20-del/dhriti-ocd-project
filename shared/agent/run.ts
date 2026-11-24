import { classifyHybrid } from '../nlp/ensemble';
import { guardReply, hasRiskFraming, LOOP_WINDOW_MS } from '../nlp/reassurance';
import { detectTactic, erpReply } from './erp';
import { themeOf } from './planner';
import { extractEpisode } from '../nlp/extract';
import { phrase } from '../i18n/phrases';
import type { NaiveBayesModel } from '../ml/core';
import { planOffline } from './planner';
import { systemPrompt } from './prompt';
import { TOOLS, toolCallToAction } from './tools';
import type { AgentAction, AgentContext, AgentResponse, ModelFn } from './types';

/**
 * The Dhriti agent pipeline.
 *
 *   speech/text
 *     -> 1. local safety screen (offline, always first)
 *     -> 2. hybrid intent understanding (rules + Naive Bayes)
 *     -> 3. planner: language model with tools if configured, else offline planner
 *     -> 4. clinical invariants enforced on the plan (crisis, panic, reassurance)
 *     -> 5. reply guardrails (no reassurance, no diagnosis, no medication advice)
 *     -> reply + actions for the app
 */
export async function runAgent(text: string, ctx: AgentContext, deps: { nb: NaiveBayesModel | null; model?: ModelFn | null }): Promise<AgentResponse> {
  const c = classifyHybrid(text, deps.nb);
  const trace: string[] = [`understood: ${c.intent} via ${c.source} (conf ${c.confidence})`];
  const now = ctx.now ?? Date.now();

  // Reassurance-seeking repeats and escalates: inside an active reassurance
  // episode, pleading, guilt or "I'll ask someone else" is the same compulsion.
  const inEpisode = ctx.reassurance.some((r) => now - r.at <= LOOP_WINDOW_MS);
  if (inEpisode && (c.intent === 'UNCLEAR' || c.intent === 'DIARY' || (c.intent === 'URGE' && detectTactic(text)))) {
    trace.push(`continuing reassurance episode (${c.intent} -> REASSURANCE)`);
    c.intent = 'REASSURANCE';
  }

  // Steps 1-2: crisis, emergencies and panic never wait for a network round trip.
  if (c.intent === 'SELF_HARM' || c.intent === 'EMERGENCY' || c.intent === 'PANIC') {
    const plan = planOffline(text, c, ctx);
    return finish(plan.reply, plan.actions, 'offline', [...trace, ...plan.trace]);
  }

  // Step 3: plan.
  let reply = '';
  let actions: AgentAction[] = [];
  let engine: AgentResponse['engine'] = 'offline';
  if (deps.model) {
    try {
      const out = await deps.model(systemPrompt(ctx.lang, ctx.careLevel, ctx.name), [...ctx.history.slice(-8), { role: 'user', content: text }], TOOLS);
      actions = out.toolCalls.map((tc) => toolCallToAction(tc, text)).filter((a): a is AgentAction => a !== null);
      reply = out.content.trim();
      engine = 'model';
      trace.push(`model planned ${out.toolCalls.map((t) => t.name).join(', ') || 'a reply only'}`);
    } catch (err) {
      trace.push(`model unavailable (${(err as Error).message}); using offline planner`);
    }
  }
  if (engine === 'offline') {
    const plan = planOffline(text, c, ctx);
    reply = plan.reply;
    actions = plan.actions;
    trace.push(...plan.trace);
  }

  // Step 4: clinical invariants hold whichever planner ran.
  if (c.intent === 'REASSURANCE' && !actions.some((a) => a.type === 'DECLINE_REASSURANCE')) {
    actions.unshift({ type: 'DECLINE_REASSURANCE', loop: false });
    trace.push('invariant: reassurance-seeking must be declined');
  }
  if (c.intent === 'URGE' && ctx.careLevel < 4 && !actions.some((a) => a.type === 'START_ERP')) {
    actions.push({ type: 'START_ERP', episode: extractEpisode(text) });
    trace.push('invariant: urges open the ERP coach');
  }
  if (ctx.careLevel === 4) {
    const before = actions.length;
    actions = actions.filter((a) => a.type !== 'START_ERP' && a.type !== 'OPEN_EXPOSURE');
    if (actions.length !== before) trace.push('invariant: no self-led exposure at care level 4');
  }
  if (!reply) reply = phrase('didNotCatch', ctx.lang);
  // OCD-EVAL finding: safety reflexes that treat an intrusive thought as danger
  // (distance from the baby, crisis lines, "is he safe?") harm people with OCD.
  if ((c.intent === 'REASSURANCE' || c.intent === 'URGE') && hasRiskFraming(reply)) {
    reply = erpReply(ctx.lang, themeOf(text, ctx.history), detectTactic(text));
    trace.push('guardrail: removed risk framing of an intrusive thought');
  }
  if (c.riskCheck && c.intent !== 'REASSURANCE') {
    reply += ctx.lang === 'hi'
      ? ' Agar kabhi khud ko nuksan pahunchane ke vichaar aayein, to Tele-MANAS 14416 par free baat kar sakte hain.'
      : ' If you ever have thoughts of harming yourself, Tele-MANAS on 14416 is free and open all day and night.';
    trace.push('soft risk check-in added');
  }

  return finish(reply, actions, engine, trace);

  function finish(r: string, a: AgentAction[], e: AgentResponse['engine'], t: string[]): AgentResponse {
    // Step 5: guardrails on every reply.
    const g = guardReply(r);
    if (g.blocked.length) t.push(`guardrail rewrote reply: ${g.blocked.join(', ')}`);
    // A guardrail rewrite of a reassurance reply falls back to the full ERP reply, not a bare sentence.
    const text2 = g.blocked.includes('reassurance') && (c.intent === 'REASSURANCE' || c.intent === 'URGE') ? erpReply(ctx.lang, themeOf(text, ctx.history), detectTactic(text)) : g.text;
    return { reply: text2, actions: a, intent: c.intent, confidence: c.confidence, engine: e, guarded: g.blocked, trace: t, tactic: c.intent === 'REASSURANCE' ? detectTactic(text) : null };
  }
}
