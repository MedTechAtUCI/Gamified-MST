import { Session } from '@/app/setup';

type ProlificData = {
    prolificPID: string;
    studyID: string;
    sessionID: string;
    participantAge?: number;
    participantGender?: string;
    participantEthnicity?: string;
    participantRace?: string;
    participantHandedness?: string;
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
    sessionCompleted: boolean = false,
    gameType: 'G' | 'U' = 'G'
) => {

    const trials = JSON.parse(JsPsychData).filter((t: any) => t.trial_type === 'image-button-response');
    const payload = { 
        trials: trials.map((trial: any) => {
            const labels = ['Old', 'Similar', 'New'];
            
            // Try to get MST properties from multiple locations (direct, nested in data, or defaults)
            const getProperty = (propName: string, defaultValue: string) => {
                // Try direct property
                if (trial[propName] !== undefined && trial[propName] !== null) {
                    return trial[propName].toString();
                }
                // Try nested in data object
                if (trial.data && trial.data[propName] !== undefined && trial.data[propName] !== null) {
                    return trial.data[propName].toString();
                }
                return defaultValue;
            };
            
            // Normalize image_id: strip CloudFront URL if present
            let imageId = trial.stimulus || '';
            if (imageId.startsWith('http')) {
                // Extract just the Set#/img#.jpg part
                const match = imageId.match(/Set\d+\/[^?]+/);
                imageId = match ? match[0] : imageId;
            }
            
            return {
                trial_id: trial.trial_index?.toString() || getProperty('trial', '0'),
                image_id: imageId,
                trial_type: trial.trial_type,
                mst_type: getProperty('type', '0'),
                lag: getProperty('lag', '-1'),
                lure_bin: getProperty('bin', getProperty('lbin', '0')),
                participant_response: labels[trial.response],
                correct_resp: getProperty('correct_resp', '0'),
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
        session_completed: sessionCompleted,
        game_type: gameType,
        ...(typeof prolific.participantAge !== 'undefined' ? { participant_age: prolific.participantAge } : {}),
        ...(prolific.participantGender ? { participant_gender: prolific.participantGender } : {}),
        ...(prolific.participantEthnicity ? { participant_ethnicity: prolific.participantEthnicity } : {}),
        ...(prolific.participantRace ? { participant_race: prolific.participantRace } : {}),
        ...(prolific.participantHandedness ? { participant_handedness: prolific.participantHandedness } : {}),
        
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