'use client';

import { useCallback } from 'react';
import { updateSpecialist } from '../firestore';
import type { Specialist } from '../types';

export function useSlots(specialist: Specialist | null) {
  const slots = specialist?.availableSlots ?? {};

  const saveSlots = useCallback(
    async (newSlots: Record<string, string[]>) => {
      if (!specialist) return;
      await updateSpecialist(specialist.id, { availableSlots: newSlots });
    },
    [specialist],
  );

  const addSlot = useCallback(
    async (date: string, time: string) => {
      const current = { ...slots };
      if (!current[date]) {
        current[date] = [];
      }
      if (current[date].includes(time)) return;
      current[date] = [...current[date], time].sort();
      await saveSlots(current);
    },
    [slots, saveSlots],
  );

  const removeSlot = useCallback(
    async (date: string, time: string) => {
      const current = { ...slots };
      if (!current[date]) return;
      current[date] = current[date].filter((t) => t !== time);
      if (current[date].length === 0) {
        delete current[date];
      }
      await saveSlots(current);
    },
    [slots, saveSlots],
  );

  const clearPastSlots = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const current = { ...slots };
    for (const date of Object.keys(current)) {
      if (date < today) {
        delete current[date];
      }
    }
    await saveSlots(current);
  }, [slots, saveSlots]);

  const addBulkSlots = useCallback(
    async (date: string, times: string[]) => {
      const current = { ...slots };
      if (!current[date]) {
        current[date] = [];
      }
      const merged = [...new Set([...current[date], ...times])].sort();
      current[date] = merged;
      await saveSlots(current);
    },
    [slots, saveSlots],
  );

  return { slots, addSlot, removeSlot, clearPastSlots, addBulkSlots };
}
