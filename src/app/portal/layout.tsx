'use client';

import React from 'react';
import { AuthProvider } from '@/lib/hooks/useAuth';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
