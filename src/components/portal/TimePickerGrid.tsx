'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sunrise, Sun, Sunset, Moon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSlotPeriod } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';

interface TimePickerGridProps {
  open: boolean;
  onClose: () => void;
  allTimes: readonly string[];
  existingTimes: string[];
  bookedTimes: string[];
  onSelectTime: (time: string) => void;
  saving: boolean;
}

const PERIOD_CONFIG: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  Morning: { icon: Sunrise, label: 'Morning (6 AM – 12 PM)', color: 'text-amber-500' },
  Afternoon: { icon: Sun, label: 'Afternoon (12 PM – 6 PM)', color: 'text-orange-500' },
  Evening: { icon: Sunset, label: 'Evening (6 PM – 9 PM)', color: 'text-rose-500' },
  Night: { icon: Moon, label: 'Night (9 PM – 6 AM)', color: 'text-indigo-500' },
};

export default function TimePickerGrid({
  open,
  onClose,
  allTimes,
  existingTimes,
  bookedTimes,
  onSelectTime,
  saving,
}: TimePickerGridProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Group times by period
  const groupedTimes = useMemo(() => {
    const groups: Record<string, string[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
      Night: [],
    };
    for (const time of allTimes) {
      const period = getSlotPeriod(time);
      groups[period].push(time);
    }
    return Object.entries(groups).filter(([, times]) => times.length > 0);
  }, [allTimes]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="lg:absolute lg:right-0 lg:top-full lg:mt-2 lg:w-[480px] lg:shadow-xl lg:border lg:border-slate-200 mt-3 lg:mt-2 bg-white rounded-2xl lg:z-20 max-h-[420px] overflow-y-auto"
        >
          <div className="p-4 space-y-4">
            {groupedTimes.map(([period, times]) => {
              const config = PERIOD_CONFIG[period];
              const Icon = config.icon;
              const allAdded = times.every((t) => existingTimes.includes(t));

              return (
                <div key={period}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn('w-4 h-4', config.color)} />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {config.label}
                    </span>
                    {allAdded && (
                      <span className="text-[10px] text-slate-400 font-medium">(all added)</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                    {times.map((time) => {
                      const isExisting = existingTimes.includes(time);
                      const isBooked = bookedTimes.includes(time);

                      return (
                        <button
                          key={time}
                          onClick={() => !isExisting && onSelectTime(time)}
                          disabled={saving || isExisting}
                          className={cn(
                            'relative px-2 py-2 text-xs font-medium rounded-lg border transition-all text-center',
                            isExisting && isBooked
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 cursor-default'
                              : isExisting
                                ? 'bg-violet-50 border-violet-200 text-violet-500 cursor-default'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700'
                          )}
                        >
                          {time}
                          {isExisting && !isBooked && (
                            <Check className="w-3 h-3 absolute top-0.5 right-0.5 text-violet-400" />
                          )}
                          {isBooked && (
                            <span className="block text-[9px] text-emerald-500 font-medium leading-tight mt-0.5">
                              booked
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
