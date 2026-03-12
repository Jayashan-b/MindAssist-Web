'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/portal/dashboard');
  }, [router]);
  return null;
}
