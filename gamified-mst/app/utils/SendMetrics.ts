import { Session } from '@/app/setup';

type ProlificData = {
    prolificPID: string;
    studyID: string;
    sessionID: string;
    participantAge?: number;
    participantGender?: string;
    screenSize?: string;
    deviceType?: string;
};

export const sendMetrics = async ( 
    JsPsychData: string, 
    sessionData: Session | null, 
    api: string, 
    prolific: ProlificData,
    currentLevel: number,
    gameWeek: number,
    gameSet: number,
    sessionCompleted: boolean = false
) => {

    const trials = JSON.parse(JsPsychData).filter((t: any) => t.trial_type === 'image-button-response');
    const payload = { 
        trials: trials.map((trial: any) => {
            const labels = ['Old', 'Similar', 'New'];
            
            // Normalize image_id: strip CloudFront URL if present
            let imageId = trial.stimulus || '';
            if (imageId.startsWith('http')) {
                // Extract just the Set#/img#.jpg part
                const match = imageId.match(/Set\d+\/[^?]+/);
                imageId = match ? match[0] : imageId;
            }
            
            return {
                trial_id: trial.trial_index?.toString() || trial.trial?.toString() || '0',
                image_id: imageId,
                trial_type: trial.trial_type,
                mst_type: trial.type?.toString() || '0',
                lag: trial.lag?.toString() || '-1',
                lure_bin: trial.bin?.toString() || trial.lbin?.toString() || '0',
                participant_response: labels[trial.response],
                correct_resp: trial.correct_resp?.toString() || '0',
                correct: trial.response === trial.correct_resp,
                reaction_time_ms: trial.rt,
                timestamp: trial.time_elapsed ? new Date(trial.time_elapsed).toISOString() : new Date().toISOString(),
            };
        }),
        user_id: prolific.prolificPID,
        session_id: prolific.sessionID,
        current_level: currentLevel,
        game_week: gameWeek,
        set: gameSet,
        session_completed: sessionCompleted,
        ...(typeof prolific.participantAge !== 'undefined' ? { participant_age: prolific.participantAge } : {}),
        ...(prolific.participantGender ? { participant_gender: prolific.participantGender } : {}),
        ...(prolific.screenSize ? { screen_size: prolific.screenSize } : {}),
        ...(prolific.deviceType ? { device_type: prolific.deviceType } : {}),
    };

    try {
        const url = `${api}/metrics`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Metrics response error:', errorBody);
            throw new Error(`Metrics POST failed: ${response.status} ${errorBody}`);
        }
        
        const result = await response.json();
        return result;
    }
    catch (e) {
        console.error('Failed to send metrics:', e);
        throw e;
    }
}