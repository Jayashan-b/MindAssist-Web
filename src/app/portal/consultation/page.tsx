'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
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
  Hash,
  ShieldQuestion,
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
import ConsultationWorkspace from '@/components/portal/ConsultationWorkspace';
import PostSessionSummary from '@/components/portal/PostSessionSummary';
import NextSessionCard from '@/components/portal/NextSessionCard';
import { supportsE2EE } from '@/lib/e2ee';
import { sessionRefId, patientRefId } from '@/lib/utils/referenceIds';
import { usePatientNotes } from '@/lib/hooks/usePatientNotes';
import { useCallSession } from '@/lib/hooks/useCallSession';
import type { Appointment } from '@/lib/types';
import { JOIN_WINDOW_MINUTES } from '@/lib/types';
import { getSessionPhase } from '@/lib/consultation-session';
import PatientAvatar from '@/components/portal/PatientAvatar';

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
        <main className="flex-1 p-6 lg:p-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-200" />
              <div className="space-y-2">
                <div className="h-5 w-48 bg-slate-200 rounded-lg" />
                <div className="h-3 w-64 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="aspect-video max-h-[50vh] bg-slate-200 rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="h-48 bg-slate-200 rounded-2xl" />
                <div className="h-56 bg-slate-200 rounded-2xl" />
              </div>
              <div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl" />
            </div>
          </div>
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
      <main className="flex-1 p-6 lg:p-8">
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
  const callSession = useCallSession();
  // Destructure startCall for a stable reference (it's a useCallback with [] deps)
  const { startCall } = callSession;
  const videoSlotRef = useRef<HTMLDivElement>(null);
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

  // Derive showCall from context: connected AND for THIS appointment
  const showCall = callSession.isConnected && callSession.activeAppointmentId === appointment.id;

  // Attach the persistent VideoConference portal host into our slot container
  useEffect(() => {
    const slot = videoSlotRef.current;
    const host = callSession.videoPortalHost;
    if (slot && host && showCall) {
      host.className = 'h-full';
      slot.appendChild(host);
      // Browsers pause <video> elements when moved via appendChild.
      // Resume any paused videos after reattachment.
      requestAnimationFrame(() => {
        host.querySelectorAll('video').forEach((v) => {
          if (v.paused && v.srcObject) v.play().catch(() => {});
        });
      });
      return () => {
        // Park portal host back in hidden container instead of removing from DOM.
        // Keeps LiveKit video tracks alive during navigation.
        const parking = document.querySelector<HTMLDivElement>('[data-portal-parking]');
        if (parking) parking.appendChild(host);
      };
    }
  }, [callSession.videoPortalHost, showCall]);

  // E2EE negotiation state (only e2eeResolved + patientReady remain local — they're per-appointment UI state)
  // Derive initial value from provider: if already connected for this appointment, skip re-negotiation
  const [e2eeResolved, setE2eeResolved] = useState(
    () => callSession.isConnected && callSession.activeAppointmentId === appointment.id
  );
  // patientReady state — patient has joined and E2EE is negotiated
  const [patientReady, setPatientReady] = useState(
    () => callSession.isConnected && callSession.activeAppointmentId === appointment.id
  );

  // Reset patientReady when call disconnects (e.g. network drop or leave)
  const prevShowCall = useRef(showCall);
  useEffect(() => {
    if (prevShowCall.current && !showCall) {
      setPatientReady(false);
    }
    prevShowCall.current = showCall;
  }, [showCall]);

  // Engine phase for UI rendering (single source of truth)
  const enginePhase = getSessionPhase(appointment, now, {
    isInCall: showCall,
    hasBeenInSession: callSession.hasBeenInSession(appointment.id),
  }).phase;

  // Styled end-session modal
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  // Refund-aware cancel modal
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Doctor is waiting for patient when: room opened but E2EE not yet resolved
  const isPatientE2eeResolved = appointment.sessionE2ee !== undefined && appointment.sessionE2ee !== null;

  const waitingForPatient = hasDoctorJoined && !hasDoctorLeft && !isSessionEnded && !isLegacyJitsi && !showCall && !isPatientE2eeResolved && !patientReady;

  const displayName = appointment.anonymousMode
    ? appointment.anonymousAlias || 'Anonymous Patient'
    : appointment.patientName || 'Patient';

  // Replace LiveKit's "Messages" header with patient name (iOS/WhatsApp style)
  useEffect(() => {
    if (!showCall) return;
    const host = callSession.videoPortalHost;
    if (!host) return;
    const replaceHeader = () => {
      const header = host.querySelector('.lk-chat-header');
      if (header) {
        Array.from(header.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .forEach((n) => {
            if (n.textContent?.trim() === 'Messages') n.textContent = displayName;
          });
      }
    };
    replaceHeader();
    const observer = new MutationObserver(replaceHeader);
    observer.observe(host, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [callSession.videoPortalHost, showCall, displayName]);

  // Patient key for workspace (anonymous sessions use anon:{appointmentId})
  const patientKey = appointment.anonymousMode
    ? `anon:${appointment.id}`
    : userId;

  // Real document count
  const { notes: patientNotes } = usePatientNotes(specialist?.id ?? '', patientKey);
  const { documents: patientDocuments } = usePatientDocuments(specialist?.id ?? '', patientKey);
  const sessionNotes = patientNotes.filter(n => n.appointmentId === appointment.id);
  const sessionDocuments = patientDocuments.filter(d => d.appointmentId === appointment.id);

  // Fetch token with E2EE config from Cloud Function — calls context's startCall.
  // Uses destructured startCall (stable ref) to avoid re-creating this callback on every render.
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
      setPatientReady(true);
      await startCall({
        appointmentId: appointment.id,
        appointment,
        token: data.token,
        e2eeKey: data.e2eeKey,
        sessionE2ee: useE2EE,
      });
    } catch (err) {
      console.error('Failed to fetch call token:', err);
    }
  }, [specialist, appointment, startCall]);

  // Effect A: Listen for patient's E2EE capability — only updates UI state, does NOT connect to LiveKit.
  // Doctor must click "Start Session" to actually connect.
  useEffect(() => {
    if (!waitingForPatient) return;
    if (isLegacyJitsi) return;

    // If already resolved from Firestore data, just sync local state
    if (appointment.sessionE2ee !== undefined && appointment.sessionE2ee !== null) {
      if (!e2eeResolved) setE2eeResolved(true);
      if (!patientReady) setPatientReady(true);
      return;
    }

    // Listen for patient setting sessionE2ee field
    const unsub = onSnapshot(
      doc(db, 'users', userId, 'appointments', appointment.id),
      (snap) => {
        const data = snap.data();
        if (data?.sessionE2ee !== undefined && data?.sessionE2ee !== null) {
          setE2eeResolved(true);
          setPatientReady(true);
        }
      },
    );
    return unsub;
  }, [waitingForPatient, isLegacyJitsi, appointment.sessionE2ee, appointment.id, userId, e2eeResolved, patientReady]);

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

  // Start session sets status to inProgress
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
      fetchTokenWithE2EE(appointment.sessionE2ee!);
    }
  };

  // Auto-reconnect: if session is still active in Firestore but client lost connection
  // (e.g., HMR reload, browser refresh), automatically rejoin without user action.
  const hasAutoRejoined = useRef(false);
  useEffect(() => {
    if (
      enginePhase === 'disconnected' &&
      !showCall &&
      !hasAutoRejoined.current &&
      isPatientE2eeResolved &&
      !isLegacyJitsi
    ) {
      hasAutoRejoined.current = true;
      fetchTokenWithE2EE(appointment.sessionE2ee!);
    }
    if (enginePhase !== 'disconnected') {
      hasAutoRejoined.current = false;
    }
  }, [enginePhase, showCall, isPatientE2eeResolved, isLegacyJitsi, appointment.sessionE2ee, fetchTokenWithE2EE]);

  // End session — calls context's endCall
  const handleEndSession = async () => {
    setEnding(true);
    try {
      await markDoctorLeft(userId, appointment.id);
      callSession.endCall();
      setShowEndConfirm(false);
    } catch (err) {
      console.error('Failed to end session:', err);
    } finally {
      setEnding(false);
    }
  };

  // Refund-aware cancel
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

  // Phase-based card styling
  const sessionControlsClass = (() => {
    switch (enginePhase) {
      case 'roomOpen': return 'bg-gradient-to-br from-blue-50 to-white border-blue-200/60 ring-1 ring-blue-100/50';
      case 'patientReady': return 'bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white border-emerald-200/60 ring-1 ring-emerald-200/40 shadow-md shadow-emerald-100/30';
      case 'disconnected': return 'bg-gradient-to-br from-red-50 to-white border-red-200/60 ring-1 ring-red-200/40';
      case 'canOpenRoom': return 'bg-gradient-to-br from-violet-50 to-white border-violet-200/60 ring-1 ring-violet-100/50 shadow-sm';
      default: return 'bg-white border-slate-200/60 shadow-sm';
    }
  })();

  const callIconColor = (() => {
    switch (enginePhase) {
      case 'roomOpen': return 'text-blue-600';
      case 'patientReady': case 'disconnected': return 'text-emerald-600';
      case 'canOpenRoom': return 'text-violet-600';
      default: return 'text-slate-400';
    }
  })();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
    >
      {/* Header */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } }}
        className="flex items-center gap-3 mb-6"
      >
        <Link
          href="/portal/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Consultation Room</h1>
          <p className="text-[13px] text-slate-500 mt-0.5 flex items-center gap-1.5">
            <CallIcon className="w-3.5 h-3.5" />
            {isAudio ? 'Audio' : 'Video'} session with {displayName}
            {' · '}{format(scheduledDate, 'MMM d')}{' · '}{appointment.durationMinutes || 30} min
          </p>
        </div>
        <AnimatePresence mode="wait">
          {isSessionEnded && (
            <motion.span key="ended" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              Session Ended
            </motion.span>
          )}
          {showCall && !isSessionEnded && (
            <motion.span key="in-session" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              In Session
            </motion.span>
          )}
          {enginePhase === 'disconnected' && !showCall && (
            <motion.span key="reconnect" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              Reconnect
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Post-Session Summary */}
      {isSessionEnded && (
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } }}>
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
        </motion.div>
      )}

      {/* Reconnecting placeholder — shown when session active but client reconnecting */}
      {!showCall && enginePhase === 'disconnected' && !isLegacyJitsi && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="mb-6"
        >
          <div className="aspect-video max-h-[65vh] min-h-[400px] w-full rounded-2xl overflow-hidden bg-slate-950 ring-1 ring-white/10 shadow-2xl shadow-black/20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-white/60">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              <span className="text-sm font-medium">Reconnecting to session...</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cinematic Video Area */}
      {showCall && !isLegacyJitsi && appointment.meetingUrl && specialist && callSession.callToken && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="mb-6 relative group"
        >
          <div className="aspect-video max-h-[65vh] min-h-[400px] w-full rounded-2xl overflow-hidden bg-slate-950 ring-1 ring-white/10 shadow-2xl shadow-black/20 relative">
            {callSession.sessionE2ee && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white/90 text-xs font-medium shadow-lg">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                End-to-End Encrypted
              </div>
            )}
            <div ref={videoSlotRef} className="h-full w-full" />
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Session Controls + Patient Info */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } }}
          className="lg:col-span-1 space-y-4"
        >
          {/* Session Controls Card */}
          <div className={`p-5 rounded-2xl border transition-all duration-300 ${sessionControlsClass}`}>
            <div className="flex items-center gap-2 mb-4">
              <CallIcon className={`w-4.5 h-4.5 ${callIconColor}`} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Session Controls</h3>
            </div>

            {/* Step 1: Open Room */}
            {canOpenRoom && (
              <button
                onClick={handleOpenRoom}
                disabled={starting}
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CallIcon className="w-4 h-4" />}
                {starting ? 'Opening...' : 'Open Room'}
              </button>
            )}

            {/* Waiting for Patient */}
            {enginePhase === 'roomOpen' && !showCall && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="w-2.5 h-2.5 bg-blue-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  />
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Room Open</span>
                </div>
                <p className="text-sm font-medium text-blue-800">Waiting for patient to join...</p>
                <p className="text-xs text-blue-600/80 mt-1">The patient has been notified</p>
              </div>
            )}

            {/* Patient Ready — Start Session */}
            {enginePhase === 'patientReady' && !showCall && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Patient Joined</span>
                </div>
                <p className="text-sm font-medium text-emerald-800 mb-3">Patient has joined — start when ready</p>
                <button
                  onClick={handleStartSession}
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <CallIcon className="w-4 h-4" />
                  Start Session
                </button>
              </div>
            )}

            {/* Rejoin Call */}
            {enginePhase === 'disconnected' && !showCall && (
              isLegacyJitsi ? (
                <a
                  href={appointment.meetingUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  <CallIcon className="w-4 h-4" />
                  Rejoin {isAudio ? 'Audio' : 'Video'} Call
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  onClick={handleRejoinSession}
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
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

            {/* Not yet in join window */}
            {(enginePhase === 'idle' || enginePhase === 'approaching') && !showCall && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
                {minutesBefore > JOIN_WINDOW_MINUTES
                  ? `Starts in ${minutesBefore} min — join window opens in ${minutesBefore - JOIN_WINDOW_MINUTES} min`
                  : 'Join window has passed'}
              </div>
            )}

            {/* Cancel Appointment */}
            {!isSessionEnded && appointment.status === 'confirmed' && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="mt-3 w-full py-2.5 rounded-xl border border-red-200/80 text-red-600 text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-all"
              >
                Cancel Appointment
              </button>
            )}

            {/* End Session */}
            {!isSessionEnded && appointment.status === 'inProgress' && (
              <button
                onClick={() => setShowEndConfirm(true)}
                disabled={ending}
                className="mt-3 w-full py-2.5 rounded-xl border border-red-200/80 text-red-600 text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50"
              >
                {ending ? 'Ending...' : 'End Session'}
              </button>
            )}
          </div>

          {/* Patient Info Card */}
          <div className="p-5 rounded-2xl border border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3.5 mb-4 pb-4 border-b border-slate-100">
              <PatientAvatar name={displayName} isAnonymous={appointment.anonymousMode} size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base text-slate-900 truncate">{displayName}</h3>
                {appointment.anonymousMode && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-violet-100 text-violet-600 font-medium mt-0.5">
                    <ShieldQuestion className="w-3 h-3" /> Anonymous
                  </span>
                )}
                <p className="text-xs text-slate-400 mt-0.5 capitalize">{appointment.consultationType} session</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50/50">
                <Hash className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Session</p>
                  <p className="font-mono text-xs text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded mt-0.5 select-all truncate">{sessionRefId(appointment.id)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50/50">
                <Hash className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Patient</p>
                  <p className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 select-all truncate">{patientRefId(patientKey)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50/50">
                <Calendar className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Date</p>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">{format(scheduledDate, 'MMM d, yyyy')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50/50">
                <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Time</p>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">{format(scheduledDate, 'hh:mm a')} · {duration} min</p>
                </div>
              </div>
            </div>

            {appointment.notes && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1.5">Patient Notes</p>
                <p className="text-sm text-slate-700 leading-relaxed">{appointment.notes}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Column: Workspace */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } }}
          className="lg:col-span-2"
        >
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
        </motion.div>
      </div>

      {/* End Session Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-white rounded-2xl shadow-2xl shadow-black/10 w-full max-w-sm mx-4 overflow-hidden"
          >
            <div className="h-1 bg-gradient-to-r from-red-500 to-red-400" />
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <CallIcon className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 text-center mb-1">End Session?</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                This will mark the appointment as completed. The patient will be notified.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={handleEndSession}
                  disabled={ending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'End Session'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cancel Appointment Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-white rounded-2xl shadow-2xl shadow-black/10 w-full max-w-md mx-4 overflow-hidden"
          >
            <div className={`h-1 bg-gradient-to-r ${willRefund ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400'}`} />
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Cancel Appointment?</h3>
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
              <div className="mt-3 mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Reason for cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all resize-none"
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Appointment'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
