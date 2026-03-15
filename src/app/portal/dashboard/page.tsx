'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  Star,
  ArrowRight,
  Video,
} from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import Link from 'next/link';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import StatCard from '@/components/portal/StatCard';
import AppointmentCard from '@/components/portal/AppointmentCard';
import SessionNotificationBanner from '@/components/portal/SessionNotificationBanner';
import ActiveSessionCard from '@/components/portal/ActiveSessionCard';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCallSession } from '@/lib/hooks/useCallSession';
import { useAppointments } from '@/lib/hooks/useAppointments';
import { useSessionNotifications } from '@/lib/hooks/useSessionNotifications';
import { usePatients } from '@/lib/hooks/usePatients';
import PatientProfileModal from '@/components/portal/PatientProfileModal';
import type { PatientProfile } from '@/lib/types';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { specialist } = useAuth();
  const callSession = useCallSession();
  const { appointments, upcoming, completed, paid, uniquePatientCount, loading } = useAppointments(specialist?.id);
  const { approachingSessions } = useSessionNotifications(appointments);
  const { patients, getPatient } = usePatients(appointments);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);

  const handleViewPatient = useCallback((profileKey: string) => {
    const match = getPatient(profileKey);
    if (match) setSelectedPatient(match);
  }, [getPatient]);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Active sessions: doctor joined and hasn't left, or within join window
  // Exclude the currently connected appointment (shown in layout-level persistent banner)
  const activeSessions = appointments.filter((a) => {
    if (callSession.isConnected && callSession.activeAppointmentId === a.id) return false;
    if (a.status !== 'confirmed' && a.status !== 'inProgress') return false;
    if (!a.meetingUrl?.startsWith('consultation-') && !a.meetingUrl?.startsWith('https://meet.jit.si/')) return false;
    // Active if doctor joined and hasn't left
    if (a.doctorJoinedAt && !a.doctorLeftAt) return true;
    // Or within join window
    const scheduled = new Date(a.scheduledAt);
    const minBefore = differenceInMinutes(scheduled, now);
    const minAfter = differenceInMinutes(now, scheduled);
    const duration = a.durationMinutes || 30;
    return minBefore <= 15 && minAfter <= (duration + 15);
  });

  const totalIncome = paid.length * (specialist?.priceInCents ?? 0) / 100;

  const avgRating = specialist?.reviews?.length
    ? (specialist.reviews.reduce((sum: number, r) => sum + r.rating, 0) / specialist.reviews.length).toFixed(1)
    : '—';

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
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {specialist?.name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Here&apos;s an overview of your practice
            </p>
          </div>

          {/* Approaching session notifications */}
          <SessionNotificationBanner sessions={approachingSessions} />
          <ActiveSessionCard />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Appointments"
              value={loading ? '...' : appointments.length}
              icon={CalendarCheck}
              color="violet"
            />
            <StatCard
              title="Upcoming"
              value={loading ? '...' : upcoming.length}
              subtitle="Confirmed sessions"
              icon={Clock}
              color="blue"
            />
            <StatCard
              title="Completed"
              value={loading ? '...' : completed.length}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatCard
              title="Avg Rating"
              value={avgRating}
              subtitle={`${specialist?.reviews?.length ?? 0} reviews`}
              icon={Star}
              color="amber"
            />
          </div>

          {/* Active Calls */}
          {!loading && activeSessions.length > 0 && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200/60 p-6 mb-6 ring-1 ring-emerald-200/40">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <h2 className="text-lg font-bold text-emerald-900">Active Sessions</h2>
                <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Video className="w-3.5 h-3.5" />
                  {activeSessions.length} session{activeSessions.length !== 1 ? 's' : ''} ready
                </span>
              </div>
              <div className="space-y-3">
                {activeSessions.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onViewPatient={handleViewPatient}
                    isStillConnected={callSession.isConnected && callSession.activeAppointmentId === apt.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Upcoming Appointments</h2>
              <Link
                href="/portal/appointments"
                className="flex items-center gap-1 text-sm text-violet-600 font-medium hover:text-violet-700"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-12">
                <CalendarCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No upcoming appointments</p>
                <Link
                  href="/portal/slots"
                  className="inline-block mt-3 text-sm text-violet-600 font-medium hover:text-violet-700"
                >
                  Set up your availability →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 5).map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onViewPatient={handleViewPatient}
                    isStillConnected={callSession.isConnected && callSession.activeAppointmentId === apt.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {!loading && paid.length > 0 && (
            <div className="mt-6 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-violet-200 font-medium">Total Earnings</p>
                  <p className="text-3xl font-bold mt-1">
                    LKR {totalIncome.toLocaleString()}
                  </p>
                  <p className="text-xs text-violet-200 mt-1">
                    From {paid.length} paid consultation{paid.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Link
                  href="/portal/income"
                  className="px-4 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors"
                >
                  View Details →
                </Link>
              </div>
            </div>
          )}
          {selectedPatient && (
            <PatientProfileModal
              open={!!selectedPatient}
              onClose={() => setSelectedPatient(null)}
              patient={selectedPatient}
              specialistId={specialist?.id}
            />
          )}
        </motion.div>
      </main>
    </div>
  );
}
