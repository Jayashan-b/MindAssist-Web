'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  Check,
  User,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { createSpecialist } from '@/lib/firestore';
import { useAuth } from '@/lib/hooks/useAuth';
import { SPECIALTIES, LANGUAGES, SPECIALIZATIONS, CONSULTATION_TYPES, isValidSlmcNumber } from '@/lib/types';
import type { Specialist } from '@/lib/types';
import { sanitizeInput, sanitizeArray } from '@/lib/utils';
import QualificationComboBox from '@/components/portal/QualificationComboBox';

const STEPS = [
  { title: 'Personal Info', icon: User },
  { title: 'Qualifications', icon: GraduationCap },
  { title: 'Practice Details', icon: Briefcase },
];

export default function RegisterPage() {
  const router = useRouter();
  const { refreshSpecialist } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Personal Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [specialty, setSpecialty] = useState<string>(SPECIALTIES[0]);
  const [gender, setGender] = useState<string>('Male');

  // Step 2: Qualifications
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState<number>(1);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [bio, setBio] = useState('');

  // Step 3: Practice Details
  const [clinicAddress, setClinicAddress] = useState('');
  const [consultationFee, setConsultationFee] = useState<number>(3000);
  const [selectedConsultationTypes, setSelectedConsultationTypes] = useState<string[]>(['video', 'audio']);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/portal/login');
      return;
    }
    setName(user.displayName || '');
    setEmail(user.email || '');
  }, [router]);

  const toggleArrayItem = (
    arr: string[],
    setArr: (v: string[]) => void,
    item: string,
  ) => {
    if (arr.includes(item)) {
      setArr(arr.filter((i) => i !== item));
    } else {
      setArr([...arr, item]);
    }
  };

  const slmcError = registrationNumber.trim() && !isValidSlmcNumber(registrationNumber)
    ? 'Invalid format. Use SLMC-12345, SLMC/12345, or a 4-6 digit number.'
    : null;

  const canProceed = () => {
    if (step === 0) {
      return name.trim() && registrationNumber.trim() && !slmcError && specialty;
    }
    if (step === 1) {
      return (
        qualifications.length > 0 &&
        selectedLanguages.length > 0 &&
        selectedSpecializations.length > 0
      );
    }
    if (step === 2) {
      return consultationFee > 0 && selectedConsultationTypes.length > 0;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setError(null);

    const priceInCents = consultationFee * 100;
    const specialistId = `specialist_${Date.now()}`;

    // Sanitize all user inputs before persisting
    const safeName = sanitizeInput(name, 100);
    const safeRegNum = sanitizeInput(registrationNumber, 20);
    const safeBio = sanitizeInput(bio, 1000);
    const safeClinic = sanitizeInput(clinicAddress, 300);
    const safeQualifications = sanitizeArray(qualifications, 200);

    const specialistData: Omit<Specialist, 'id'> = {
      authUid: auth.currentUser.uid,
      email: auth.currentUser.email || email,
      registrationNumber: safeRegNum,
      name: safeName,
      specialty,
      photoUrl: auth.currentUser.photoURL || null,
      languages: selectedLanguages,
      priceFormatted: `LKR ${consultationFee.toLocaleString()}`,
      priceInCents,
      isAvailable: true,
      bio: safeBio || null,
      qualifications: safeQualifications,
      clinicAddress: safeClinic || null,
      gender,
      specializations: selectedSpecializations,
      isVerified: false,
      nextAvailableSlot: null,
      experienceYears,
      consultationTypes: selectedConsultationTypes,
      availableSlots: null,
      reviews: [],
    };

    try {
      await createSpecialist(specialistId, specialistData);
      await refreshSpecialist();
      router.push('/portal/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative w-full max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/40 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl mb-3 shadow-lg shadow-violet-500/25">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Create Your Profile
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Complete your specialist profile to start accepting patients
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.title}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i <= step
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:block ${
                      i <= step ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 ${
                      i < step ? 'bg-violet-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Steps */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
                      placeholder="Dr. Sarah Wijesinghe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SLMC Registration Number
                    </label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-50/80 border rounded-xl text-slate-900 focus:ring-2 outline-none transition-all ${
                        slmcError
                          ? 'border-red-300 focus:ring-red-500/30 focus:border-red-400'
                          : 'border-slate-200 focus:ring-violet-500/30 focus:border-violet-400'
                      }`}
                      placeholder="e.g. SLMC-12345"
                    />
                    {slmcError && (
                      <p className="text-xs text-red-500 mt-1">{slmcError}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Specialty</label>
                      <select
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
                      >
                        {SPECIALTIES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <QualificationComboBox
                    value={qualifications}
                    onChange={setQualifications}
                  />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
                      className="w-32 px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Languages</label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => toggleArrayItem(selectedLanguages, setSelectedLanguages, lang)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            selectedLanguages.includes(lang)
                              ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Specializations
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALIZATIONS.map((spec) => (
                        <button
                          key={spec}
                          onClick={() =>
                            toggleArrayItem(selectedSpecializations, setSelectedSpecializations, spec)
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedSpecializations.includes(spec)
                              ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {spec}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all resize-none"
                      placeholder="Tell patients about your practice and approach..."
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Clinic Address
                    </label>
                    <input
                      type="text"
                      value={clinicAddress}
                      onChange={(e) => setClinicAddress(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
                      placeholder="e.g. 45 Duplication Road, Colombo 3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Consultation Fee (LKR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">LKR</span>
                      <input
                        type="number"
                        min={500}
                        step={500}
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(parseInt(e.target.value) || 0)}
                        className="w-full pl-14 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">This fee applies to both video and audio consultations</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Consultation Types
                    </label>
                    <div className="flex gap-3">
                      {CONSULTATION_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() =>
                            toggleArrayItem(selectedConsultationTypes, setSelectedConsultationTypes, type)
                          }
                          className={`flex-1 py-3 rounded-xl text-sm font-semibold capitalize transition-all ${
                            selectedConsultationTypes.includes(type)
                              ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {type === 'video' ? '📹 Video Call' : '🎧 Audio Call'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary Preview */}
                  <div className="mt-6 p-4 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100">
                    <h3 className="text-sm font-bold text-slate-800 mb-3">Profile Preview</h3>
                    <div className="space-y-1.5 text-sm">
                      <p className="text-slate-600"><span className="font-medium text-slate-800">Name:</span> {name}</p>
                      <p className="text-slate-600"><span className="font-medium text-slate-800">Specialty:</span> {specialty}</p>
                      <p className="text-slate-600"><span className="font-medium text-slate-800">SLMC:</span> {registrationNumber}</p>
                      <p className="text-slate-600"><span className="font-medium text-slate-800">Fee:</span> LKR {consultationFee.toLocaleString()}</p>
                      <p className="text-slate-600"><span className="font-medium text-slate-800">Languages:</span> {selectedLanguages.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 active:scale-[0.98] transition-all shadow-md shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || !canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Complete Registration
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
