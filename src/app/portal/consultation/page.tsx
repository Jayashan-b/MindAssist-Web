'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Video,
  Phone,
  ExternalLink,
  User,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Shield,
  UserCheck,
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAppointments } from '@/lib/hooks/useAppointments';
import { usePatientDocuments } from '@/lib/hooks/usePatientDocuments';
import { markDoctorJoined, markDoctorLeft, markSessionStarted, cancelAppointmentByDoctor } from '@/lib/firestore';
import LiveKitCall from '@/components/portal/LiveKitCall';
import ConsultationWorkspace from '@/components/portal/ConsultationWorkspace';
import PostSessionSummary from '@/components/portal/PostSessionSummary';
import NextSessionCard from '@/components/portal/NextSessionCard';
import { supportsE2EE } from '@/lib/e2ee';
import { usePatientNotes } from '@/lib/hooks/usePatientNotes';
import type { Appointment } from '@/lib/types';
import { JOIN_WINDOW_MINUTES } from '@/lib/types';

export default function ConsultationPage() {
  return (
    <AuthGuard>
      <ConsultationContent />
    </AuthGuard>
  );
}

function ConsultationContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');

  const { specialist } = useAuth();
  const { appointments, loading: aptsLoading } = useAppointments(specialist?.id);

  // Smart auto-detection when no appointmentId query param (Fix 3)
  const autoAppointment = !appointmentId ? (
    // Priority 1: Active session (room opened, not ended)
    appointments.find(a =>
      (a.status === 'inProgress' || a.status === 'confirmed') &&
      !!a.doctorJoinedAt && !a.doctorLeftAt
    )
    // Priority 2: Next upcoming confirmed
    ?? appointments
      .filter(a => a.status === 'confirmed' && new Date(a.scheduledAt) > new Date())
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]
  ) : null;

  const appointment = appointments.find((a) => a.id === appointmentId) ?? autoAppointment ?? null;
  const userId = appointment?.userId ?? null;

  if (aptsLoading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <PortalSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!appointment || !userId) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <PortalSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-semibold text-slate-700">No active session</p>
            <p className="text-sm text-slate-500 mt-1">Check your appointments to start a consultation</p>
            <Link
              href="/portal/appointments"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              View Appointments
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PortalSidebar />
      <main className="flex-1 p-8">
        <ConsultationView appointment={appointment} userId={userId} specialist={specialist} appointments={appointments} />
      </main>
    </div>
  );
}

interface ConsultationViewProps {
  appointment: Appointment;
  userId: string;
  specialist: { id: string; name: string; authUid: string } | null;
  appointments: Appointment[];
}

