/**
 * Consultation Session Engine
 *
 * Single source of truth for session phase computation.
 * Pure function — no React, no side effects.
 * Used by Dashboard, Appointments, and Consultation Room pages.
 */

import { differenceInMinutes } from 'date-fns';
import type { Appointment } from './types';
import { APPOINTMENT_STATUS_LABELS, JOIN_WINDOW_MINUTES } from './types';

// ── Phase type ──────────────────────────────────────────────────────

export type SessionPhase =
  | 'idle'
  | 'approaching'
  | 'canOpenRoom'
  | 'roomOpen'
  | 'patientReady'
  | 'inSession'
  | 'disconnected'
  | 'ended'
  | 'cancelled'
  | 'noShow';

// ── Phase info returned by the engine ───────────────────────────────

export interface SessionPhaseInfo {
  phase: SessionPhase;
  badge: { text: string; className: string };
  primaryAction: {
    label: string;
    className: string;
    href?: string;
    action?: 'openRoom' | 'goToRoom' | 'startSession' | 'rejoinSession';
  } | null;
  canCancel: boolean;
  canEnd: boolean;
  bannerText: string | null;
  minutesUntil: number;
}

// ── Options ─────────────────────────────────────────────────────────

interface SessionPhaseOptions {
  /** Whether the doctor is currently viewing the active call UI (consultation page only) */
  isInCall?: boolean;
}

// ── Core engine ─────────────────────────────────────────────────────

