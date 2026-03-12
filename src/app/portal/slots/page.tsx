'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import { format, isBefore, startOfDay } from 'date-fns';
import { CalendarClock, Plus, X, Trash2, Clock } from 'lucide-react';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSlots } from '@/lib/hooks/useSlots';
import { TIME_SLOTS } from '@/lib/types';

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const slotsForDate = selectedDateStr ? (slots[selectedDateStr] || []) : [];

  const datesWithSlots = Object.keys(slots).map((d) => new Date(d + 'T00:00:00'));

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

  const handleAddAllMorning = async () => {
    if (!selectedDateStr) return;
    setSaving(true);
    await addBulkSlots(selectedDateStr, ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
    setSaving(false);
  };

  const handleAddAllAfternoon = async () => {
    if (!selectedDateStr) return;
    setSaving(true);
    await addBulkSlots(selectedDateStr, ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30']);
    setSaving(false);
  };

  const handleClearPast = async () => {
    setSaving(true);
    await clearPastSlots();
    setSaving(false);
  };

  const availableTimesToAdd = TIME_SLOTS.filter((t) => !slotsForDate.includes(t));

  const totalSlotCount = Object.values(slots).reduce((sum, arr) => sum + arr.length, 0);

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
                {totalSlotCount} total slot{totalSlotCount !== 1 ? 's' : ''} across{' '}
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
            {/* Calendar */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                modifiers={{
                  hasSlots: datesWithSlots,
                }}
                modifiersStyles={{
                  hasSlots: {
                    backgroundColor: '#ede9fe',
                    color: '#6d28d9',
                    fontWeight: 700,
                    borderRadius: '8px',
                  },
                }}
                className="mx-auto"
              />
              <div className="mt-4 flex items-center gap-2 justify-center">
                <div className="w-3 h-3 rounded bg-violet-200" />
                <span className="text-xs text-slate-500">Has slots</span>
              </div>
            </div>

            {/* Slot Editor */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
              {selectedDate ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-900">
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </h2>
                    <div className="relative">
                      <button
                        onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                        disabled={saving || availableTimesToAdd.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" /> Add Slot
                      </button>

                      {showTimeDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-10 max-h-60 overflow-y-auto">
                          {availableTimesToAdd.map((time) => (
                            <button
                              key={time}
                              onClick={() => handleAddSlot(time)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Add */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={handleAddAllMorning}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all disabled:opacity-50"
                    >
                      + Morning (9-12)
                    </button>
                    <button
                      onClick={handleAddAllAfternoon}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all disabled:opacity-50"
                    >
                      + Afternoon (2-5)
                    </button>
                  </div>

                  {/* Time Slots Grid */}
                  {slotsForDate.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slotsForDate.map((time) => (
                        <div
                          key={time}
                          className="group flex items-center justify-between px-3 py-2.5 bg-violet-50 rounded-xl border border-violet-200/60"
                        >
                          <span className="flex items-center gap-2 text-sm font-medium text-violet-700">
                            <Clock className="w-3.5 h-3.5" />
                            {time}
                          </span>
                          <button
                            onClick={() => handleRemoveSlot(time)}
                            disabled={saving}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
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
