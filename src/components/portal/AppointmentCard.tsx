'use client';

import React, { useState, useEffect } from 'react';
import { Video, Phone, Calendar, Clock, Loader2, XCircle, Ban, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { Appointment } from '@/lib/types';
import { markDoctorJoined } from '@/lib/firestore';
import { supportsE2EE } from '@/lib/e2ee';
import { getSessionPhase, getCardBackground } from '@/lib/consultation-session';
import { useCallSession } from '@/lib/hooks/useCallSession';
import PatientAvatar from './PatientAvatar';
import CancelAppointmentDialog from './CancelAppointmentDialog';

interface AppointmentCardProps {
  appointment: Appointment;
  showJoinLink?: boolean;
  onViewPatient?: (profileKey: string) => void;
  isStillConnected?: boolean;
}

export default function AppointmentCard({ appointment, showJoinLink = true, onViewPatient, isStillConnected = false }: AppointmentCardProps) {
  const [now, setNow] = useState(new Date());
  const [starting, setStarting] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const callSession = useCallSession();

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const { phase, badge, primaryAction, canCancel } = getSessionPhase(appointment, now, {
    isStillConnected,
    hasBeenInSession: callSession.hasBeenInSession(appointment.id),
  });

  const displayName = appointment.anonymousMode
    ? appointment.anonymousAlias || 'Anonymous'
    : appointment.patientName || 'Patient';

  const isCancelled = appointment.status === 'cancelled';
  const isSessionEnded = appointment.status === 'completed' || appointment.status === 'rated';
  const isAudio = appointment.consultationType === 'audio';
  const CallIcon = isAudio ? Phone : Video;
  const scheduledDate = new Date(appointment.scheduledAt);

  const handleStartMeeting = async () => {
    setStarting(true);
    try {
      await markDoctorJoined(appointment.userId, appointment.id, supportsE2EE());
      window.location.href = `/portal/consultation?appointmentId=${appointment.id}`;
    } catch (err) {
      console.error('Failed to open room:', err);
      setStarting(false);
    }
  };

  return (
    <>
      <div className={`p-4 rounded-xl border transition-all ${getCardBackground(phase)}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <PatientAvatar
              name={displayName}
              isAnonymous={appointment.anonymousMode}
            />

            <div>
              <div className="flex items-center gap-2">
                {onViewPatient ? (
                  <button
                    onClick={() => onViewPatient(
                      appointment.anonymousMode ? `anon:${appointment.id}` : appointment.userId
                    )}
                    className="font-semibold text-sm text-violet-600 hover:text-violet-700 hover:underline transition-colors text-left"
                  >
                    {displayName}
                  </button>
                ) : (
                  <p className="font-semibold text-sm text-slate-800">{displayName}</p>
                )}
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

          {/* Status badge */}
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${badge.className}`}>
              {badge.text}
            </span>
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

        {/* Primary Action Section — full-width button with context text */}
        {/* Skip for activeElsewhere — the ActiveSessionCard banner handles "Return to Session" */}
        {primaryAction && showJoinLink && phase !== 'activeElsewhere' && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            {phase === 'roomOpen' && (
              <p className="text-xs text-blue-600 font-medium mb-2">Waiting for patient to join...</p>
            )}
            {phase === 'patientReady' && (
              <p className="text-xs text-emerald-600 font-medium mb-2">Patient has joined — start when ready</p>
            )}
            {phase === 'disconnected' && (
              <p className="text-xs text-red-600 font-medium mb-2">Session interrupted — reconnect to continue</p>
            )}

            {primaryAction.action === 'openRoom' ? (
              <button
                onClick={handleStartMeeting}
                disabled={starting}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50 ${primaryAction.className}`}
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CallIcon className="w-4 h-4" />}
                {starting ? 'Opening Room...' : primaryAction.label}
              </button>
            ) : (
              <Link
                href={primaryAction.href ?? `/portal/consultation?appointmentId=${appointment.id}`}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm ${primaryAction.className}`}
              >
                <CallIcon className="w-4 h-4" />
                {primaryAction.label}
              </Link>
            )}

            {canCancel && (
              <button
                onClick={() => setShowCancel(true)}
                className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Appointment
              </button>
            )}
          </div>
        )}

        {/* Cancel-only section (no primary action but can still cancel) */}
        {!primaryAction && !isCancelled && phase !== 'ended' && phase !== 'noShow' && canCancel && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowCancel(true)}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Appointment
            </button>
          </div>
        )}

        {/* Approaching indicator */}
        {phase === 'approaching' && showJoinLink && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="flex items-center gap-2 text-xs text-amber-600 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {badge.text}
            </p>
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
