'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { CalendarClock, Plus, X, Trash2, Clock, Users } from 'lucide-react';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import SlotCalendar from '@/components/portal/SlotCalendar';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSlots } from '@/lib/hooks/useSlots';
import { useAppointments } from '@/lib/hooks/useAppointments';
import { getBookedSlotsForSpecialist } from '@/lib/firestore';
import { TIME_SLOTS, SLOT_PRESETS, getSlotPeriod } from '@/lib/types';

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
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customTime, setCustomTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const slotsForDate = selectedDateStr ? (slots[selectedDateStr] || []) : [];

  const datesWithSlots = Object.keys(slots).map((d) => new Date(d + 'T00:00:00'));

  // Dates that have booked appointments
  const datesWithBookings = useMemo(() => {
    const dateSet = new Set<string>();
    for (const apt of appointments) {
      if (apt.status === 'cancelled') continue;
      const d = new Date(apt.scheduledAt).toISOString().split('T')[0];
      dateSet.add(d);
    }
    return Array.from(dateSet).map((d) => new Date(d + 'T00:00:00'));
  }, [appointments]);

  // Load booked slots for the selected date
  useEffect(() => {
    if (!specialist?.id || !selectedDateStr) {
      setBookedSlots([]);
      return;
    }
    getBookedSlotsForSpecialist(specialist.id, selectedDateStr).then(setBookedSlots);
  }, [specialist?.id, selectedDateStr, appointments]);

  const handleAddSlot = async (time: string) => {
    if (!selectedDateStr) return;
    setSaving(true);
    await addSlot(selectedDateStr, time);
    setSaving(false);
    setShowTimeDropdown(false);
  };

  const handleRemoveSlot = async (time: string) => {
    if (!selectedDateStr) return;
    setSaving(true);
    await removeSlot(selectedDateStr, time);
    setSaving(false);
  };

  const handleAddPreset = async (presetKey: string) => {
    if (!selectedDateStr) return;
    const preset = SLOT_PRESETS[presetKey];
    if (!preset) return;
    setSaving(true);
    const newSlots = preset.slots.filter((t) => !slotsForDate.includes(t));
    if (newSlots.length > 0) await addBulkSlots(selectedDateStr, newSlots);
    setSaving(false);
  };

  const handleAddCustomTime = async () => {
    if (!selectedDateStr || !customTime) return;
    if (slotsForDate.includes(customTime)) return;
    setSaving(true);
    await addSlot(selectedDateStr, customTime);
    setSaving(false);
    setCustomTime('');
  };

  const handleClearPast = async () => {
    setSaving(true);
    await clearPastSlots();
    setSaving(false);
  };

  const availableTimesToAdd = TIME_SLOTS.filter((t) => !slotsForDate.includes(t));
  const totalSlotCount = Object.values(slots).reduce((sum, arr) => sum + arr.length, 0);
  const totalBookedCount = bookedSlots.length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PortalSidebar />
      <main className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manage Slots</h1>
              <p className="text-sm text-slate-500 mt-1">
                Set your available consultation times
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                {totalSlotCount} slot{totalSlotCount !== 1 ? 's' : ''} across{' '}
                {Object.keys(slots).length} day{Object.keys(slots).length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleClearPast}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Clear Past
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            {/* Enhanced Calendar */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
              <SlotCalendar
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                datesWithSlots={datesWithSlots}
                datesWithBookings={datesWithBookings}
              />
            </div>

            {/* Slot Editor */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
              {selectedDate ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </h2>
                      {totalBookedCount > 0 && (
                        <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {totalBookedCount} booked session{totalBookedCount !== 1 ? 's' : ''} on this day
                        </p>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                        disabled={saving || availableTimesToAdd.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" /> Add Slot
                      </button>

                      {showTimeDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-10 max-h-72 overflow-y-auto">
                          {(() => {
                            let lastPeriod = '';
                            return availableTimesToAdd.map((time) => {
                              const period = getSlotPeriod(time);
                              const showHeader = period !== lastPeriod;
                              lastPeriod = period;
                              const isBooked = bookedSlots.includes(time);
                              return (
                                <React.Fragment key={time}>
                                  {showHeader && (
                                    <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 sticky top-0">
                                      {period}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => handleAddSlot(time)}
                                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                                      isBooked
                                        ? 'text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50'
                                        : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                                    }`}
                                  >
                                    {time}
                                    {isBooked && <span className="ml-2 text-[10px] text-emerald-500 font-medium">(booked)</span>}
                                  </button>
                                </React.Fragment>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Add Presets */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(SLOT_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => handleAddPreset(key)}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all disabled:opacity-50"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Time Input */}
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
                    />
                    <button
                      onClick={handleAddCustomTime}
                      disabled={saving || !customTime || slotsForDate.includes(customTime)}
                      className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Add Custom
                    </button>
                  </div>

                  {/* Time Slots Grid */}
                  {slotsForDate.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slotsForDate.map((time) => {
                        const isBooked = bookedSlots.includes(time);
                        return (
                          <div
                            key={time}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                              isBooked
                                ? 'bg-emerald-50 border-emerald-200/60'
                                : 'bg-violet-50 border-violet-200/60'
                            }`}
                          >
                            <span className={`flex items-center gap-2 text-sm font-medium ${
                              isBooked ? 'text-emerald-700' : 'text-violet-700'
                            }`}>
                              <Clock className="w-3.5 h-3.5" />
                              {time}
                              {isBooked && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded font-semibold">
                                  BOOKED
                                </span>
                              )}
                            </span>
                            {!isBooked && (
                              <button
                                onClick={() => handleRemoveSlot(time)}
                                disabled={saving}
                                className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <CalendarClock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No slots set for this date</p>
                      <p className="text-xs text-slate-400 mt-1">Click &quot;Add Slot&quot; or use quick-add buttons above</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <CalendarClock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Select a date to manage slots</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
