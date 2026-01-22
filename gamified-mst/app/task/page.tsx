'use client';

import { useSearchParams } from 'next/navigation';
import TaskPage from '@/app/components/TaskPage/TaskPage';
import { TaskType } from '@/app/types/mst';

export default function TaskRoutePage() {
  const searchParams = useSearchParams();

  // Read task type from URL (?mode=Flatx2)
  const taskType =
    (searchParams.get('mode') as TaskType) ?? 'Flatx2';

  return <TaskPage taskType={taskType} />;
}
