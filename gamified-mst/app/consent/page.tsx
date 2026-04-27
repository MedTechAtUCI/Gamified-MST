import { Suspense } from 'react';
import ConsentContent from './ConsentContent';

export default function ConsentPage() {
  return (
    <Suspense fallback={<div>Loading consent form...</div>}>
      <ConsentContent />
    </Suspense>
  );
}