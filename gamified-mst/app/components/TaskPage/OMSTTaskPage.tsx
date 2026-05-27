'use client';

import { useEffect, useState } from 'react';
import { sendMetrics } from '@/app/utils/SendMetrics';

type OMSTaskPageProps = {
  prolificPID: string;
  studyID: string;
  sessionID: string;
  participantAge?: number;
  participantGender?: string;
  participantEthnicity?: string;
  participantRace?: string;
  participantHandedness?: string;
  gameSet?: number;
  gameWeek?: number;
};

export default function OMSTaskPage({ 
  prolificPID, 
  studyID, 
  sessionID, 
  participantAge, 
  participantGender, 
  participantEthnicity,
  participantRace,
  participantHandedness,
  gameSet, 
  gameWeek 
}: OMSTaskPageProps) {

  const [extraParams, setExtraParams] = useState('');

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem('mst_test_demographics');
      if (stored) {
        const parsed = JSON.parse(stored);
        let queryStr = '';
        
        if (parsed.participantEthnicity) queryStr += `&PARTICIPANT_ETHNICITY=${encodeURIComponent(parsed.participantEthnicity)}`;
        if (parsed.participantRace) queryStr += `&PARTICIPANT_RACE=${encodeURIComponent(parsed.participantRace)}`;
        if (parsed.participantHandedness) queryStr += `&PARTICIPANT_HANDEDNESS=${encodeURIComponent(parsed.participantHandedness)}`;
        
        // Dynamic fallbacks strictly computed here
        const finalAge = participantAge || parsed.participantAge;
        const finalGender = participantGender || parsed.participantGender;
        
        if (finalAge) queryStr += `&PARTICIPANT_AGE=${encodeURIComponent(finalAge)}`;
        if (finalGender) queryStr += `&PARTICIPANT_GENDER=${encodeURIComponent(finalGender)}`;
        
        setExtraParams(queryStr);
      }
    } catch (e) {
      console.warn("Failed to parse demographics from session storage", e);
    }
  }, [participantAge, participantGender, participantEthnicity, participantRace, participantHandedness]); // Stripped back dependencies to prevent infinite loops

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'OMST_RAW_COMPLETE') {        
        const { rawJsPsychData } = event.data.payload;
        const AWS_API_GATEWAY = process.env.NEXT_PUBLIC_AWS_METRICS_API || '';
        
        const mockSessionData = {
          sid: prolificPID,
          cond: 0,
          order: [5, 6],
          set_omst: gameSet || 1,
          taskindex: 0,
          selfpaced: true,
          resp_mode: 'button' as const,
        };

        const finalizedDataString = typeof rawJsPsychData === 'string' 
          ? rawJsPsychData 
          : JSON.stringify(rawJsPsychData);

        const stored = JSON.parse(window.sessionStorage.getItem('mst_test_demographics') || '{}');

        try {
          await sendMetrics(
            finalizedDataString, 
            mockSessionData, 
            AWS_API_GATEWAY, 
            {
              prolificPID,
              studyID,
              sessionID,
              participantAge: participantAge || stored.participantAge,
              participantGender: participantGender || stored.participantGender,
              participantEthnicity: stored.participantEthnicity,
              participantRace: stored.participantRace,
              participantHandedness: stored.participantHandedness,
              screenSize: `${window.innerWidth}x${window.innerHeight}`,
              deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
            },
            256, 
            gameWeek ?? 1,           
            gameSet ?? 1,           
            true,
            'U'
          );
          
          window.location.href = process.env.NEXT_PUBLIC_PROLIFIC_COMPLETE_STUDY || 'https://app.prolific.com/submissions/complete';

        } catch (error) {
          console.error("Save Error:", error);
          alert("There was an error saving your data. Please contact the researcher.");
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [prolificPID, studyID, sessionID, participantAge, participantGender, participantEthnicity, participantRace, participantHandedness, gameSet, gameWeek]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#fff' }}>
      <iframe 
        src={`/old-mst/cont_omst.html?PROLIFIC_PID=${prolificPID}&STUDY_ID=${studyID}&SESSION_ID=${sessionID}&AWS_API=${encodeURIComponent(process.env.NEXT_PUBLIC_AWS_METRICS_API || '')}&GAME_SET=${gameSet || 1}&GAME_WEEK=${gameWeek || 1}${extraParams}`}
        title="oMST Task"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}