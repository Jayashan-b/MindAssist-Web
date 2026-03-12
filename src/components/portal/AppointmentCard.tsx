'use client';

import React from 'react';
import { Video, Phone, Calendar, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { Appointment } from '@/lib/types';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '@/lib/types';

interface AppointmentCardProps {
  appointment: Appointment;
}

export default function AppointmentCard({ appointment }: AppointmentCardProps) {
  const scheduledDate = new Date(appointment.scheduledAt);
  const isUpcoming = scheduledDate > new Date() && appointment.status === 'confirmed';
  const canJoinCall = appointment.meetingUrl &&
    (appointment.status === 'confirmed' || appointment.status === 'inProgress');
  const displayName = appointment.anonymousMode
    ? appointment.anonymousAlias || 'Anonymous'
    : `Patient`;

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isUpcoming
        ? 'bg-violet-50/50 border-violet-200/60 shadow-sm'
        : 'bg-white border-slate-200/60 hover:border-slate-300'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Type Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            appointment.consultationType === 'video'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-emerald-100 text-emerald-600'
          }`}>
            {appointment.consultationType === 'video' ? (
              <Video className="w-5 h-5" />
            ) : (
              <Phone className="w-5 h-5" />
            )}
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

      {/* Join Call Button */}
      {canJoinCall && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <a
            href={appointment.meetingUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <Video className="w-4 h-4" />
            Join Call
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
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
