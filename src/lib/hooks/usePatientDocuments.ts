'use client';

import { useEffect, useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import {
  watchPatientDocuments,
  addPatientDocument,
  deletePatientDocument,
} from '../firestore';
import type { PatientDocument } from '../types';

export function usePatientDocuments(specialistId: string | undefined, patientUserId: string | undefined) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!specialistId || !patientUserId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = watchPatientDocuments(specialistId, patientUserId, (data) => {
      setDocuments(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [specialistId, patientUserId]);

  const uploadDocument = useCallback(
    async (file: File, description?: string, appointmentId?: string) => {
      if (!specialistId || !patientUserId) return;
      setUploading(true);
      try {
        const timestamp = Date.now();
        const storagePath = `specialists/${specialistId}/patients/${patientUserId}/${timestamp}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const fileUrl = await getDownloadURL(storageRef);

        await addPatientDocument(specialistId, {
          patientUserId,
          fileName: file.name,
          fileUrl,
          fileType: file.type,
          fileSizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
          description: description ?? null,
          appointmentId: appointmentId ?? null,
        });
      } finally {
        setUploading(false);
      }
    },
    [specialistId, patientUserId],
  );

  const removeDocument = useCallback(
    async (docItem: PatientDocument) => {
      if (!specialistId) return;
      // Delete from Storage if URL is from our storage
      try {
        const storageRef = ref(storage, docItem.fileUrl);
        await deleteObject(storageRef);
      } catch {
        // File may already be deleted or URL format different — proceed
      }
      await deletePatientDocument(specialistId, docItem.id);
    },
    [specialistId],
  );

  return { documents, loading, uploading, uploadDocument, removeDocument };
}
