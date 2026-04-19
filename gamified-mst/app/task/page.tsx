'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react'
import TaskPage from '@/app/components/TaskPage/TaskPage';
import { TaskType } from '@/app/types/mst';

function TaskContent() {
  const searchParams = useSearchParams();
  
  // Read task type from URL (?mode=Flatx2)
  const taskType =
    (searchParams.get('mode') as TaskType) ?? 'Flatx2';
    
  const prolificPID = 
    searchParams.get('PROLIFIC_PID') ?? 'test';

  const studyID = 
    searchParams.get('STUDY_ID') ?? 'test';

  const sessionID = 
    searchParams.get('SESSION_ID') ?? 'test';

  return <TaskPage taskType={taskType} prolificPID={prolificPID} studyID={studyID} sessionID={sessionID} />;
}

export default function TaskRoutePage() {
    return (
      <Suspense fallback={<div>Loading Task...</div>}>
        <TaskContent />
      </Suspense>
    );
}
