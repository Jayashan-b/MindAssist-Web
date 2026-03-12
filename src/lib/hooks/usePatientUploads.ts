'use client';

import { useEffect, useState } from 'react';
import { watchPatientUploads } from '../firestore';
import type { PatientUpload } from '../types';

export function usePatientUploads(
  specialistId: string | undefined,
  patientUserId: string | undefined,
) {
  const [uploads, setUploads] = useState<PatientUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialistId || !patientUserId) {
      setUploads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = watchPatientUploads(specialistId, patientUserId, (data) => {
      setUploads(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [specialistId, patientUserId]);

  return { uploads, loading };
}
