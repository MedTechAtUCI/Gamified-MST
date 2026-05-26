'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    router.replace(`/gamified-mst?${params.toString()}`);
  }, [searchParams, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-2">Redirecting...</p>
        <p className="text-sm text-gray-400">If not redirected, please use: /gamified-mst</p>
      </div>
    </div>
  );
}
