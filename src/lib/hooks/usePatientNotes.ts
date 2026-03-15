'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  watchPatientNotes,
  watchSessionNotes,
  addPatientNote,
  updatePatientNote,
  deletePatientNote,
  toggleNoteSharing,
} from '../firestore';
import type { PatientNote, NoteCategory } from '../types';
import type { NoteFilter } from '../firestore';

interface UsePatientNotesOptions {
  /** Filter notes by category. */
  category?: NoteCategory;
  /** Filter notes by appointmentId. */
  appointmentId?: string;
}

export function usePatientNotes(
  specialistId: string | undefined,
  patientUserId: string | undefined,
  options?: UsePatientNotesOptions,
) {
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(true);

  const category = options?.category;
  const appointmentId = options?.appointmentId;

  useEffect(() => {
    if (!specialistId || !patientUserId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const filter: NoteFilter = {};
    if (category) filter.category = category;
    if (appointmentId) filter.appointmentId = appointmentId;

    const unsubscribe = watchPatientNotes(specialistId, patientUserId, (data) => {
      setNotes(data);
      setLoading(false);
    }, filter);

    return unsubscribe;
  }, [specialistId, patientUserId, category, appointmentId]);

  const addNote = useCallback(
    async (
      content: string,
      tags: string[],
      noteAppointmentId?: string,
      noteCategory: NoteCategory = 'session',
    ) => {
      if (!specialistId || !patientUserId) return;
      const now = new Date().toISOString();
      await addPatientNote(specialistId, {
        patientUserId,
        content,
        createdAt: now,
        updatedAt: now,
        appointmentId: noteAppointmentId ?? null,
        tags,
        // Session notes default to shared; patient-level notes are always private
        sharedWithPatient: noteCategory === 'session',
        category: noteCategory,
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

/**
 * Watch session-specific notes by appointmentId (not patientUserId).
 * Used in ConsultationWorkspace for anonymous sessions where we query by appointment.
 */
export function useSessionNotes(
  specialistId: string | undefined,
  appointmentId: string | undefined,
  patientUserId?: string,
) {
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialistId || !appointmentId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = watchSessionNotes(specialistId, appointmentId, (data) => {
      setNotes(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [specialistId, appointmentId]);

  const addNote = useCallback(
    async (content: string, tags: string[]) => {
      if (!specialistId || !patientUserId || !appointmentId) return;
      const now = new Date().toISOString();
      await addPatientNote(specialistId, {
        patientUserId,
        content,
        createdAt: now,
        updatedAt: now,
        appointmentId,
        tags,
        sharedWithPatient: true,
        category: 'session',
      });
    },
    [specialistId, patientUserId, appointmentId],
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
