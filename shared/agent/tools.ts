import type { AgentAction, ModelToolCall, ToolSpec } from './types';
import { extractEpisode } from '../nlp/extract';
import { LESSONS } from '../clinical/lessons';

/** Tools the agent can call. Each tool becomes an action the app carries out. */
export const TOOLS: ToolSpec[] = [
  {
    name: 'start_erp_coach',
    description: 'Start a guided exposure and response prevention (ERP) session when the user reports an urge to perform a compulsion.',
    parameters: {
      type: 'object',
      properties: { utterance: { type: 'string', description: "The user's words describing the urge." } },
      required: ['utterance'],
    },
  },
  {
    name: 'start_panic_mode',
    description: 'Open the calm breathing screen when the user describes panic, breathlessness or a racing heart.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'save_diary_entry',
    description: "Save the user's spoken reflection about their day to their private diary.",
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        mood: { type: 'number', description: 'Optional mood 0-10 if the user stated one.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'start_screening',
    description: 'Start the spoken OCI-R and Y-BOCS screening when the user wants to check their symptoms.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'start_meditation',
    description: 'Start a spoken meditation: bhramari humming breath, thought labelling, or a body scan.',
    parameters: {
      type: 'object',
      properties: { kind: { type: 'string', enum: ['bhramari', 'label', 'bodyscan'] } },
      required: ['kind'],
    },
  },
  {
    name: 'open_lesson',
    description: 'Open a short psychoeducation lesson about OCD.',
    parameters: {
      type: 'object',
      properties: { lesson_id: { type: 'string', enum: LESSONS.map((l) => l.id) } },
      required: ['lesson_id'],
    },
  },
  {
    name: 'book_professional',
    description: 'Show verified psychiatrists and therapists the user can book.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'open_exposure_scene',
    description: 'Open a 360-degree practice exposure scene for graded ERP.',
    parameters: { type: 'object', properties: {} },
  },
];

export function toolCallToAction(call: ModelToolCall, utterance: string): AgentAction | null {
  const a = call.arguments ?? {};
  switch (call.name) {
    case 'start_erp_coach':
      return { type: 'START_ERP', episode: extractEpisode(String(a.utterance ?? utterance)) };
    case 'start_panic_mode':
      return { type: 'START_PANIC' };
    case 'save_diary_entry':
      return { type: 'SAVE_DIARY', text: String(a.text ?? utterance), mood: typeof a.mood === 'number' ? a.mood : null };
    case 'start_screening':
      return { type: 'START_SCREENING' };
    case 'start_meditation': {
      const kind = a.kind === 'label' || a.kind === 'bodyscan' ? a.kind : 'bhramari';
      return { type: 'START_MEDITATION', kind };
    }
    case 'open_lesson': {
      const id = String(a.lesson_id ?? '');
      return LESSONS.some((l) => l.id === id) ? { type: 'OPEN_LESSON', lessonId: id } : null;
    }
    case 'book_professional':
      return { type: 'BOOK_PROFESSIONAL' };
    case 'open_exposure_scene':
      return { type: 'OPEN_EXPOSURE' };
    default:
      return null;
  }
}
