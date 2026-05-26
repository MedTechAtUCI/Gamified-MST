'use client';

import { useState, useEffect, Suspense } from 'react';
import TitlePage from '@/app/components/TitlePage/TitlePage';
import TaskPage from '@/app/components/TaskPage/TaskPage';
import { fetchUserState } from '@/app/utils/FetchUserState';
import { areAllSetsCompleted, getSessionSet, getNextSet } from '@/app/utils/SetAssignment';
import { useSearchParams } from 'next/navigation';

const ACTIVE_ROUTE = 'gamified-mst';

function GamifiedMSTContent() {
  const searchParams = useSearchParams();
  const hasConsented = searchParams.get('consented') === 'true';
  
  const [loading, setLoading] = useState(true);
  const [urlParams, setUrlParams] = useState({ pid: '', sid: '', study: '' });
  const [demographics, setDemographics] = useState({ age: 18, gender: '' });
  const [gameSet, setGameSet] = useState<number>(1);
  const [gameWeek, setGameWeek] = useState<number>(1);

  useEffect(() => {
    const initializeStudy = async () => {
      if (typeof window === 'undefined') return;
      if (!hasConsented) {
        setLoading(false);
        return;
      }

      const pid = searchParams.get('PROLIFIC_PID') || 'guest_user';
      const sid = searchParams.get('SESSION_ID') || 'test_session';
      const study = searchParams.get('STUDY_ID') || 'test_study';
      
      setUrlParams({ pid, sid, study });

      const savedDemos = window.sessionStorage.getItem('mst_test_demographics');
      if (savedDemos) {
        const parsed = JSON.parse(savedDemos);
        setDemographics({ age: parsed.participantAge, gender: parsed.participantGender });
      }

      try {
        const state = await fetchUserState(pid, sid);
        if (areAllSetsCompleted(state)) {
          window.location.href = process.env.NEXT_PUBLIC_PROLIFIC_COMPLETE_STUDY || 'https://app.prolific.com/submissions/complete';
          return;
        }

        const assignedSet = getSessionSet(state, sid) || getNextSet(state) || 1;
        setGameSet(assignedSet);

        const completedCount = state?.sessions?.filter((s: any) => s.completed).length || 0;
        setGameWeek(completedCount + 1);

      } catch (error) {
        console.error('Database fetch failed, falling back to default', error);
      } finally {
        setLoading(false);
      }
    };

    initializeStudy();
  }, [hasConsented, searchParams]);

  if (!hasConsented) {
    return <TitlePage route={ACTIVE_ROUTE} />;
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Initializing task...</div>;
  }

  return (
    <TaskPage
      taskType="Imbal2x3"
      prolificPID={urlParams.pid}
      studyID={urlParams.study}
      sessionID={urlParams.sid}
      participantAge={demographics.age}
      participantGender={demographics.gender}
      gameSet={gameSet}
      gameWeek={gameWeek}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <GamifiedMSTContent />
    </Suspense>
  );
}
