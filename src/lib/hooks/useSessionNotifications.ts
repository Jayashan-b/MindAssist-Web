'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { differenceInMinutes } from 'date-fns';
import type { Appointment } from '../types';

interface ApproachingSession {
  appointment: Appointment;
  minutesUntil: number;
}

export function useSessionNotifications(appointments: Appointment[]) {
  const [approachingSessions, setApproachingSessions] = useState<ApproachingSession[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const approaching: ApproachingSession[] = [];

      for (const appt of appointments) {
        if (appt.status !== 'confirmed' && appt.status !== 'inProgress') continue;

        const scheduled = new Date(appt.scheduledAt);
        const mins = differenceInMinutes(scheduled, now);

        if (mins > 0 && mins <= 15) {
          approaching.push({ appointment: appt, minutesUntil: mins });

          // Browser notification for sessions within 5 min
          if (
            mins <= 5 &&
            !notifiedRef.current.has(appt.id) &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            notifiedRef.current.add(appt.id);
            const name = appt.anonymousMode
              ? 'Anonymous Patient'
              : appt.patientName || 'Patient';
            new Notification('Session Starting Soon', {
              body: `Your session with ${name} starts in ${mins} minute${mins !== 1 ? 's' : ''}`,
              icon: '/favicon.ico',
            });
          }
        }
      }

      approaching.sort((a, b) => a.minutesUntil - b.minutesUntil);
      setApproachingSessions(approaching);
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [appointments]);

  return { approachingSessions, requestPermission };
}
