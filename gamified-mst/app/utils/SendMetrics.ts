import { Session } from '@/app/setup';

type ProlificData = {
    prolificPID: string;
    studyID: string;
    sessionID: string;
    participantAge?: number;
    participantGender?: string;
};

export const sendMetrics = async ( 
    JsPsychData: string, 
    sessionData: Session | null, 
    api: string, 
    prolific: ProlificData,
    currentLevel: number,
    gameWeek: number,
    gameSet: number
) => {

    const trials = JSON.parse(JsPsychData).filter((t: any) => t.trial_type === 'image-button-response');
    const payload = { 
        trials: trials.map((trial: any, index: number) => {
            const labels = ['Old', 'Similar', 'New'];
            return {
                participant_id: sessionData?.sid || 'guest',
                'session_id#trial_number': `${sessionData?.sid || '001'}#${String(index + 1).padStart(3, '0')}`,
                trial_id: trial.trial_index.toString(),
                image_id: trial.stimulus,
                trial_type: trial.trial_type,
                lure_bin: trial.bin?.toString() || '0',
                participant_response: labels[trial.response],
                correct: trial.response === trial.correct_resp,
                reaction_time_ms: trial.rt,
                timestamp: new Date().toISOString(),
            };
        }),
        user_id: prolific.prolificPID,
        session_id: prolific.sessionID,
        current_level: currentLevel,
        game_week: gameWeek,
        set: gameSet,
        ...(typeof prolific.participantAge !== 'undefined' ? { participant_age: prolific.participantAge } : {}),
        ...(prolific.participantGender ? { participant_gender: prolific.participantGender } : {}),
    };

    console.log('Sending metrics payload:', payload);

    try {
        const url = `${api}/metrics`;
        console.log('POST to:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Metrics response error:', errorBody);
            throw new Error(`Metrics POST failed: ${response.status} ${errorBody}`);
        }
        
        const result = await response.json();
        console.log('Metrics response:', result);
        return result;
    }
    catch (e) {
        console.error('Failed to send metrics:', e);
        throw e;
    }
}