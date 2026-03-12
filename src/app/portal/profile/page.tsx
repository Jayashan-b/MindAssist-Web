'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Star, CheckCircle } from 'lucide-react';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import { useAuth } from '@/lib/hooks/useAuth';
import { updateSpecialist } from '@/lib/firestore';
import { LANGUAGES, SPECIALIZATIONS, CONSULTATION_TYPES } from '@/lib/types';
import QualificationComboBox from '@/components/portal/QualificationComboBox';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { specialist, refreshSpecialist } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [bio, setBio] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [consultationTypes, setConsultationTypes] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [consultationFee, setConsultationFee] = useState(0);
  const [qualifications, setQualifications] = useState<string[]>([]);

  useEffect(() => {
    if (specialist) {
      setBio(specialist.bio || '');
      setClinicAddress(specialist.clinicAddress || '');
      setLanguages(specialist.languages);
      setSpecializations(specialist.specializations);
      setConsultationTypes(specialist.consultationTypes);
      setIsAvailable(specialist.isAvailable);
      setConsultationFee(specialist.priceInCents / 100);
      setQualifications(specialist.qualifications);
    }
  }, [specialist]);

  const toggleArrayItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    if (arr.includes(item)) {
      setArr(arr.filter((i) => i !== item));
    } else {
      setArr([...arr, item]);
    }
  };

  const handleSave = async () => {
    if (!specialist) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateSpecialist(specialist.id, {
        bio: bio || null,
        clinicAddress: clinicAddress || null,
        languages,
        specializations,
        consultationTypes,
        isAvailable,
        priceInCents: consultationFee * 100,
        priceFormatted: `LKR ${consultationFee.toLocaleString()}`,
        qualifications,
      });
      await refreshSpecialist();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const avgRating = specialist?.reviews?.length
    ? (specialist.reviews.reduce((sum, r) => sum + r.rating, 0) / specialist.reviews.length).toFixed(1)
    : null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PortalSidebar />
      <main className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
              <p className="text-sm text-slate-500 mt-1">Manage your specialist profile</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-md ${
                saved
                  ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                  : 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-500/25'
              } disabled:opacity-50`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <><CheckCircle className="w-4 h-4" /> Saved</>
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </button>
          </div>

          {/* Read-only header */}
          {specialist && (
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
              <div className="flex items-center gap-4">
                {specialist.photoUrl ? (
                  <img
                    src={specialist.photoUrl}
                    alt={specialist.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                    {specialist.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{specialist.name}</h2>
                  <p className="text-violet-200 text-sm">{specialist.specialty}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-violet-200">SLMC: {specialist.registrationNumber}</span>
                    {avgRating && (
                      <span className="flex items-center gap-1 text-xs text-amber-200">
                        <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                        {avgRating} ({specialist.reviews.length} reviews)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Editable fields */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-6">
            {/* Availability */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-800">Available for bookings</p>
                <p className="text-xs text-slate-400">Toggle to show/hide from marketplace</p>
              </div>
              <button
                onClick={() => setIsAvailable(!isAvailable)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    isAvailable ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all resize-none"
              />
            </div>

            {/* Qualifications */}
            <QualificationComboBox
              value={qualifications}
              onChange={setQualifications}
            />

            {/* Clinic Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Clinic Address</label>
              <input
                type="text"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
              />
            </div>

            {/* Fee */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Fee (LKR)</label>
              <input
                type="number"
                min={500}
                step={500}
                value={consultationFee}
                onChange={(e) => setConsultationFee(parseInt(e.target.value) || 0)}
                className="w-48 px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
              />
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Languages</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => toggleArrayItem(languages, setLanguages, lang)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      languages.includes(lang)
                        ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Specializations */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Specializations</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => toggleArrayItem(specializations, setSpecializations, spec)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      specializations.includes(spec)
                        ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Consultation Types */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Consultation Types</label>
              <div className="flex gap-3">
                {CONSULTATION_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleArrayItem(consultationTypes, setConsultationTypes, type)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold capitalize transition-all ${
                      consultationTypes.includes(type)
                        ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'video' ? '📹 Video Call' : '🎧 Audio Call'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
