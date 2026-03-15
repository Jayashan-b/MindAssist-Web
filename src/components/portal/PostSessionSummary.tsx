'use client';

import React from 'react';
import { CheckCircle2, Clock, Video, Phone, Star, FileText, FolderOpen } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';

interface PostSessionSummaryProps {
  doctorJoinedAt: string | null;
  doctorLeftAt: string | null;
  consultationType: 'video' | 'audio';
  patientName: string;
  rating?: number | null;
  ratingComment?: string | null;
  notesCount: number;
  documentsCount: number;
}

export default function PostSessionSummary({
  doctorJoinedAt,
  doctorLeftAt,
  consultationType,
  patientName,
  rating,
  ratingComment,
  notesCount,
  documentsCount,
}: PostSessionSummaryProps) {
  const isAudio = consultationType === 'audio';
  const CallIcon = isAudio ? Phone : Video;

  // Calculate actual session duration
  const actualDuration =
    doctorJoinedAt && doctorLeftAt
      ? differenceInMinutes(new Date(doctorLeftAt), new Date(doctorJoinedAt))
      : null;

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        <h3 className="font-semibold text-sm text-slate-800">Session Summary</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Duration */}
        <div className="bg-white rounded-xl p-3 text-center border border-slate-100">
          <Clock className="w-4 h-4 text-violet-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-slate-800">
            {actualDuration !== null ? `${actualDuration}` : '—'}
          </p>
          <p className="text-[10px] text-slate-500">minutes</p>
        </div>

        {/* Type */}
        <div className="bg-white rounded-xl p-3 text-center border border-slate-100">
          <CallIcon className="w-4 h-4 text-blue-500 mx-auto mb-1" />
          <p className="text-sm font-semibold text-slate-800 capitalize">{consultationType}</p>
          <p className="text-[10px] text-slate-500">session type</p>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl p-3 text-center border border-slate-100">
          <FileText className="w-4 h-4 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-slate-800">{notesCount}</p>
          <p className="text-[10px] text-slate-500">note{notesCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl p-3 text-center border border-slate-100">
          <FolderOpen className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-slate-800">{documentsCount}</p>
          <p className="text-[10px] text-slate-500">document{documentsCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Rating if exists */}
      {rating && (
        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-slate-700">
            Rated by {patientName}
          </span>
          {ratingComment && (
            <span className="text-xs text-slate-500 truncate ml-auto">&ldquo;{ratingComment}&rdquo;</span>
          )}
        </div>
      )}
    </div>
  );
}
