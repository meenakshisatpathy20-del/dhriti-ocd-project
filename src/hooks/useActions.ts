import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AgentAction } from '../../shared/agent/types';
import { useStore, uid } from '../state/store';

/** Turns agent actions into app behaviour: navigation, saving data, crisis screens. */
export function useAgentActions() {
  const navigate = useNavigate();
  const { update } = useStore();

  return useCallback((actions: AgentAction[], utterance: string) => {
    for (const a of actions) {
      switch (a.type) {
        case 'CRISIS':
          navigate('/crisis');
          return;
        case 'EMERGENCY':
          navigate('/crisis?type=emergency');
          return;
        case 'START_PANIC':
          navigate('/panic');
          return;
        case 'DECLINE_REASSURANCE':
          update((d) => ({ ...d, reassurance: [...d.reassurance, { at: Date.now(), text: utterance }].slice(-200) }));
          break;
        case 'START_ERP':
          navigate('/coach', { state: { utterance, episode: a.episode } });
          return;
        case 'SAVE_DIARY':
          update((d) => ({ ...d, diary: [...d.diary, { id: uid(), at: new Date().toISOString(), text: a.text, mood: a.mood ?? null }] }));
          break;
        case 'START_SCREENING':
          navigate('/screening');
          return;
        case 'START_MEDITATION':
          navigate(`/meditate?mode=${a.kind}`);
          return;
        case 'OPEN_LESSON':
          navigate(`/learn/${a.lessonId}`);
          return;
        case 'BOOK_PROFESSIONAL':
          navigate('/care');
          return;
        case 'OPEN_EXPOSURE':
          navigate('/exposure');
          return;
        default:
          break;
      }
    }
  }, [navigate, update]);
}
