'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, specialist, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setRedirecting(true);
      router.replace('/portal/login');
    } else if (!specialist) {
      setRedirecting(true);
      router.replace('/portal/register');
    }
  }, [user, specialist, loading, router]);

  if (loading || redirecting || !user || !specialist) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading portal...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
