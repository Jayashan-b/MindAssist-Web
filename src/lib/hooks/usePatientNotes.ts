'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  watchPatientNotes,
  addPatientNote,
  updatePatientNote,
  deletePatientNote,
  toggleNoteSharing,
} from '../firestore';
import type { PatientNote } from '../types';

export function usePatientNotes(specialistId: string | undefined, patientUserId: string | undefined) {
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialistId || !patientUserId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = watchPatientNotes(specialistId, patientUserId, (data) => {
      setNotes(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [specialistId, patientUserId]);

  const addNote = useCallback(
    async (content: string, tags: string[], appointmentId?: string) => {
      if (!specialistId || !patientUserId) return;
      const now = new Date().toISOString();
      await addPatientNote(specialistId, {
        patientUserId,
        content,
        createdAt: now,
        updatedAt: now,
        appointmentId: appointmentId ?? null,
        tags,
        sharedWithPatient: false,
      });
    },
    [specialistId, patientUserId],
  );

  const editNote = useCallback(
    async (noteId: string, content: string, tags: string[]) => {
      if (!specialistId) return;
      await updatePatientNote(specialistId, noteId, {
        content,
        tags,
        updatedAt: new Date().toISOString(),
      });
    },
    [specialistId],
  );

  const removeNote = useCallback(
    async (noteId: string) => {
      if (!specialistId) return;
      await deletePatientNote(specialistId, noteId);
    },
    [specialistId],
  );

  const toggleSharing = useCallback(
    async (noteId: string, shared: boolean) => {
      if (!specialistId) return;
      await toggleNoteSharing(specialistId, noteId, shared);
    },
    [specialistId],
  );

  return { notes, loading, addNote, editNote, removeNote, toggleSharing };
}
