'use client';

import React, { useState, useEffect } from 'react';
import { Video, Phone, Calendar, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import Link from 'next/link';
import type { Appointment } from '@/lib/types';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '@/lib/types';

interface AppointmentCardProps {
  appointment: Appointment;
  showJoinLink?: boolean;
}

export default function AppointmentCard({ appointment, showJoinLink = true }: AppointmentCardProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const scheduledDate = new Date(appointment.scheduledAt);
  const isUpcoming = scheduledDate > now && appointment.status === 'confirmed';
  const displayName = appointment.anonymousMode
    ? appointment.anonymousAlias || 'Anonymous'
    : 'Patient';

  // Join window: 15 min before to (duration + 15) min after scheduled time
  const minutesBefore = differenceInMinutes(scheduledDate, now);
  const minutesAfter = differenceInMinutes(now, scheduledDate);
  const duration = appointment.durationMinutes || 30;
  const isWithinJoinWindow = minutesBefore <= 15 && minutesAfter <= (duration + 15);
  const isValidUrl = appointment.meetingUrl?.startsWith('https://meet.jit.si/');

  const canJoinCall = isValidUrl &&
    (appointment.status === 'confirmed' || appointment.status === 'inProgress') &&
    isWithinJoinWindow;

  const isApproaching = minutesBefore > 0 && minutesBefore <= 60 && !isWithinJoinWindow &&
    (appointment.status === 'confirmed' || appointment.status === 'inProgress');

  const isAudio = appointment.consultationType === 'audio';
  const CallIcon = isAudio ? Phone : Video;

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      canJoinCall
        ? 'bg-emerald-50/50 border-emerald-200/60 shadow-sm ring-1 ring-emerald-200/40'
        : isUpcoming
          ? 'bg-violet-50/50 border-violet-200/60 shadow-sm'
          : 'bg-white border-slate-200/60 hover:border-slate-300'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Type Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isAudio
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-blue-100 text-blue-600'
          }`}>
            <CallIcon className="w-5 h-5" />
          </div>

          <div>
            <p className="font-semibold text-sm text-slate-800">{displayName}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                {format(scheduledDate, 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                {format(scheduledDate, 'hh:mm a')}
              </span>
            </div>
            {appointment.durationMinutes && (
              <p className="text-xs text-slate-400 mt-0.5">{appointment.durationMinutes} min session</p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
          APPOINTMENT_STATUS_COLORS[appointment.status]
        }`}>
          {APPOINTMENT_STATUS_LABELS[appointment.status]}
        </span>
      </div>

      {/* Approaching indicator */}
      {isApproaching && showJoinLink && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="flex items-center gap-2 text-xs text-amber-600 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            Starts in {minutesBefore} minute{minutesBefore !== 1 ? 's' : ''} — join window opens 15 min before
          </p>
        </div>
      )}

      {/* Join Call Button */}
      {canJoinCall && showJoinLink && (
        <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center gap-3">
          <a
            href={appointment.meetingUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <CallIcon className="w-4 h-4" />
            Join {isAudio ? 'Audio' : 'Video'} Call
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Link
            href={`/portal/consultation?appointmentId=${appointment.id}&userId=${appointment.userId}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-100 text-violet-700 text-sm font-medium hover:bg-violet-200 transition-colors"
          >
            Open Console
          </Link>
        </div>
      )}

      {/* Rating */}
      {appointment.rating && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={`text-sm ${star <= appointment.rating! ? 'text-amber-400' : 'text-slate-200'}`}>
                ★
              </span>
            ))}
            {appointment.ratingComment && (
              <span className="ml-2 text-xs text-slate-500 truncate">{appointment.ratingComment}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
