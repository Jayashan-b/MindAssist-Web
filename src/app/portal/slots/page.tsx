'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  CalendarClock,
  Plus,
  X,
  Trash2,
  Clock,
  Users,
  Timer,
  Sunrise,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import SlotCalendar from '@/components/portal/SlotCalendar';
import StatCard from '@/components/portal/StatCard';
import TimePickerGrid from '@/components/portal/TimePickerGrid';
import ConfirmDialog from '@/components/portal/ConfirmDialog';
import ActiveSessionCard from '@/components/portal/ActiveSessionCard';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSlots } from '@/lib/hooks/useSlots';
import { useAppointments } from '@/lib/hooks/useAppointments';
import { getBookedSlotsForSpecialist } from '@/lib/firestore';
import { TIME_SLOTS, SLOT_PRESETS, getSlotPeriod } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

const PERIOD_ICONS: Record<string, LucideIcon> = {
  Morning: Sunrise,
  Afternoon: Sun,
  Evening: Sunset,
  Night: Moon,
};

const PERIOD_COLORS: Record<string, string> = {
  Morning: 'text-amber-500',
  Afternoon: 'text-orange-500',
  Evening: 'text-rose-500',
  Night: 'text-indigo-500',
};

export default function SlotsPage() {
  return (
    <AuthGuard>
      <SlotsContent />
    </AuthGuard>
  );
}

