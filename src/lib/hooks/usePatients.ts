'use client';

import { useMemo } from 'react';
import type { Appointment, PatientProfile } from '../types';

/**
 * Aggregates appointments into PatientProfile objects grouped by userId.
 * Notes and documents are loaded on-demand (not here).
 */
export function usePatients(appointments: Appointment[]) {
  const patients = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const apt of appointments) {
      if (!map[apt.userId]) {
        map[apt.userId] = [];
      }
      map[apt.userId].push(apt);
    }

    const profiles: PatientProfile[] = Object.entries(map).map(([userId, apts]) => {
      // Sort by scheduled date ascending to get first/last visit
      const sorted = [...apts].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );

      // Determine display name from most recent non-anonymous appointment, or alias
      const nonAnon = apts.find((a) => !a.anonymousMode && a.patientName);
      const latestAnon = apts.find((a) => a.anonymousMode && a.anonymousAlias);
      const displayName = nonAnon?.patientName || latestAnon?.anonymousAlias || 'Patient';
      const email = nonAnon?.patientEmail || null;
      const isAnonymous = !nonAnon;

      const completedSessions = apts.filter(
        (a) => a.status === 'completed' || a.status === 'rated',
      ).length;
      const cancelledSessions = apts.filter((a) => a.status === 'cancelled').length;

      const rated = apts.filter((a) => a.rating !== null && a.rating !== undefined);
      const averageRating = rated.length > 0
        ? Math.round((rated.reduce((sum, a) => sum + (a.rating ?? 0), 0) / rated.length) * 10) / 10
        : null;

      return {
        userId,
        displayName,
        email,
        isAnonymous,
        totalSessions: apts.length,
        completedSessions,
        cancelledSessions,
        firstVisit: sorted[0]?.scheduledAt ?? '',
        lastVisit: sorted[sorted.length - 1]?.scheduledAt ?? '',
        averageRating,
        appointments: sorted,
        notes: [],
        documents: [],
      };
    });

    // Sort by last visit descending (most recent first)
    return profiles.sort(
      (a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime(),
    );
  }, [appointments]);

  const getPatient = (userId: string): PatientProfile | undefined => {
    return patients.find((p) => p.userId === userId);
  };

  return { patients, getPatient };
}
