'use client';

import { useEffect, useState, useMemo } from 'react';
import { watchAppointmentsForSpecialist } from '../firestore';
import type { Appointment } from '../types';

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

  const inProgress = appointments.filter((a) => a.status === 'inProgress');

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
