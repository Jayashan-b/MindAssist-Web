'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import AppointmentCard from '@/components/portal/AppointmentCard';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAppointments } from '@/lib/hooks/useAppointments';

type TabFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

export default function AppointmentsPage() {
  return (
    <AuthGuard>
      <AppointmentsContent />
    </AuthGuard>
  );
}

function AppointmentsContent() {
  const { specialist } = useAuth();
  const { appointments, upcoming, completed, cancelled, loading } = useAppointments(specialist?.id);
  const [tab, setTab] = useState<TabFilter>('all');

  const filteredAppointments = (() => {
    switch (tab) {
      case 'upcoming': return upcoming;
      case 'completed': return completed;
      case 'cancelled': return cancelled;
      default: return appointments;
    }
  })();

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: appointments.length },
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'completed', label: 'Completed', count: completed.length },
    { key: 'cancelled', label: 'Cancelled', count: cancelled.length },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PortalSidebar />
      <main className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
            <p className="text-sm text-slate-500 mt-1">
              View all your patient consultations
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.label}
                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-xs ${
                  tab === t.key
                    ? 'bg-violet-500 text-violet-100'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No {tab === 'all' ? '' : tab} appointments found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
