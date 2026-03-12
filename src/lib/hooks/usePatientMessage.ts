'use client';

import { useEffect, useState } from 'react';
import { watchPatientMessage } from '../firestore';
import type { PatientMessage } from '../types';

export function usePatientMessage(
  specialistId: string | undefined,
  patientUserId: string | undefined,
) {
  const [message, setMessage] = useState<PatientMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialistId || !patientUserId) {
      setMessage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = watchPatientMessage(specialistId, patientUserId, (data) => {
      setMessage(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [specialistId, patientUserId]);

  return { message, loading };
}
