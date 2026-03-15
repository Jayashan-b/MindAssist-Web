'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PhoneCall, Phone, Video, ArrowRight } from 'lucide-react';
import { differenceInSeconds } from 'date-fns';
import Link from 'next/link';
import { useCallSession } from '@/lib/hooks/useCallSession';

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ActiveSessionCard() {
  const pathname = usePathname();
  const { isConnected, activeAppointment } = useCallSession();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  if (!isConnected || !activeAppointment) return null;
  if (pathname?.startsWith('/portal/consultation')) return null;

  const displayName = activeAppointment.anonymousMode
    ? activeAppointment.anonymousAlias || 'Anonymous'
    : activeAppointment.patientName || 'Patient';
  const isAudio = activeAppointment.consultationType === 'audio';
  const CallIcon = isAudio ? Phone : Video;
  const joinedAt = activeAppointment.doctorJoinedAt
    ? new Date(activeAppointment.doctorJoinedAt)
    : null;
  const elapsedSeconds = joinedAt
    ? Math.max(0, differenceInSeconds(now, joinedAt))
    : 0;

  return (
    <div className="mb-6 bg-red-50 border border-red-200/60 rounded-2xl p-4 ring-1 ring-red-200/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
            <PhoneCall className="w-4 h-4 text-red-600" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900">Session in Progress</h3>
            <p className="text-xs text-red-700">
              <span className="font-medium">{displayName}</span>
              <span className="mx-1.5 text-red-300">&middot;</span>
              <span className="inline-flex items-center gap-0.5">
                <CallIcon className="w-3 h-3" />
                {isAudio ? 'Audio' : 'Video'}
              </span>
              <span className="mx-1.5 text-red-300">&middot;</span>
              <span className="font-mono font-semibold">{formatElapsed(elapsedSeconds)}</span>
            </p>
          </div>
        </div>
        <Link
          href={`/portal/consultation?appointmentId=${activeAppointment.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm"
        >
          Return to Session
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
