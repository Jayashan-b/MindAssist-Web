'use client';

import { useEffect, useState } from 'react';
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

  const paid = appointments.filter((a) => a.paymentStatus === 'success');

  return { appointments, upcoming, completed, cancelled, paid, loading };
}
