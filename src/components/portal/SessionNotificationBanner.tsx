'use client';

import React from 'react';
import { Bell, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Appointment } from '@/lib/types';

interface ApproachingSession {
  appointment: Appointment;
  minutesUntil: number;
}

interface SessionNotificationBannerProps {
  sessions: ApproachingSession[];
}

export default function SessionNotificationBanner({ sessions }: SessionNotificationBannerProps) {
  if (sessions.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 mb-6 ring-1 ring-amber-200/40">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <Bell className="w-4 h-4 text-amber-600" />
        </div>
        <h3 className="text-sm font-bold text-amber-900">
          {sessions.length === 1 ? 'Session Starting Soon' : `${sessions.length} Sessions Starting Soon`}
        </h3>
      </div>
      <div className="space-y-2">
        {sessions.map(({ appointment, minutesUntil }) => {
          const name = appointment.anonymousMode
            ? appointment.anonymousAlias || 'Anonymous'
            : appointment.patientName || 'Patient';
          return (
            <div key={appointment.id} className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-sm text-slate-700">
                  <span className="font-medium">{name}</span> — in{' '}
                  <span className="font-semibold text-amber-700">
                    {minutesUntil} min{minutesUntil !== 1 ? 's' : ''}
                  </span>
                </span>
              </div>
              <Link
                href={`/portal/consultation?appointmentId=${appointment.id}`}
                className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
              >
                Open <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
