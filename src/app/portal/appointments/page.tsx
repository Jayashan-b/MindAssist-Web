'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Search } from 'lucide-react';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import AppointmentCard from '@/components/portal/AppointmentCard';
import SessionNotificationBanner from '@/components/portal/SessionNotificationBanner';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAppointments } from '@/lib/hooks/useAppointments';
import { useSessionNotifications } from '@/lib/hooks/useSessionNotifications';

type TabFilter = 'all' | 'upcoming' | 'inProgress' | 'completed' | 'cancelled';

export default function AppointmentsPage() {
  return (
    <AuthGuard>
      <AppointmentsContent />
    </AuthGuard>
  );
}

function AppointmentsContent() {
  const { specialist } = useAuth();
  const { appointments, upcoming, completed, cancelled, inProgress, loading } = useAppointments(specialist?.id);
  const { approachingSessions } = useSessionNotifications(appointments);
  const [tab, setTab] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const filteredAppointments = useMemo(() => {
    let list: typeof appointments;
    switch (tab) {
      case 'upcoming': list = upcoming; break;
      case 'inProgress': list = inProgress; break;
      case 'completed': list = completed; break;
      case 'cancelled': list = cancelled; break;
      default: list = appointments;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        const name = a.anonymousMode
          ? (a.anonymousAlias || 'anonymous')
          : (a.patientName || 'patient');
        return name.toLowerCase().includes(q);
      });
    }

    // Sort
    const sorted = [...list];
    sorted.sort((a, b) => {
      const da = new Date(a.scheduledAt).getTime();
      const db = new Date(b.scheduledAt).getTime();
      return sortOrder === 'newest' ? db - da : da - db;
    });

    return sorted;
  }, [tab, appointments, upcoming, inProgress, completed, cancelled, search, sortOrder]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: appointments.length },
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'inProgress', label: 'In Progress', count: inProgress.length },
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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
            <p className="text-sm text-slate-500 mt-1">
              View and manage all your patient consultations
            </p>
          </div>

          {/* Session Notifications */}
          <SessionNotificationBanner sessions={approachingSessions} />

          {/* Search + Sort */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by patient name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
              />
            </div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
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
                <p className="text-sm text-slate-500">
                  {search.trim()
                    ? `No appointments matching "${search}"`
                    : `No ${tab === 'all' ? '' : tab} appointments found`}
                </p>
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
