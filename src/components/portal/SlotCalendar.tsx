'use client';

import React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/src/style.css';
import { isBefore, startOfDay, isSameDay } from 'date-fns';

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
  const today = startOfDay(new Date());

  return (
    <div className="slot-calendar">
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={onSelect}
        disabled={(date) => isBefore(date, today)}
        modifiers={{
          hasSlots: datesWithSlots,
          hasBookings: datesWithBookings,
        }}
        modifiersClassNames={{
          hasSlots: 'day-has-slots',
          hasBookings: 'day-has-bookings',
          selected: 'day-selected',
          today: 'day-today',
          disabled: 'day-disabled',
        }}
        showOutsideDays
        fixedWeeks
        components={{
          DayButton: ({ day, modifiers, ...props }) => {
            const hasSlots = datesWithSlots.some((d) => isSameDay(d, day.date));
            const hasBookings = datesWithBookings.some((d) => isSameDay(d, day.date));

            return (
              <button {...props}>
                {day.date.getDate()}
                {(hasSlots || hasBookings) && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {hasSlots && (
                      <span className="w-1 h-1 rounded-full bg-violet-500" />
                    )}
                    {hasBookings && (
                      <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    )}
                  </span>
                )}
              </button>
            );
          },
        }}
      />
      <div className="mt-4 flex items-center gap-4 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-xs text-slate-500">Available slots</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-500">Has bookings</span>
        </div>
      </div>

      <style jsx global>{`
        .slot-calendar .rdp-root {
          --rdp-accent-color: #7c3aed;
          --rdp-accent-background-color: #ede9fe;
          --rdp-day-height: 40px;
          --rdp-day-width: 40px;
          --rdp-selected-font: 600 14px/1 system-ui;
          font-size: 14px;
          width: 100%;
        }
        .slot-calendar .rdp-month_caption {
          font-weight: 700;
          font-size: 16px;
          color: #1e293b;
          padding: 8px 0;
        }
        .slot-calendar .rdp-weekday {
          font-weight: 600;
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .slot-calendar .rdp-day {
          position: relative;
        }
        .slot-calendar .rdp-day button {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #334155;
          transition: all 0.15s;
        }
        .slot-calendar .rdp-day button:hover:not(:disabled) {
          background: #f1f5f9;
        }
        .slot-calendar .rdp-day_button {
          position: relative;
          border-radius: 10px;
        }
        .slot-calendar .day-today {
          font-weight: 700 !important;
          color: #7c3aed !important;
        }
        .slot-calendar .day-today:not(.day-selected) {
          background: #f5f3ff !important;
          border: 2px solid #c4b5fd !important;
          border-radius: 10px !important;
        }
        .slot-calendar .day-selected {
          background: #7c3aed !important;
          color: white !important;
          font-weight: 600 !important;
          border-radius: 10px !important;
        }
        .slot-calendar .day-disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .slot-calendar .day-has-slots:not(.day-selected) {
          background: #ede9fe;
          color: #6d28d9;
          font-weight: 600;
          border-radius: 10px;
        }
        .slot-calendar .day-has-bookings:not(.day-selected) {
          box-shadow: inset 0 0 0 2px #34d399;
          border-radius: 10px;
        }
        .slot-calendar .rdp-nav {
          gap: 4px;
        }
        .slot-calendar .rdp-button_previous,
        .slot-calendar .rdp-button_next {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          color: #7c3aed;
          border: 1px solid #e2e8f0;
          transition: all 0.15s;
        }
        .slot-calendar .rdp-button_previous:hover,
        .slot-calendar .rdp-button_next:hover {
          background: #f5f3ff;
          border-color: #c4b5fd;
        }
        .slot-calendar .rdp-months {
          width: 100%;
        }
        .slot-calendar .rdp-month {
          width: 100%;
        }
        .slot-calendar .rdp-month_grid {
          width: 100%;
        }
        .slot-calendar .rdp-outside {
          opacity: 0.25;
        }
      `}</style>
    </div>
  );
}
