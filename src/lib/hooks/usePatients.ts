'use client';

import { useMemo } from 'react';
import type { Appointment, PatientProfile } from '../types';

/**
 * Aggregates appointments into PatientProfile objects grouped by userId.
 * Notes and documents are loaded on-demand (not here).
 *
 * Privacy rule: if ANY appointment for a user has anonymousMode=true,
 * the entire patient profile is treated as anonymous — no real name or
 * email is ever surfaced to the specialist, even if other sessions from
 * the same user were non-anonymous.
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

      // Privacy: if ANY appointment is anonymous, treat the whole profile as anonymous
      const hasAnyAnonymous = apts.some((a) => a.anonymousMode);

      let displayName: string;
      let email: string | null;
      let isAnonymous: boolean;

      if (hasAnyAnonymous) {
        // Use the alias from the most recent anonymous appointment
        const latestAnon = [...apts]
          .filter((a) => a.anonymousMode && a.anonymousAlias)
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
        displayName = latestAnon?.anonymousAlias || 'Anonymous';
        email = null;
        isAnonymous = true;
      } else {
        const withName = apts.find((a) => a.patientName);
        displayName = withName?.patientName || 'Patient';
        email = withName?.patientEmail || null;
        isAnonymous = false;
      }

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
