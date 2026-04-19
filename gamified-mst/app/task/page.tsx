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
    
  // Generate random ID if not provided (for testing without Prolific)
  const generateRandomId = () => Math.random().toString(36).substring(2, 11);
    
  const prolificPID = 
    searchParams.get('PROLIFIC_PID') ?? generateRandomId();

  const studyID = 
    searchParams.get('STUDY_ID') ?? 'default_study';

  const sessionID = 
    searchParams.get('SESSION_ID') ?? generateRandomId();

  return <TaskPage taskType={taskType} prolificPID={prolificPID} studyID={studyID} sessionID={sessionID} />;
}

export default function TaskRoutePage() {
    return (
      <Suspense fallback={<div>Loading Task...</div>}>
        <TaskContent />
      </Suspense>
    );
}
