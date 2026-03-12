'use client';

import { useEffect, useState, useMemo } from 'react';
import { watchAppointmentsForSpecialist } from '../firestore';
import type { Appointment } from '../types';

/**
 * An inProgress appointment is considered stale if the scheduled time
 * plus 3× the session duration has already passed. This handles sessions
 * that ended without a proper completion event (e.g. app crash, network drop).
 * Stale sessions are excluded from the active inProgress list and treated
 * as completed for sorting/display.
 */
export function isStaleInProgress(apt: Appointment): boolean {
  if (apt.status !== 'inProgress') return false;
  const cutoff = new Date(apt.scheduledAt).getTime() + (apt.durationMinutes || 30) * 3 * 60 * 1000;
  return Date.now() > cutoff;
}

export function useAppointments(specialistId: string | undefined) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialistId) {
      setLoading(false);
      return;
    }

    const unsubscribe = watchAppointmentsForSpecialist(specialistId, (data) => {
      setAppointments(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [specialistId]);

  const upcoming = appointments.filter(
    (a) => a.status === 'confirmed' && new Date(a.scheduledAt) > new Date(),
  );

  const completed = appointments.filter(
    (a) => a.status === 'completed' || a.status === 'rated',
  );

  const cancelled = appointments.filter((a) => a.status === 'cancelled');

  // Exclude stale inProgress appointments — they won't appear in the active list
  const inProgress = appointments.filter(
    (a) => a.status === 'inProgress' && !isStaleInProgress(a),
  );

  const paid = appointments.filter((a) => a.paymentStatus === 'success');

  const today = appointments.filter((a) => {
    const d = new Date(a.scheduledAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  // Group appointments by patient userId for patient aggregation
  const patientMap = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const apt of appointments) {
      if (!map[apt.userId]) {
        map[apt.userId] = [];
      }
      map[apt.userId].push(apt);
    }
    return map;
  }, [appointments]);

  const uniquePatientCount = Object.keys(patientMap).length;

  return {
    appointments,
    upcoming,
    completed,
    cancelled,
    inProgress,
    paid,
    today,
    patientMap,
    uniquePatientCount,
    loading,
  };
}
