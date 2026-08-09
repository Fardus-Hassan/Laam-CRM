import { Suspense } from 'react';

import OtpCopyPageClient from './otp-copy-client';

export default function OtpCopyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <OtpCopyPageClient />
    </Suspense>
  );
}
