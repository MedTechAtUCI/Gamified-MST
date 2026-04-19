export type UserState = {
  userId: string;
  sessionId: string;
  current_level?: number;
  week_of_study?: number;
  game_set?: number;
  participant_age?: number;
  participant_gender?: string;
  [key: string]: any;
};

export const fetchUserState = async (
  prolificPID: string,
  sessionID: string
): Promise<UserState | null> => {
  const API_URL = process.env.NEXT_PUBLIC_AWS_METRICS_API;
  
  if (!API_URL) {
    console.error('NEXT_PUBLIC_AWS_METRICS_API not configured');
    return null;
  }

  try {
    const url = new URL(`${API_URL}/state`);
    url.searchParams.append('userId', prolificPID);
    url.searchParams.append('sessionId', sessionID);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('User state fetched:', data);
      return data;
    }
    else if (response.status === 404) {
      console.log('No existing state found for user');
      return null;
    }
    else {
      console.error('Failed to fetch user state:', response.statusText);
      return null;
    }
  }
  catch (error) {
    console.error('Error fetching user state:', error);
    return null;
  }
};
