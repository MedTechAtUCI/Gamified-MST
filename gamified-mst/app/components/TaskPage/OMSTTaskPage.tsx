'use client';

import { useEffect } from 'react';
import { sendMetrics } from '@/app/utils/SendMetrics';

type OMSTaskPageProps = {
  prolificPID: string;
  studyID: string;
  sessionID: string;
  participantAge?: number;
  participantGender?: string;
  gameSet?: number;
  gameWeek?: number;
};

export default function OMSTaskPage({ prolificPID, studyID, sessionID, participantAge, participantGender, gameSet, gameWeek }: OMSTaskPageProps) {

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Security Check
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'OMST_RAW_COMPLETE') {        
        const { rawJsPsychData } = event.data.payload;
        const AWS_API_GATEWAY = process.env.NEXT_PUBLIC_AWS_METRICS_API || '';
        const mockSessionData = {
          sid: prolificPID || 'guest',
          cond: 0,
          order: [5, 6],
          set_omst: gameSet || 1,
          taskindex: 0,
          selfpaced: true,
          resp_mode: 'button' as const,
        };

        // Ensure data is formatted as a stringified JSON array
        const finalizedDataString = typeof rawJsPsychData === 'string' 
          ? rawJsPsychData 
          : JSON.stringify(rawJsPsychData);

        let totalTrials = 256;
        try {
          const parsed = typeof rawJsPsychData === 'string' ? JSON.parse(rawJsPsychData) : rawJsPsychData;
          if (Array.isArray(parsed)) {
            const imageTrials = parsed.filter((t: any) => t.trial_type === 'image-button-response');
            if (imageTrials.length > 0) totalTrials = imageTrials.length;
          }
        } catch (e) {
          console.warn("Could not calculate dynamic trial lengths, defaulting to 256", e);
        }

        try {
          await sendMetrics(
            finalizedDataString, 
            mockSessionData, 
            AWS_API_GATEWAY, 
            {
              prolificPID,
              studyID,
              sessionID,
              participantAge,
              participantGender,
              screenSize: `${window.innerWidth}x${window.innerHeight}`,
              deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
            },
            totalTrials, 
            gameWeek ?? 1,           
            gameSet ?? 1,           
            true,
            'U'
          );
          const prolificComplete = process.env.NEXT_PUBLIC_PROLIFIC_COMPLETE_STUDY || 'https://app.prolific.com/submissions/complete';
          window.location.href = prolificComplete;

        } catch (error) {
          alert("There was an error saving your data. Please do not close this window and contact the researcher.");
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [prolificPID, studyID, sessionID, participantAge, participantGender, gameSet, gameWeek]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#fff' }}>
      <iframe 
        src={`/old-mst/cont_omst.html?PROLIFIC_PID=${prolificPID}&STUDY_ID=${studyID}&SESSION_ID=${sessionID}&PARTICIPANT_AGE=${participantAge || ''}&PARTICIPANT_GENDER=${participantGender || ''}&AWS_API=${encodeURIComponent(process.env.NEXT_PUBLIC_AWS_METRICS_API || '')}&GAME_SET=${gameSet || 1}&GAME_WEEK=${gameWeek || 1}`}
        title="oMST Task"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}