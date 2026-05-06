'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react'
import TaskPage from '@/app/components/TaskPage/TaskPage';
import { TaskType } from '@/app/types/mst';

function TaskContent() {
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);

  const readStoredDemographics = () => {
    if (typeof window === 'undefined') {
      return { participantAge: undefined, participantGender: undefined };
    }

    try {
      const raw = window.sessionStorage.getItem('mst_test_demographics');
      if (!raw) {
        return { participantAge: undefined, participantGender: undefined };
      }

      const parsed = JSON.parse(raw) as {
        participantAge?: number;
        participantGender?: string;
      };

      const age = Number(parsed.participantAge);
      const validAge = Number.isFinite(age) && age >= 18 ? age : undefined;
      const normalizedGender = (parsed.participantGender || '').toLowerCase();
      const validGender = ['male', 'female', 'other'].includes(normalizedGender)
        ? normalizedGender
        : undefined;

      return { participantAge: validAge, participantGender: validGender };
    } catch {
      return { participantAge: undefined, participantGender: undefined };
    }
  };
  
  // Read task type from URL (?mode=Imbal2x3)
  const taskType =
    (searchParams.get('mode') as TaskType) ?? 'Imbal2x3';
    
  const prolificPID = searchParams.get('PROLIFIC_PID');
  const sessionID = searchParams.get('SESSION_ID');
  const studyID = searchParams.get('STUDY_ID') ?? 'default_study';

  const { participantAge, participantGender } = readStoredDemographics();

  // Validate required parameters
  useEffect(() => {
    if (!prolificPID || !sessionID) {
      const noConsentUrl = process.env.NEXT_PUBLIC_PROLIFIC_NO_CONSENT || 'https://app.prolific.com/submissions/complete';
      window.location.href = noConsentUrl;
      return;
    }
    setIsReady(true);
  }, [prolificPID, sessionID]);

  if (!isReady) {
    return <div>Loading...</div>;
  }

  return (
    <TaskPage
      taskType={taskType}
      prolificPID={prolificPID!}
      studyID={studyID}
      sessionID={sessionID!}
      participantAge={participantAge}
      participantGender={participantGender}
    />
  );
}

export default function TaskRoutePage() {
    return (
      <Suspense fallback={<div>Loading Task...</div>}>
        <TaskContent />
      </Suspense>
    );
}
