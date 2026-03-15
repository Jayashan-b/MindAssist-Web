'use client';

import { useEffect, useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import {
  watchPatientDocuments,
  addPatientDocument,
  deletePatientDocument,
  toggleDocumentSharing,
} from '../firestore';
import type { PatientDocument } from '../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function usePatientDocuments(specialistId: string | undefined, patientUserId: string | undefined) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const clearError = useCallback(() => setError(null), []);

  const uploadDocument = useCallback(
    async (file: File, description?: string, appointmentId?: string) => {
      if (!specialistId || !patientUserId) return;

      if (file.size > MAX_FILE_SIZE) {
        setError('File too large. Maximum size is 10 MB.');
        return;
      }

      setUploading(true);
      setError(null);
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
          sharedWithPatient: false,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setError(message);
        console.error('Document upload failed:', err);
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

  const toggleSharing = useCallback(
    async (docId: string, shared: boolean) => {
      if (!specialistId) return;
      await toggleDocumentSharing(specialistId, docId, shared);
    },
    [specialistId],
  );

  return { documents, loading, uploading, error, clearError, uploadDocument, removeDocument, toggleSharing };
}
