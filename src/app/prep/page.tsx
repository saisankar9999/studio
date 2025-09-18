import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import PrepPageContent from './PrepPageContent';

export default function PrepRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <LoadingSpinner className="h-12 w-12" />
        </div>
      }
    >
      <PrepPageContent />
    </Suspense>
  );
}
