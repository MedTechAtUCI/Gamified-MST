import { UserState, SessionRecord } from './FetchUserState';

const TOTAL_SETS = 5;

export const areAllSetsCompleted = (userState: UserState | null | undefined): boolean => {
  if (!userState?.sessions || userState.sessions.length === 0) {
    return false;
  }

  const completedSets = new Set(
    userState.sessions
      .filter((s: SessionRecord) => s.completed)
      .map((s: SessionRecord) => s.set_number)
  );

  return completedSets.size === TOTAL_SETS;
};

export const getNextSet = (userState: UserState | null | undefined): number | null => {
  if (!userState?.sessions || userState.sessions.length === 0) {
    const randomSet = Math.floor(Math.random() * TOTAL_SETS) + 1;
    return randomSet;
  }
  const completedSets = new Set(
    userState.sessions
      .filter((s: SessionRecord) => s.completed)
      .map((s: SessionRecord) => s.set_number)
  );

  const availableSets: number[] = [];
  for (let i = 1; i <= TOTAL_SETS; i++) {
    if (!completedSets.has(i)) {
      availableSets.push(i);
    }
  }

  if (availableSets.length === 0) {
    return null;
  }
  const result = availableSets[Math.floor(Math.random() * availableSets.length)];
  return result;
};

export const getSessionSet = (
  userState: UserState | null | undefined,
  sessionId: string
): number | null => {
  // First check the sessions array (for completed sessions)
  if (userState?.sessions) {
    const sessionRecord = userState.sessions.find(
      (s: SessionRecord) => s.sessionId === sessionId
    );
    const result = sessionRecord?.set_number || null;
    if (result) {
      return result;
    }
  }

  // If this is the current session and game_set is set, use that
  // (This handles in-progress sessions that aren't in the sessions array yet)
  if (userState && userState.sessionId === sessionId && userState.game_set) {
    return userState.game_set;
  }

  return null;
};

export const isSessionCompleted = (
  userState: UserState | null | undefined,
  sessionId: string
): boolean => {
  if (!userState?.sessions) return false;

  const sessionRecord = userState.sessions.find(
    (s: SessionRecord) => s.sessionId === sessionId
  );

  return sessionRecord?.completed || false;
};
