/**
 * Shared utilities for both gamified and ungamified task variants
 * Mirrors app/utils/SetAssignment.ts and FetchUserState.ts logic
 */

const TOTAL_SETS = 5;

async function fetchUserState(awsMetricsAPI, prolificPID, sessionID) {
  try {
    const stateUrl = `${awsMetricsAPI}/state?userId=${prolificPID}&sessionId=${sessionID}`;
    
    const response = await fetch(stateUrl);
    
    if (response.ok) {
      const userState = await response.json();
      console.log('User state fetched:', userState);
      return userState;
    } else if (response.status === 404) {
      console.log('No existing state found for user');
      return null;
    } else {
      console.error('Failed to fetch user state:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user state:', error);
    return null;
  }
}

function areAllSetsCompleted(userState) {
  if (!userState?.sessions || userState.sessions.length === 0) {
    return false;
  }

  const completedSets = new Set(
    userState.sessions
      .filter(s => s.completed)
      .map(s => s.set_number)
  );

  return completedSets.size === TOTAL_SETS;
}


function getNextSet(userState) {
  if (!userState?.sessions || userState.sessions.length === 0) {
    const randomSet = Math.floor(Math.random() * TOTAL_SETS) + 1;
    console.log(`  -> No sessions, returning random: ${randomSet}`);
    return randomSet;
  }
  const completedSets = new Set(
    userState.sessions
      .filter(s => s.completed)
      .map(s => s.set_number)
  );
  
  const availableSets = [];
  for (let i = 1; i <= TOTAL_SETS; i++) {
    if (!completedSets.has(i)) {
      availableSets.push(i);
    }
  }

  if (availableSets.length === 0) {
    return null;
  }

  const chosen = availableSets[Math.floor(Math.random() * availableSets.length)];
  return chosen;
}


function getSessionSet(userState, sessionId) {  
  // First check the sessions array (for completed sessions)
  if (userState?.sessions) {
    const sessionRecord = userState.sessions.find(s => s.sessionId === sessionId);
    if (sessionRecord?.set_number) {
      return sessionRecord.set_number;
    }
  }

  // If this is the current session and game_set is set, use that
  if (userState && userState.sessionId === sessionId && userState.game_set) {
    return userState.game_set;
  }
  return null;
}


function isSessionCompleted(userState, sessionId) {
  if (!userState?.sessions) return false;

  const sessionRecord = userState.sessions.find(s => s.sessionId === sessionId);
  return sessionRecord?.completed || false;
}

/**
 * Save trial progress to AWS
 * @param {string} awsMetricsAPI - API endpoint base URL
 * @param {Object} payload - Progress data to save
 * @returns {Promise<boolean>} True if save successful
 */
async function saveProgress(awsMetricsAPI, payload) {
  try {
    const response = await fetch(`${awsMetricsAPI}/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
        
    if (!response.ok) {
      const errorText = await response.text();
      return false;
    } else {
      return true;
    }
  } catch (e) {
    return false;
  }
}
