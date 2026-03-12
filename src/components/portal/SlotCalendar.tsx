'use client';

import React from 'react';
import { DayPicker } from 'react-day-picker';
import { isBefore, startOfDay } from 'date-fns';

interface SlotCalendarProps {
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  datesWithSlots: Date[];
  datesWithBookings?: Date[];
}

export default function SlotCalendar({
  selectedDate,
  onSelect,
  datesWithSlots,
  datesWithBookings = [],
}: SlotCalendarProps) {
  return (
    <div>
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={onSelect}
        disabled={(date) => isBefore(date, startOfDay(new Date()))}
        modifiers={{
          hasSlots: datesWithSlots,
          hasBookings: datesWithBookings,
        }}
        modifiersStyles={{
          hasSlots: {
            backgroundColor: '#ede9fe',
            color: '#6d28d9',
            fontWeight: 700,
            borderRadius: '8px',
          },
          hasBookings: {
            border: '2px solid #34d399',
            borderRadius: '8px',
          },
        }}
        className="mx-auto"
      />
      <div className="mt-4 flex items-center gap-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-violet-200" />
          <span className="text-xs text-slate-500">Available slots</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-emerald-400" />
          <span className="text-xs text-slate-500">Has bookings</span>
        </div>
      </div>
    </div>
  );
}