function ConsultationView({ appointment, userId, specialist, appointments }: ConsultationViewProps) {
  const [now, setNow] = useState(new Date());
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const scheduledDate = new Date(appointment.scheduledAt);
  const minutesBefore = differenceInMinutes(scheduledDate, now);
  const minutesAfter = differenceInMinutes(now, scheduledDate);
  const duration = appointment.durationMinutes || 30;
  // Fix 9: Use JOIN_WINDOW_MINUTES constant
  const isWithinJoinWindow = minutesBefore <= JOIN_WINDOW_MINUTES && minutesAfter <= (duration + JOIN_WINDOW_MINUTES);
  const isValidRoom = appointment.meetingUrl?.startsWith('consultation-') || appointment.meetingUrl?.startsWith('https://meet.jit.si/');
  const isLegacyJitsi = appointment.meetingUrl?.startsWith('https://meet.jit.si/');

  const isAudio = appointment.consultationType === 'audio';
  const CallIcon = isAudio ? Phone : Video;
  const isSessionEnded = appointment.status === 'completed' || appointment.status === 'rated';
  const hasDoctorJoined = !!appointment.doctorJoinedAt;
  const hasDoctorLeft = !!appointment.doctorLeftAt;

  // Doctor can open the room if within join window and hasn't started yet
  const canOpenRoom = !hasDoctorJoined && !isSessionEnded && isWithinJoinWindow &&
    (appointment.status === 'confirmed' || appointment.status === 'inProgress');

  // Doctor can rejoin if already started and session not ended
  const canRejoinCall = hasDoctorJoined && !hasDoctorLeft && !isSessionEnded && isValidRoom;

  const [showCall, setShowCall] = useState(false);

  // E2EE negotiation state
  const [callToken, setCallToken] = useState<string | null>(null);
  const [e2eeKey, setE2eeKey] = useState<string | null>(null);
  const [sessionE2ee, setSessionE2ee] = useState(false);
  const [e2eeResolved, setE2eeResolved] = useState(false);
  // Tracks whether doctor manually left the call (prevents auto-rejoin)
  const [manuallyLeft, setManuallyLeft] = useState(false);
  // Fix 15: patientReady state — patient has joined and E2EE is negotiated
  const [patientReady, setPatientReady] = useState(false);

  // Fix 12: styled end-session modal
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  // Fix 15: refund-aware cancel modal
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Doctor is waiting for patient when: room opened but E2EE not yet resolved
  const isPatientE2eeResolved = appointment.sessionE2ee !== undefined && appointment.sessionE2ee !== null;
  const waitingForPatient = hasDoctorJoined && !hasDoctorLeft && !isSessionEnded && !isLegacyJitsi && !showCall && !isPatientE2eeResolved && !patientReady;

  const displayName = appointment.anonymousMode
    ? appointment.anonymousAlias || 'Anonymous Patient'
    : appointment.patientName || 'Patient';

  // Patient key for workspace (anonymous sessions use anon:{appointmentId})
  const patientKey = appointment.anonymousMode
    ? `anon:${appointment.id}`
    : userId;

  // Fix 10: Real document count
  const { notes: patientNotes } = usePatientNotes(specialist?.id ?? '', patientKey);
  const { documents: patientDocuments } = usePatientDocuments(specialist?.id ?? '', patientKey);
  const sessionNotes = patientNotes.filter(n => n.appointmentId === appointment.id);
  const sessionDocuments = patientDocuments.filter(d => d.appointmentId === appointment.id);

  // Fetch token with E2EE config from Cloud Function
  const fetchTokenWithE2EE = useCallback(async (useE2EE: boolean) => {
    if (!specialist || !appointment.meetingUrl) return;
    try {
      const getToken = httpsCallable(functions, 'getLivekitToken');
      const result = await getToken({
        roomName: appointment.meetingUrl,
        participantName: specialist.name,
        role: 'doctor',
        e2eeEnabled: useE2EE,
      });
      const data = result.data as { token: string; e2eeKey?: string };
      setCallToken(data.token);
      setE2eeKey(data.e2eeKey ?? null);
      setSessionE2ee(useE2EE);
      setPatientReady(true);
      setShowCall(true);
    } catch (err) {
      console.error('Failed to fetch call token:', err);
    }
  }, [specialist, appointment.meetingUrl]);

  // Listen for patient's E2EE capability (sessionE2ee field) after doctor opens room
  useEffect(() => {
    if (!waitingForPatient && !canRejoinCall) return;
    if (isLegacyJitsi) return;
    // Don't auto-connect if doctor manually left the call
    if (manuallyLeft) return;

    // If sessionE2ee is already resolved (rejoin case), use it immediately
    if (appointment.sessionE2ee !== undefined && appointment.sessionE2ee !== null) {
      if (!e2eeResolved) {
        setE2eeResolved(true);
        fetchTokenWithE2EE(appointment.sessionE2ee);
      }
      return;
    }

    // Listen for changes on the appointment document
    const unsub = onSnapshot(
      doc(db, 'users', userId, 'appointments', appointment.id),
      (snap) => {
        const data = snap.data();
        if (data?.sessionE2ee !== undefined && data?.sessionE2ee !== null) {
          setE2eeResolved(true);
          fetchTokenWithE2EE(data.sessionE2ee as boolean);
        }
      },
    );
    return unsub;
  }, [waitingForPatient, canRejoinCall, isLegacyJitsi, appointment.sessionE2ee, appointment.id, userId, e2eeResolved, manuallyLeft, fetchTokenWithE2EE]);

  const handleOpenRoom = async () => {
    setStarting(true);
    try {
      await markDoctorJoined(userId, appointment.id, supportsE2EE());
    } catch (err) {
      console.error('Failed to open room:', err);
    } finally {
      setStarting(false);
    }
  };

  // Fix 15: Start session sets status to inProgress
  const handleStartSession = async () => {
    if (appointment.sessionE2ee !== undefined && appointment.sessionE2ee !== null) {
      try {
        await markSessionStarted(userId, appointment.id);
      } catch (err) {
        console.error('Failed to mark session started:', err);
      }
      fetchTokenWithE2EE(appointment.sessionE2ee);
    }
  };

  const handleRejoinSession = () => {
    if (isPatientE2eeResolved) {
      setManuallyLeft(false);
      fetchTokenWithE2EE(appointment.sessionE2ee!);
    }
  };

  // Fix 12: styled end session
  const handleEndSession = async () => {
    setEnding(true);
    try {
      await markDoctorLeft(userId, appointment.id);
      setShowCall(false);
      setShowEndConfirm(false);
    } catch (err) {
      console.error('Failed to end session:', err);
    } finally {
      setEnding(false);
    }
  };

  // Fix 15: Refund-aware cancel
  const isPaid = appointment.paymentStatus === 'success';
  const willRefund = isPaid && (!hasDoctorJoined || patientReady);

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    try {
      await cancelAppointmentByDoctor(userId, appointment.id, cancelReason.trim(), willRefund);
      setShowCancelConfirm(false);
      setCancelReason('');
    } catch (err) {
      console.error('Failed to cancel:', err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/portal/dashboard"
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consultation Room</h1>
          <p className="text-sm text-slate-500">
            Session with {displayName}
          </p>
        </div>
        {isSessionEnded && (
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
            Session Ended
          </span>
        )}
        {showCall && !isSessionEnded && (
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">
            In Session
          </span>
        )}
        {canRejoinCall && !showCall && !isSessionEnded && !waitingForPatient && !patientReady && (
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold bg-violet-100 text-violet-700">
            Session Started
          </span>
        )}
      </div>

      {/* Post-Session Summary (Fix 10: real document count) */}
      {isSessionEnded && (
        <>
          <PostSessionSummary
            doctorJoinedAt={appointment.doctorJoinedAt}
            doctorLeftAt={appointment.doctorLeftAt}
            consultationType={appointment.consultationType}
            patientName={displayName}
            rating={appointment.rating}
            ratingComment={appointment.ratingComment}
            notesCount={sessionNotes.length}
            documentsCount={sessionDocuments.length}
          />
          <NextSessionCard appointments={appointments} currentAppointment={appointment} />
        </>
      )}

      {/* Embedded LiveKit Call */}
      {showCall && !isLegacyJitsi && appointment.meetingUrl && specialist && callToken && (
        <div className="mb-6 rounded-2xl overflow-hidden border border-slate-200 relative" style={{ height: '500px' }}>
          {sessionE2ee && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-xs font-medium backdrop-blur-sm">
              <Shield className="w-3.5 h-3.5" />
              End-to-End Encrypted
            </div>
          )}
          <LiveKitCall
            roomName={appointment.meetingUrl}
            participantName={specialist.name}
            isAudio={isAudio}
            onDisconnected={() => {
              setShowCall(false);
              setManuallyLeft(true);
              // Fix 1: Reset state on disconnect
              setPatientReady(false);
              setCallToken(null);
              setE2eeKey(null);
            }}
            token={callToken}
            e2eeEnabled={sessionE2ee}
            e2eeKey={e2eeKey ?? undefined}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Session Controls + Patient Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Session Controls Card (Fix 6: unified) */}
          <div className={`p-5 rounded-2xl border ${
            waitingForPatient
              ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200/40'
              : patientReady && !showCall
                ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200/40'
                : canRejoinCall && !showCall && !waitingForPatient
                  ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200/40'
                  : canOpenRoom
                    ? 'bg-violet-50 border-violet-200 ring-1 ring-violet-200/40'
                    : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <CallIcon className={`w-5 h-5 ${
                waitingForPatient ? 'text-amber-600'
                : patientReady || canRejoinCall ? 'text-emerald-600'
                : canOpenRoom ? 'text-violet-600'
                : 'text-slate-400'
              }`} />
              <h3 className="font-semibold text-sm text-slate-800">Session Controls</h3>
            </div>

            {/* Step 1: Open Room (sets doctorJoinedAt) */}
            {canOpenRoom && (
              <button
                onClick={handleOpenRoom}
                disabled={starting}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {starting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CallIcon className="w-4 h-4" />
                )}
                {starting ? 'Opening...' : 'Open Room'}
              </button>
            )}

            {/* Waiting for Patient (Fix 6: styled amber card) */}
            {waitingForPatient && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Room Open</span>
                </div>
                <p className="text-sm font-medium text-amber-800">Waiting for patient to join...</p>
                <p className="text-xs text-amber-600 mt-1">The patient has been notified that the room is open</p>
              </div>
            )}

            {/* Patient Ready — Start Session (Fix 6: styled emerald card) */}
            {patientReady && !showCall && !manuallyLeft && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Patient Joined</span>
                </div>
                <p className="text-sm font-medium text-emerald-800 mb-3">Patient has joined — start when ready</p>
                <button
                  onClick={handleStartSession}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <CallIcon className="w-4 h-4" />
                  Start Session
                </button>
              </div>
            )}

            {/* Rejoin Call (Fix 1: shows after disconnect) */}
            {canRejoinCall && !showCall && !waitingForPatient && !patientReady && (
              isLegacyJitsi ? (
                <a
                  href={appointment.meetingUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <CallIcon className="w-4 h-4" />
                  Rejoin {isAudio ? 'Audio' : 'Video'} Call
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  onClick={handleRejoinSession}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <CallIcon className="w-4 h-4" />
                  Rejoin {isAudio ? 'Audio' : 'Video'} Call
                </button>
              )
            )}

            {/* Session ended */}
            {isSessionEnded && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Session completed
              </div>
            )}

            {/* Not yet in join window (Fix 16: dynamic countdown) */}
            {!canOpenRoom && !canRejoinCall && !isSessionEnded && !waitingForPatient && !patientReady && !showCall && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
                {minutesBefore > JOIN_WINDOW_MINUTES
                  ? `Starts in ${minutesBefore} min — join window opens in ${minutesBefore - JOIN_WINDOW_MINUTES} min`
                  : 'Join window has passed'}
              </div>
            )}

            {/* Fix 15: Cancel Appointment — only before session starts (status still confirmed) */}
            {!isSessionEnded && appointment.status === 'confirmed' && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="mt-3 w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Cancel Appointment
              </button>
            )}

            {/* Fix 15: End Session — only after session has started (status is inProgress) */}
            {!isSessionEnded && appointment.status === 'inProgress' && (
              <button
                onClick={() => setShowEndConfirm(true)}
                disabled={ending}
                className="mt-3 w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {ending ? 'Ending...' : 'End Session'}
              </button>
            )}
          </div>

          {/* Patient Info Card */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white">
            <h3 className="font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Patient Info
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Name:</span>
                <span className="font-medium text-slate-700">{displayName}</span>
                {appointment.anonymousMode && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-violet-100 text-violet-600">Anonymous</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600">{format(scheduledDate, 'EEEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600">
                  {format(scheduledDate, 'hh:mm a')} · {appointment.durationMinutes || 30} min
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Type:</span>
                <span className="capitalize text-slate-700">{appointment.consultationType}</span>
              </div>
            </div>

            {appointment.notes && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Patient Notes</p>
                <p className="text-sm text-slate-700">{appointment.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Workspace (Notes/Documents/History) */}
        <div className="lg:col-span-2">
          {specialist && (
            <ConsultationWorkspace
              specialistId={specialist.id}
              patientKey={patientKey}
              userId={userId}
              appointmentId={appointment.id}
              appointments={appointments}
              isAnonymous={appointment.anonymousMode}
            />
          )}
        </div>
      </div>

      {/* Fix 12: Styled End Session Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">End Session?</h3>
            <p className="text-sm text-slate-500 mb-4">
              This will mark the appointment as completed. The patient will be notified.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Continue Session
              </button>
              <button
                onClick={handleEndSession}
                disabled={ending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'End Session'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Fix 15: Refund-Aware Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">Cancel Appointment?</h3>
            {willRefund ? (
              <p className="text-sm text-slate-500 mb-1">
                The patient will receive a <span className="font-semibold text-emerald-600">full refund</span>. This will be deducted from your earnings.
              </p>
            ) : isPaid ? (
              <p className="text-sm text-slate-500 mb-1">
                The patient did not join the session. <span className="font-semibold text-slate-700">No refund</span> will be issued.
              </p>
            ) : (
              <p className="text-sm text-slate-500 mb-1">This appointment has no payment on record.</p>
            )}
            <div className="mt-3 mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason for cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-red-500/30 focus:border-red-400 outline-none transition-all resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelConfirm(false); setCancelReason(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason.trim() || cancelling}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Appointment'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
