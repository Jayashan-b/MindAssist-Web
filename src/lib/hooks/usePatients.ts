'use client';

import { useMemo } from 'react';
import type { Appointment, PatientProfile } from '../types';
import { generateAnonName } from '../utils/anonName';

/**
 * Builds PatientProfile objects from a list of appointments.
 *
 * Grouping rules:
 *  - Non-anonymous appointments → grouped by userId (same person, multiple sessions)
 *  - Anonymous appointments     → each appointment is its own independent patient
 *    (privacy: the doctor should not be able to link anonymous sessions to each other
 *     or to the user's real identity, even if the same userId booked both)
 *
 * Naming rules:
 *  - Non-anonymous: use patientName from appointment data
 *  - Anonymous: deterministic two-word hacker/gamer name derived from appointmentId
 *    (same name always shows for the same session; e.g. "Cyber Raven", "Silent Fox")
 */
export function usePatients(appointments: Appointment[]) {
  const patients = useMemo(() => {
    // Map from profileKey → { profileKey, userId, apts[] }
    const map: Record<string, { profileKey: string; userId: string; apts: Appointment[] }> = {};

    for (const apt of appointments) {
      if (apt.anonymousMode) {
        // Each anonymous session = independent patient entry
        const profileKey = `anon:${apt.id}`;
        map[profileKey] = { profileKey, userId: apt.userId, apts: [apt] };
      } else {
        // Non-anonymous: group all sessions from same user together
        const profileKey = apt.userId;
        if (!map[profileKey]) {
          map[profileKey] = { profileKey, userId: apt.userId, apts: [] };
        }
        map[profileKey].apts.push(apt);
      }
    }

    const profiles: PatientProfile[] = Object.values(map).map(({ profileKey, userId, apts }) => {
      const sorted = [...apts].sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      );

      const isAnon = apts[0].anonymousMode;

      // For anonymous: prefer alias stored in Firestore (written by Flutter mobile app).
      // Fall back to generateAnonName only for legacy data that still has the old
      // "Anonymous User #XXXX" format (pre-fix bookings).
      const firestoreAlias = apts[0].anonymousAlias;
      const displayName = isAnon
        ? (firestoreAlias && !firestoreAlias.startsWith('Anonymous User')
            ? firestoreAlias
            : generateAnonName(apts[0].id))
        : apts.find((a) => a.patientName)?.patientName ?? 'Patient';

      const email = isAnon
        ? null
        : apts.find((a) => a.patientEmail)?.patientEmail ?? null;

      const completedSessions = apts.filter(
        (a) => a.status === 'completed' || a.status === 'rated',
      ).length;
      const cancelledSessions = apts.filter((a) => a.status === 'cancelled').length;

      const rated = apts.filter((a) => a.rating !== null && a.rating !== undefined);
      const averageRating = rated.length > 0
        ? Math.round((rated.reduce((sum, a) => sum + (a.rating ?? 0), 0) / rated.length) * 10) / 10
        : null;

      return {
        profileKey,
        userId,
        displayName,
        email,
        isAnonymous: isAnon,
        totalSessions: apts.length,
        completedSessions,
        cancelledSessions,
        firstVisit: sorted[sorted.length - 1]?.scheduledAt ?? '',
        lastVisit: sorted[0]?.scheduledAt ?? '',
        averageRating,
        appointments: sorted,
        notes: [],
        documents: [],
      };
    });

    // Most recent visit first
    return profiles.sort(
      (a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime(),
    );
  }, [appointments]);

  const getPatient = (profileKey: string): PatientProfile | undefined =>
    patients.find((p) => p.profileKey === profileKey);

  return { patients, getPatient };
}
