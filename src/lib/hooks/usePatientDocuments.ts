'use client';

import { useEffect, useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import {
  watchPatientDocuments,
  watchSessionDocuments,
  addPatientDocument,
  deletePatientDocument,
  toggleDocumentSharing,
} from '../firestore';
import type { PatientDocument, NoteCategory } from '../types';
import type { DocFilter } from '../firestore';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface UsePatientDocumentsOptions {
  /** Filter documents by category. */
  category?: NoteCategory;
  /** Filter documents by appointmentId. */
  appointmentId?: string;
}

export function usePatientDocuments(
  specialistId: string | undefined,
  patientUserId: string | undefined,
  options?: UsePatientDocumentsOptions,
) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = options?.category;
  const appointmentId = options?.appointmentId;

  useEffect(() => {
    if (!specialistId || !patientUserId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const filter: DocFilter = {};
    if (category) filter.category = category;
    if (appointmentId) filter.appointmentId = appointmentId;

    const unsubscribe = watchPatientDocuments(specialistId, patientUserId, (data) => {
      setDocuments(data);
      setLoading(false);
    }, filter);

    return unsubscribe;
  }, [specialistId, patientUserId, category, appointmentId]);

  const clearError = useCallback(() => setError(null), []);

  const uploadDocument = useCallback(
    async (
      file: File,
      description?: string,
      docAppointmentId?: string,
      docCategory: NoteCategory = 'session',
    ) => {
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
          appointmentId: docAppointmentId ?? null,
          // Session documents default to shared; patient-level are always private
          sharedWithPatient: docCategory === 'session',
          category: docCategory,
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

/**
 * Watch session-specific documents by appointmentId (not patientUserId).
 * Used for anonymous sessions where we query by appointment.
 */
export function useSessionDocuments(
  specialistId: string | undefined,
  appointmentId: string | undefined,
  patientUserId?: string,
) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!specialistId || !appointmentId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = watchSessionDocuments(specialistId, appointmentId, (data) => {
      setDocuments(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [specialistId, appointmentId]);

  const clearError = useCallback(() => setError(null), []);

  const uploadDocument = useCallback(
    async (file: File, description?: string) => {
      if (!specialistId || !patientUserId || !appointmentId) return;

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
          appointmentId,
          sharedWithPatient: true,
          category: 'session',
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setError(message);
        console.error('Document upload failed:', err);
      } finally {
        setUploading(false);
      }
    },
    [specialistId, patientUserId, appointmentId],
  );

  const removeDocument = useCallback(
    async (docItem: PatientDocument) => {
      if (!specialistId) return;
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
