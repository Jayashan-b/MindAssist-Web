'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Calendar, Star, ShieldQuestion } from 'lucide-react';
import { format } from 'date-fns';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import PatientAvatar from '@/components/portal/PatientAvatar';
import PatientProfileModal from '@/components/portal/PatientProfileModal';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAppointments } from '@/lib/hooks/useAppointments';
import { usePatients } from '@/lib/hooks/usePatients';
import type { PatientProfile } from '@/lib/types';

type Filter = 'all' | 'regular' | 'anonymous';

export default function PatientsPage() {
  return (
    <AuthGuard>
      <PatientsContent />
    </AuthGuard>
  );
}

function PatientsContent() {
  const { specialist } = useAuth();
  const { appointments, loading } = useAppointments(specialist?.id);
  const { patients } = usePatients(appointments);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [sortBy, setSortBy] = useState<'lastVisit' | 'sessions' | 'name'>('lastVisit');

  const filteredPatients = useMemo(() => {
    let list = patients;

    // Filter
    if (filter === 'regular') list = list.filter((p) => !p.isAnonymous);
    if (filter === 'anonymous') list = list.filter((p) => p.isAnonymous);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.displayName.toLowerCase().includes(q));
    }

    // Sort
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'lastVisit') return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
      if (sortBy === 'sessions') return b.totalSessions - a.totalSessions;
      return a.displayName.localeCompare(b.displayName);
    });

    return sorted;
  }, [patients, filter, search, sortBy]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'regular', label: 'Regular' },
    { key: 'anonymous', label: 'Anonymous' },
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
            <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
            <p className="text-sm text-slate-500 mt-1">
              View and manage your patient records
            </p>
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
              />
            </div>
            <div className="flex gap-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    filter === f.key
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-violet-500/30 outline-none cursor-pointer"
            >
              <option value="lastVisit">Last visit</option>
              <option value="sessions">Most sessions</option>
              <option value="name">Name</option>
            </select>
          </div>

          {/* Patient Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {search.trim() ? `No patients matching "${search}"` : 'No patients found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((patient) => (
                <button
                  key={patient.profileKey}
                  onClick={() => setSelectedPatient(patient)}
                  className="bg-white rounded-2xl border border-slate-200/60 p-5 text-left hover:border-violet-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <PatientAvatar name={patient.displayName} isAnonymous={patient.isAnonymous} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-800 truncate group-hover:text-violet-700 transition-colors">
                        {patient.displayName}
                      </p>
                      {patient.isAnonymous ? (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-medium rounded-md">
                          <ShieldQuestion className="w-2.5 h-2.5" />
                          Anonymous Session
                        </span>
                      ) : (
                        patient.email && (
                          <p className="text-xs text-slate-400 truncate">{patient.email}</p>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {patient.totalSessions} session{patient.totalSessions !== 1 ? 's' : ''}
                    </span>
                    {patient.averageRating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400" />
                        {patient.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2">
                    Last visit: {format(new Date(patient.lastVisit), 'MMM d, yyyy')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Patient Profile Modal */}
        {selectedPatient && (
          <PatientProfileModal
            key={selectedPatient.userId}
            open={!!selectedPatient}
            onClose={() => setSelectedPatient(null)}
            patient={selectedPatient}
            specialistId={specialist?.id}
          />
        )}
      </main>
    </div>
  );
}
