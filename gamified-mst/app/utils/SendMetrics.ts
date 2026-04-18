import { Session } from '@/app/setup';

type ProlificData = {
    prolificPID: string;
    studyID: string;
    sessionID: string;
};

export const sendMetrics = async ( 
    JsPsychData: string, 
    sessionData: Session | null, 
    api: string, 
    prolific: ProlificData
) => {

    const trials = JSON.parse(JsPsychData).filter((t: any) => t.trial_type === 'image-button-response');
    const formattedData = trials.map((trial: any, index: number) => {
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
            prolific_pid: prolific.prolificPID,
            study_id: prolific.studyID,
            session_id: prolific.sessionID,
        };
    });

    try {
        const response = await fetch(`${api}/metrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trials: formattedData }),
        })

        if (!response.ok) throw new Error('Metrics not sent!');
        return await response.json();
    }
    catch (e) {
        console.error('DynamoDB save error:', e);
    }
}