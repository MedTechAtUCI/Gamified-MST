'use client';

import { Suspense } from 'react';
import TitlePage from './components/TitlePage/TitlePage';

export default function Page() {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <TitlePage />
      </Suspense>
    )
}