function SlotsContent() {
  const { specialist } = useAuth();
  const { slots, addSlot, removeSlot, clearPastSlots, addBulkSlots } = useSlots(specialist);
  const { appointments } = useAppointments(specialist?.id);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customHour, setCustomHour] = useState('');
  const [customMinute, setCustomMinute] = useState('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const slotsForDate = selectedDateStr ? (slots[selectedDateStr] || []) : [];

  const datesWithSlots = Object.keys(slots).map((d) => new Date(d + 'T00:00:00'));

  const datesWithBookings = useMemo(() => {
    const dateSet = new Set<string>();
    for (const apt of appointments) {
      if (apt.status === 'cancelled') continue;
      const d = new Date(apt.scheduledAt).toISOString().split('T')[0];
      dateSet.add(d);
    }
    return Array.from(dateSet).map((d) => new Date(d + 'T00:00:00'));
  }, [appointments]);

  useEffect(() => {
    if (!specialist?.id || !selectedDateStr) {
      setBookedSlots([]);
      return;
    }
    getBookedSlotsForSpecialist(specialist.id, selectedDateStr).then(setBookedSlots);
  }, [specialist?.id, selectedDateStr, appointments]);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const handleAddSlot = async (time: string) => {
    if (!selectedDateStr) return;
    setSaving(true);
    await addSlot(selectedDateStr, time);
    setSaving(false);
    showToast('Slot added');
  };

  const handleRemoveSlot = async (time: string) => {
    if (!selectedDateStr) return;
    setSaving(true);
    await removeSlot(selectedDateStr, time);
    setSaving(false);
    showToast('Slot removed');
  };

  const handleAddPreset = async (presetKey: string) => {
    if (!selectedDateStr) return;
    const preset = SLOT_PRESETS[presetKey];
    if (!preset) return;
    setSaving(true);
    const newSlots = preset.slots.filter((t) => !slotsForDate.includes(t));
    if (newSlots.length > 0) {
      await addBulkSlots(selectedDateStr, newSlots);
      showToast(`${newSlots.length} slot${newSlots.length !== 1 ? 's' : ''} added`);
    }
    setSaving(false);
  };

  const parseAndPadHour = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 2);
    if (!digits) return '';
    const num = Math.min(parseInt(digits, 10), 23);
    return num.toString().padStart(2, '0');
  };

  const parseAndPadMinute = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 2);
    if (!digits) return '';
    const num = Math.min(parseInt(digits, 10), 59);
    return num.toString().padStart(2, '0');
  };

  const handleHourChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 2);
    setCustomHour(cleaned);
    if (cleaned && !customMinute) {
      setCustomMinute('00');
    }
  };

  const handleHourBlur = () => {
    if (customHour) setCustomHour(parseAndPadHour(customHour));
  };

  const handleMinuteChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 2);
    setCustomMinute(cleaned);
  };

  const handleMinuteBlur = () => {
    if (customMinute) setCustomMinute(parseAndPadMinute(customMinute));
  };

  const paddedHour = customHour ? parseAndPadHour(customHour) : '';
  const paddedMinute = customMinute ? parseAndPadMinute(customMinute) : '';
  const customTimeValue = paddedHour && paddedMinute ? `${paddedHour}:${paddedMinute}` : '';

  const handleAddCustomTime = async () => {
    if (!selectedDateStr || !customTimeValue) return;
    if (slotsForDate.includes(customTimeValue)) return;
    setSaving(true);
    await addSlot(selectedDateStr, customTimeValue);
    setSaving(false);
    setCustomHour('');
    setCustomMinute('');
    showToast('Custom slot added');
  };

  const handleClearPastConfirmed = async () => {
    setSaving(true);
    await clearPastSlots();
    setSaving(false);
    setShowClearConfirm(false);
    showToast('Past slots cleared');
  };

  // Stats
  const totalSlotCount = Object.values(slots).reduce((sum, arr) => sum + arr.length, 0);
  const totalDays = Object.keys(slots).length;
  const totalBookedForDate = bookedSlots.length;
  const availableForDate = slotsForDate.length - totalBookedForDate;

  // Preset status
  const presetStatus = useMemo(() => {
    return Object.entries(SLOT_PRESETS).map(([key, preset]) => {
      const addedCount = preset.slots.filter((t) => slotsForDate.includes(t)).length;
      return {
        key,
        label: preset.label.split('(')[0].trim(),
        timeRange: preset.label.match(/\((.+)\)/)?.[1] || '',
        total: preset.slots.length,
        added: addedCount,
        isFullyAdded: addedCount === preset.slots.length,
      };
    });
  }, [slotsForDate]);

  // Group slots by period for display
  const groupedSlots = useMemo(() => {
    const groups: Record<string, string[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
      Night: [],
    };
    for (const time of slotsForDate) {
      const period = getSlotPeriod(time);
      groups[period].push(time);
    }
    return Object.entries(groups).filter(([, times]) => times.length > 0);
  }, [slotsForDate]);

  const isCustomTimeDuplicate = customTimeValue && slotsForDate.includes(customTimeValue);

  if (!specialist) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <PortalSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Skeleton loading */}
          <div className="mb-6 lg:mb-8">
            <div className="h-7 w-48 bg-slate-200 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
                <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
                <div className="h-8 w-12 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 lg:gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 h-[420px] animate-pulse" />
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 h-[420px] animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PortalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Manage Slots</h1>
              <p className="text-sm text-slate-500 mt-1">
                Set your available consultation times
              </p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={saving || totalSlotCount === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200/60 rounded-xl hover:bg-red-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
            >
              <Trash2 className="w-4 h-4" /> Clear Past Slots
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              title="Total Slots"
              value={totalSlotCount}
              icon={Clock}
              color="violet"
              subtitle={`across ${totalDays} day${totalDays !== 1 ? 's' : ''}`}
            />
            <StatCard
              title="Available"
              value={Math.max(0, availableForDate)}
              icon={CalendarClock}
              color="blue"
              subtitle="selected date"
            />
            <StatCard
              title="Booked"
              value={totalBookedForDate}
              icon={Users}
              color="emerald"
              subtitle="selected date"
            />
            <StatCard
              title="Duration"
              value={`${specialist?.sessionDurationMinutes ?? 30}m`}
              icon={Timer}
              color="amber"
              subtitle="per session"
            />
          </div>

          <ActiveSessionCard />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 lg:gap-6">
            {/* Calendar Card */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-4 sm:p-6">
              <SlotCalendar
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                datesWithSlots={datesWithSlots}
                datesWithBookings={datesWithBookings}
              />
            </div>

            {/* Slot Editor Card */}
            <div className="relative bg-white rounded-2xl border border-slate-200/60 p-4 sm:p-6 overflow-hidden">
              {/* Toast */}
              <AnimatePresence>
                {toastMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-4 right-4 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg z-10"
                  >
                    {toastMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              {selectedDate ? (
                <>
                  {/* Date heading + Add button */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </h2>
                      {totalBookedForDate > 0 && (
                        <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {totalBookedForDate} booked session{totalBookedForDate !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="relative self-start sm:self-auto">
                      <button
                        onClick={() => setShowTimePicker(!showTimePicker)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" /> Add Slot
                      </button>

                      {/* Time Picker Grid */}
                      <TimePickerGrid
                        open={showTimePicker}
                        onClose={() => setShowTimePicker(false)}
                        allTimes={TIME_SLOTS}
                        existingTimes={slotsForDate}
                        bookedTimes={bookedSlots}
                        onSelectTime={handleAddSlot}
                        saving={saving}
                      />
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-5">
                    {presetStatus.map((preset) => (
                      <button
                        key={preset.key}
                        onClick={() => handleAddPreset(preset.key)}
                        disabled={saving || preset.isFullyAdded}
                        className={cn(
                          'flex flex-col items-start px-2.5 py-2 rounded-xl border text-left transition-all min-w-0',
                          preset.isFullyAdded
                            ? 'bg-violet-50 border-violet-200/60 cursor-not-allowed opacity-60'
                            : preset.added > 0
                              ? 'bg-violet-50/50 border-violet-200/40 hover:bg-violet-50 hover:border-violet-300'
                              : 'bg-white border-slate-200 hover:bg-violet-50 hover:border-violet-300'
                        )}
                      >
                        <span className="text-xs font-semibold text-slate-700 truncate w-full">{preset.label}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {preset.isFullyAdded ? 'All added' : `${preset.added}/${preset.total} added`}
                        </span>
                        <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5">
                          <div
                            className="h-1 bg-violet-500 rounded-full transition-all duration-300"
                            style={{ width: `${(preset.added / preset.total) * 100}%` }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Time Input */}
                  <div className="mb-5">
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Add custom time</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          list="hour-options"
                          value={customHour}
                          onChange={(e) => handleHourChange(e.target.value)}
                          onBlur={handleHourBlur}
                          placeholder="HH"
                          maxLength={2}
                          className="bg-transparent text-sm font-medium text-slate-900 outline-none w-12 text-center tabular-nums placeholder:text-slate-300"
                        />
                        <datalist id="hour-options">
                          {HOUR_OPTIONS.map((h) => (
                            <option key={h} value={h} />
                          ))}
                        </datalist>
                        <span className="text-slate-300 text-sm font-bold select-none">:</span>
                        <input
                          type="text"
                          list="minute-options"
                          value={customMinute}
                          onChange={(e) => handleMinuteChange(e.target.value)}
                          onBlur={handleMinuteBlur}
                          placeholder="MM"
                          maxLength={2}
                          className="bg-transparent text-sm font-medium text-slate-900 outline-none w-12 text-center tabular-nums placeholder:text-slate-300"
                        />
                        <datalist id="minute-options">
                          {MINUTE_OPTIONS.map((m) => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      </div>
                      <button
                        onClick={handleAddCustomTime}
                        disabled={saving || !customTimeValue || !!isCustomTimeDuplicate}
                        className="px-4 py-2.5 text-xs font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        Add
                      </button>
                    </div>
                    {isCustomTimeDuplicate && (
                      <p className="text-xs text-red-500 mt-1.5 ml-1">This time is already added</p>
                    )}
                  </div>

                  {/* Grouped Slot Display */}
                  {slotsForDate.length > 0 ? (
                    <div className="space-y-5">
                      <AnimatePresence mode="popLayout">
                        {groupedSlots.map(([period, times]) => {
                          const PeriodIcon = PERIOD_ICONS[period] || Clock;
                          const periodColor = PERIOD_COLORS[period] || 'text-slate-500';
                          return (
                            <motion.div
                              key={period}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.25 }}
                            >
                              <div className="flex items-center gap-2 mb-2.5">
                                <PeriodIcon className={cn('w-4 h-4', periodColor)} />
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                  {period}
                                </span>
                                <span className="text-[10px] text-slate-300 font-medium">
                                  ({times.length} slot{times.length !== 1 ? 's' : ''})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <AnimatePresence mode="popLayout">
                                  {times.map((time) => {
                                    const isBooked = bookedSlots.includes(time);
                                    return (
                                      <motion.div
                                        key={time}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.2 }}
                                        className={cn(
                                          'group flex items-center gap-1.5 px-3 py-2 rounded-xl border',
                                          isBooked
                                            ? 'bg-emerald-50 border-emerald-200/60'
                                            : 'bg-violet-50 border-violet-200/60'
                                        )}
                                      >
                                        <Clock className={cn('w-3.5 h-3.5 flex-shrink-0', isBooked ? 'text-emerald-600' : 'text-violet-600')} />
                                        <span className={cn('text-sm font-medium whitespace-nowrap', isBooked ? 'text-emerald-700' : 'text-violet-700')}>
                                          {time}
                                        </span>
                                        {isBooked && (
                                          <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                            BOOKED
                                          </span>
                                        )}
                                        {!isBooked && (
                                          <button
                                            onClick={() => handleRemoveSlot(time)}
                                            disabled={saving}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all flex-shrink-0"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </motion.div>
                                    );
                                  })}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <CalendarClock className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">No slots set for this date</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        Click &quot;Add Slot&quot; to pick times, or use the preset buttons to quickly add common time blocks
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <CalendarClock className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Select a date to manage slots</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Clear Past Confirmation Dialog */}
      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearPastConfirmed}
        title="Clear Past Slots"
        description="This will remove all time slots for dates that have already passed. This action cannot be undone."
        confirmLabel="Clear Past Slots"
        cancelLabel="Keep"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}