export function getSessionPhase(
  appointment: Appointment,
  now: Date,
  options: SessionPhaseOptions = {},
): SessionPhaseInfo {
  const { isInCall = false } = options;

  const scheduledDate = new Date(appointment.scheduledAt);
  const minutesBefore = differenceInMinutes(scheduledDate, now);
  const minutesAfter = differenceInMinutes(now, scheduledDate);
  const duration = appointment.durationMinutes || 30;
  const isWithinJoinWindow =
    minutesBefore <= JOIN_WINDOW_MINUTES &&
    minutesAfter <= (duration + JOIN_WINDOW_MINUTES);

  const hasDoctorJoined = !!appointment.doctorJoinedAt;
  const hasDoctorLeft = !!appointment.doctorLeftAt;
  const isSessionEnded = appointment.status === 'completed' || appointment.status === 'rated';
  const isValidRoom =
    appointment.meetingUrl?.startsWith('consultation-') ||
    appointment.meetingUrl?.startsWith('https://meet.jit.si/');
  const isPatientE2eeResolved =
    appointment.sessionE2ee !== undefined && appointment.sessionE2ee !== null;
  const isAudio = appointment.consultationType === 'audio';

  const consultationHref = `/portal/consultation?appointmentId=${appointment.id}`;

  // Shared base
  const base = { minutesUntil: minutesBefore };

  // ── 1. Cancelled ──────────────────────────────────────────────────
  if (appointment.status === 'cancelled') {
    return {
      ...base,
      phase: 'cancelled',
      badge: { text: 'Cancelled', className: 'bg-red-100 text-red-800' },
      primaryAction: null,
      canCancel: false,
      canEnd: false,
      bannerText: null,
    };
  }

  // ── 2. Ended ──────────────────────────────────────────────────────
  if (isSessionEnded) {
    const isRated = appointment.status === 'rated';
    return {
      ...base,
      phase: 'ended',
      badge: {
        text: isRated ? 'Rated' : 'Completed',
        className: isRated ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600',
      },
      primaryAction: null,
      canCancel: false,
      canEnd: false,
      bannerText: null,
    };
  }

  // ── 3. In Session (call active) ───────────────────────────────────
  if (appointment.status === 'inProgress' && isInCall) {
    return {
      ...base,
      phase: 'inSession',
      badge: { text: 'In Session', className: 'bg-emerald-100 text-emerald-700' },
      primaryAction: null,
      canCancel: false,
      canEnd: true,
      bannerText: 'Session in progress',
    };
  }

  // ── 4. Disconnected (mid-session, call not active) ────────────────
  if (appointment.status === 'inProgress' && hasDoctorJoined && !hasDoctorLeft && isValidRoom) {
    return {
      ...base,
      phase: 'disconnected',
      badge: { text: 'Reconnect', className: 'bg-red-100 text-red-700' },
      primaryAction: {
        label: `Rejoin ${isAudio ? 'Audio' : 'Video'} Session`,
        className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        href: `${consultationHref}&action=rejoin`,
        action: 'rejoinSession',
      },
      canCancel: false,
      canEnd: true,
      bannerText: 'Session interrupted — rejoin now',
    };
  }

  // ── 5. Patient Ready (E2EE resolved, waiting for doctor to start) ─
  if (
    hasDoctorJoined && !hasDoctorLeft &&
    isPatientE2eeResolved &&
    (appointment.status === 'confirmed' || appointment.status === 'inProgress')
  ) {
    return {
      ...base,
      phase: 'patientReady',
      badge: { text: 'Patient Joined', className: 'bg-emerald-100 text-emerald-700' },
      primaryAction: {
        label: 'Go to Room',
        className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        href: consultationHref,
        action: 'goToRoom',
      },
      canCancel: true,
      canEnd: false,
      bannerText: 'Patient is ready — start the session',
    };
  }

  // ── 6. Room Open (waiting for patient) ────────────────────────────
  if (
    hasDoctorJoined && !hasDoctorLeft &&
    (appointment.status === 'confirmed' || appointment.status === 'inProgress')
  ) {
    return {
      ...base,
      phase: 'roomOpen',
      badge: { text: 'Room Open', className: 'bg-blue-100 text-blue-700' },
      primaryAction: {
        label: 'Go to Room',
        className: 'bg-blue-600 hover:bg-blue-700 text-white',
        href: consultationHref,
        action: 'goToRoom',
      },
      canCancel: true,
      canEnd: false,
      bannerText: 'Waiting for patient to join...',
    };
  }

  // ── 7. Can Open Room (within join window) ─────────────────────────
  if (
    !hasDoctorJoined && !isSessionEnded && isWithinJoinWindow &&
    (appointment.status === 'confirmed' || appointment.status === 'inProgress')
  ) {
    return {
      ...base,
      phase: 'canOpenRoom',
      badge: { text: 'Ready', className: 'bg-violet-100 text-violet-700' },
      primaryAction: {
        label: 'Open Room',
        className: 'bg-violet-600 hover:bg-violet-700 text-white',
        action: 'openRoom',
      },
      canCancel: true,
      canEnd: false,
      bannerText: 'Session is ready — open the room',
    };
  }

  // ── 8. Approaching (within 60 min but outside join window) ────────
  if (
    minutesBefore > 0 && minutesBefore <= 60 && !isWithinJoinWindow &&
    appointment.status === 'confirmed'
  ) {
    return {
      ...base,
      phase: 'approaching',
      badge: { text: `Starts in ${minutesBefore} min`, className: 'bg-amber-100 text-amber-700' },
      primaryAction: null,
      canCancel: true,
      canEnd: false,
      bannerText: `Session starts in ${minutesBefore} min`,
    };
  }

  // ── 9. No Show (session window passed, doctor never joined) ───────
  if (
    appointment.status === 'confirmed' && !hasDoctorJoined
  ) {
    const sessionEndMs = scheduledDate.getTime() + duration * 60 * 1000;
    if (now.getTime() > sessionEndMs) {
      return {
        ...base,
        phase: 'noShow',
        badge: { text: 'No Show', className: 'bg-red-100 text-red-700' },
        primaryAction: null,
        canCancel: false,
        canEnd: false,
        bannerText: null,
      };
    }
  }

  // ── 10. Idle (default) ────────────────────────────────────────────
  const canCancelIdle =
    appointment.status === 'confirmed' ||
    appointment.status === 'pending' ||
    appointment.status === 'pendingPayment';

  return {
    ...base,
    phase: 'idle',
    badge: {
      text: APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status,
      className: 'bg-slate-100 text-slate-600',
    },
    primaryAction: null,
    canCancel: canCancelIdle,
    canEnd: false,
    bannerText: null,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Returns appointments that should appear in the "Active Sessions" section */
export function getActiveSessions(appointments: Appointment[], now: Date): Appointment[] {
  const activePhases: SessionPhase[] = ['canOpenRoom', 'roomOpen', 'patientReady', 'disconnected'];
  return appointments.filter((a) => activePhases.includes(getSessionPhase(a, now).phase));
}

/** Returns appointments eligible for "starting soon" notifications (excludes room-opened) */
export function getApproachingSessions(appointments: Appointment[], now: Date) {
  return appointments
    .map((a) => ({ appointment: a, phaseInfo: getSessionPhase(a, now) }))
    .filter(({ phaseInfo }) => phaseInfo.phase === 'approaching')
    .map(({ appointment, phaseInfo }) => ({
      appointment,
      minutesUntil: phaseInfo.minutesUntil,
    }))
    .sort((a, b) => a.minutesUntil - b.minutesUntil);
}

/** Returns confirmed appointments where doctor never joined and session window has passed */
export function getNoShowAppointments(appointments: Appointment[], now: Date): Appointment[] {
  return appointments.filter((a) => getSessionPhase(a, now).phase === 'noShow');
}

/** Derive the best banner header for a set of active sessions */
export function getActiveSessionsBannerHeader(
  activeSessions: Appointment[],
  now: Date,
): string {
  const phases = activeSessions.map((a) => getSessionPhase(a, now).phase);
  if (phases.includes('disconnected')) return 'Session interrupted — rejoin now';
  if (phases.includes('patientReady')) return 'Patient ready — start session';
  if (phases.includes('roomOpen')) return 'Waiting for patient to join';
  return `${activeSessions.length} active session${activeSessions.length !== 1 ? 's' : ''}`;
}

/** Card background classes derived from phase — each phase has a distinct color */
export function getCardBackground(phase: SessionPhase): string {
  switch (phase) {
    case 'canOpenRoom':
      return 'bg-violet-50/50 border-violet-200/60 shadow-sm ring-1 ring-violet-200/40';
    case 'roomOpen':
      return 'bg-blue-50/50 border-blue-200/60 shadow-sm ring-1 ring-blue-200/40';
    case 'patientReady':
    case 'inSession':
      return 'bg-emerald-50/50 border-emerald-200/60 shadow-sm ring-1 ring-emerald-200/40';
    case 'disconnected':
      return 'bg-red-50/50 border-red-200/60 shadow-sm ring-1 ring-red-200/40';
    case 'approaching':
      return 'bg-amber-50/50 border-amber-200/60 shadow-sm';
    case 'cancelled':
    case 'noShow':
      return 'bg-red-50/30 border-red-200/40';
    default:
      return 'bg-white border-slate-200/60 hover:border-slate-300';
  }
}
