'use client';

import React, { useState, useEffect } from 'react';
import { Video, Phone, Calendar, Clock, ExternalLink, AlertCircle, CheckCircle2, Loader2, XCircle, Ban } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import Link from 'next/link';
import type { Appointment } from '@/lib/types';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS, JOIN_WINDOW_MINUTES } from '@/lib/types';
import { markDoctorJoined } from '@/lib/firestore';
import PatientAvatar from './PatientAvatar';
import CancelAppointmentDialog from './CancelAppointmentDialog';

interface AppointmentCardProps {
  appointment: Appointment;
  showJoinLink?: boolean;
  onViewPatient?: (userId: string) => void;
}

export default function AppointmentCard({ appointment, showJoinLink = true, onViewPatient }: AppointmentCardProps) {
  const [now, setNow] = useState(new Date());
  const [starting, setStarting] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const scheduledDate = new Date(appointment.scheduledAt);
  const isUpcoming = scheduledDate > now && appointment.status === 'confirmed';
  const displayName = appointment.anonymousMode
    ? appointment.anonymousAlias || 'Anonymous'
    : appointment.patientName || 'Patient';

  // Join window: JOIN_WINDOW_MINUTES before to (duration + JOIN_WINDOW_MINUTES) after scheduled time
  const minutesBefore = differenceInMinutes(scheduledDate, now);
  const minutesAfter = differenceInMinutes(now, scheduledDate);
  const duration = appointment.durationMinutes || 30;
  const isWithinJoinWindow = minutesBefore <= JOIN_WINDOW_MINUTES && minutesAfter <= (duration + JOIN_WINDOW_MINUTES);

  const hasDoctorJoined = !!appointment.doctorJoinedAt;
  const hasDoctorLeft = !!appointment.doctorLeftAt;
  const isSessionEnded = appointment.status === 'completed' || appointment.status === 'rated';
  const isCancelled = appointment.status === 'cancelled';

  const canStartMeeting = !hasDoctorJoined && !isSessionEnded && isWithinJoinWindow &&
    (appointment.status === 'confirmed' || appointment.status === 'inProgress');

  const isValidUrl = appointment.meetingUrl?.startsWith('https://meet.jit.si/');
  const canRejoinCall = hasDoctorJoined && !hasDoctorLeft && !isSessionEnded && isValidUrl;

  const isApproaching = minutesBefore > 0 && minutesBefore <= 60 && !isWithinJoinWindow &&
    (appointment.status === 'confirmed' || appointment.status === 'inProgress');

  const canCancel = appointment.status === 'confirmed' || appointment.status === 'pending' || appointment.status === 'pendingPayment';

  const isAudio = appointment.consultationType === 'audio';
  const CallIcon = isAudio ? Phone : Video;

  const handleStartMeeting = async () => {
    setStarting(true);
    try {
      await markDoctorJoined(appointment.userId, appointment.id);
    } catch (err) {
      console.error('Failed to start meeting:', err);
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      <div className={`p-4 rounded-xl border transition-all ${
        canRejoinCall
          ? 'bg-emerald-50/50 border-emerald-200/60 shadow-sm ring-1 ring-emerald-200/40'
          : canStartMeeting
            ? 'bg-violet-50/50 border-violet-200/60 shadow-sm ring-1 ring-violet-200/40'
            : isUpcoming
              ? 'bg-violet-50/50 border-violet-200/60 shadow-sm'
              : isCancelled
                ? 'bg-red-50/30 border-red-200/40'
                : 'bg-white border-slate-200/60 hover:border-slate-300'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {/* Patient Avatar */}
            <PatientAvatar
              name={displayName}
              isAnonymous={appointment.anonymousMode}
            />

            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-slate-800">{displayName}</p>
                {/* Call type badge */}
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  isAudio ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <CallIcon className="w-2.5 h-2.5" />
                  {isAudio ? 'Audio' : 'Video'}
                </span>
              </div>
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

          {/* Status + Actions */}
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              APPOINTMENT_STATUS_COLORS[appointment.status]
            }`}>
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </span>
            {hasDoctorJoined && !isSessionEnded && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Meeting Started
              </span>
            )}
          </div>
        </div>

        {/* Cancellation info */}
        {isCancelled && appointment.cancelledBy && (
          <div className="mt-3 pt-3 border-t border-red-100">
            <div className="flex items-start gap-2">
              <Ban className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-red-600 font-medium">
                  Cancelled by {appointment.cancelledBy === 'doctor' ? 'you' : 'patient'}
                  {appointment.cancelledAt && ` on ${format(new Date(appointment.cancelledAt), 'MMM d, yyyy')}`}
                </p>
                {appointment.cancellationReason && (
                  <p className="text-xs text-red-500 mt-0.5">{appointment.cancellationReason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approaching indicator */}
        {isApproaching && showJoinLink && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="flex items-center gap-2 text-xs text-amber-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Starts in {minutesBefore} minute{minutesBefore !== 1 ? 's' : ''} — join window opens {JOIN_WINDOW_MINUTES} min before
            </p>
          </div>
        )}

        {/* Start Meeting Button */}
        {canStartMeeting && showJoinLink && (
          <div className="mt-3 pt-3 border-t border-violet-100 flex items-center gap-3">
            <button
              onClick={handleStartMeeting}
              disabled={starting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {starting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CallIcon className="w-4 h-4" />
              )}
              {starting ? 'Starting...' : 'Start Meeting'}
            </button>
            <Link
              href={`/portal/consultation?appointmentId=${appointment.id}&userId=${appointment.userId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-100 text-violet-700 text-sm font-medium hover:bg-violet-200 transition-colors"
            >
              Open Console
            </Link>
          </div>
        )}

        {/* Rejoin Call */}
        {canRejoinCall && showJoinLink && (
          <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center gap-3">
            <a
              href={appointment.meetingUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <CallIcon className="w-4 h-4" />
              Rejoin {isAudio ? 'Audio' : 'Video'} Call
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

        {/* Action buttons row (View Patient + Cancel) */}
        {!canStartMeeting && !canRejoinCall && !isCancelled && !isSessionEnded && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
            {onViewPatient && (
              <button
                onClick={() => onViewPatient(appointment.userId)}
                className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
              >
                View Patient
              </button>
            )}
            {canCancel && onViewPatient && <span className="text-slate-200">|</span>}
            {canCancel && (
              <button
                onClick={() => setShowCancel(true)}
                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                <XCircle className="w-3 h-3" />
                Cancel
              </button>
            )}
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

      {/* Cancel Dialog */}
      <CancelAppointmentDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        appointmentId={appointment.id}
        userId={appointment.userId}
        patientName={displayName}
      />
    </>
  );
}
