'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { SESSION_DURATIONS, type SessionDuration } from '@/lib/types';

interface SessionDurationPickerProps {
  value: number;
  onChange: (duration: SessionDuration) => void;
}

export default function SessionDurationPicker({ value, onChange }: SessionDurationPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Default Session Duration
      </label>
      <p className="text-xs text-slate-400 mb-3">
        Sets the default length for patient consultations
      </p>
      <div className="flex gap-2">
        {SESSION_DURATIONS.map((dur) => (
          <button
            key={dur}
            onClick={() => onChange(dur)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              value === dur
                ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {dur} min
          </button>
        ))}
      </div>
    </div>
  );
}
