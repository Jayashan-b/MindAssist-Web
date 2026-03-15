'use client';

import React from 'react';
import { AuthProvider } from '@/lib/hooks/useAuth';
import { CallSessionProvider } from '@/lib/hooks/useCallSession';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CallSessionProvider>
        {children}
      </CallSessionProvider>
    </AuthProvider>
  );
}
