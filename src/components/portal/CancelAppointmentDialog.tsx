'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { cancelAppointmentByDoctor } from '@/lib/firestore';

interface CancelAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  userId: string;
  patientName: string;
}

export default function CancelAppointmentDialog({
  open,
  onClose,
  appointmentId,
  userId,
  patientName,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleCancel = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await cancelAppointmentByDoctor(userId, appointmentId, reason.trim(), true);
      onClose();
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Cancel Appointment</h3>
            <p className="text-sm text-slate-500">With {patientName}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          This action cannot be undone. The patient will be notified of the cancellation.
        </p>

        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Reason for cancellation <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a reason..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-red-500/30 focus:border-red-400 outline-none transition-all resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Keep Appointment
          </button>
          <button
            onClick={handleCancel}
            disabled={!reason.trim() || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Cancel Appointment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
