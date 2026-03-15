'use client';

import React, { useState, useEffect } from 'react';
import { CalendarCheck, Clock, ArrowRight, Video, Phone } from 'lucide-react';
import { format, differenceInMinutes, isToday } from 'date-fns';
import Link from 'next/link';
import type { Appointment } from '@/lib/types';
import { JOIN_WINDOW_MINUTES } from '@/lib/types';

interface NextSessionCardProps {
  appointments: Appointment[];
  currentAppointment: Appointment;
}

export default function NextSessionCard({ appointments, currentAppointment }: NextSessionCardProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Find next session with same patient
  const nextSession = appointments
    .filter(
      (a) =>
        a.userId === currentAppointment.userId &&
        a.id !== currentAppointment.id &&
        (a.status === 'confirmed' || a.status === 'inProgress') &&
        new Date(a.scheduledAt) > now,
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  if (!nextSession) {
    return (
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-slate-400" />
          <p className="text-sm text-slate-500">No upcoming sessions with this patient</p>
          <Link
            href="/portal/appointments"
            className="ml-auto flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
          >
            All Appointments <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  const scheduledDate = new Date(nextSession.scheduledAt);
  const minutesUntil = differenceInMinutes(scheduledDate, now);
  const isSessionToday = isToday(scheduledDate);
  const isWithinWindow = minutesUntil <= JOIN_WINDOW_MINUTES;
  const isAudio = nextSession.consultationType === 'audio';
  const CallIcon = isAudio ? Phone : Video;

  // Today + within join window → prominent green
  if (isSessionToday && isWithinWindow) {
    return (
      <div className="bg-emerald-50 rounded-2xl border border-emerald-200/60 ring-1 ring-emerald-200/40 p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CallIcon className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-900">Next session is ready</p>
            <p className="text-xs text-emerald-600">
              {format(scheduledDate, 'hh:mm a')} · {nextSession.durationMinutes} min {isAudio ? 'audio' : 'video'} session
            </p>
          </div>
          <Link
            href={`/portal/consultation?appointmentId=${nextSession.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <CallIcon className="w-4 h-4" />
            Go to Session
          </Link>
        </div>
      </div>
    );
  }

  // Today + not yet in window → amber countdown
  if (isSessionToday) {
    return (
      <div className="bg-amber-50 rounded-2xl border border-amber-200/60 ring-1 ring-amber-200/40 p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Next session in {minutesUntil} minute{minutesUntil !== 1 ? 's' : ''}</p>
            <p className="text-xs text-amber-600">
              {format(scheduledDate, 'hh:mm a')} · {nextSession.durationMinutes} min {isAudio ? 'audio' : 'video'} session
            </p>
          </div>
          <Link
            href={`/portal/consultation?appointmentId=${nextSession.id}`}
            className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800"
          >
            View <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  // Future date → muted
  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <CalendarCheck className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Next session: {format(scheduledDate, 'EEEE, MMM d')}</p>
          <p className="text-xs text-slate-500">
            {format(scheduledDate, 'hh:mm a')} · {nextSession.durationMinutes} min {isAudio ? 'audio' : 'video'} session
          </p>
        </div>
        <Link
          href={`/portal/consultation?appointmentId=${nextSession.id}`}
          className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
        >
          View <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
