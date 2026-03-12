export interface Review {
  name: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Specialist {
  id: string;
  authUid: string;
  email: string;
  registrationNumber: string;
  name: string;
  specialty: string;
  photoUrl: string | null;
  languages: string[];
  priceFormatted: string;
  priceInCents: number;
  isAvailable: boolean;
  bio: string | null;
  qualifications: string[];
  clinicAddress: string | null;
  gender: string | null;
  specializations: string[];
  isVerified: boolean;
  nextAvailableSlot: string | null;
  experienceYears: number | null;
  consultationTypes: string[];
  availableSlots: Record<string, string[]> | null;
  reviews: Review[];
  isOnCall: boolean;
  onCallPriceInCents: number;
  onCallPriceFormatted: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'pendingPayment'
  | 'confirmed'
  | 'inProgress'
  | 'completed'
  | 'cancelled'
  | 'rated';

export type ConsultationType = 'video' | 'audio';

export interface Appointment {
  id: string;
  userId: string;
  specialistId: string;
  specialistName: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  consultationType: ConsultationType;
  anonymousMode: boolean;
  anonymousAlias: string | null;
  paymentId: string | null;
  paymentStatus: string | null;
  agoraChannelName: string | null;
  rating: number | null;
  ratingComment: string | null;
  durationMinutes: number;
  meetingUrl: string | null;
  doctorJoinedAt: string | null;
  doctorLeftAt: string | null;
  sessionStartedAt: string | null;
}

export const SPECIALTIES = ['Psychiatrist', 'Psychologist', 'Counsellor'] as const;

export const LANGUAGES = ['English', 'Sinhala', 'Tamil'] as const;

export const SPECIALIZATIONS = [
  'Anxiety',
  'Depression',
  'CBT',
  'Trauma',
  'PTSD',
  'OCD',
  'Bipolar',
  'Stress',
  'Grief',
  'Relationships',
  'Mindfulness',
  'Family Therapy',
] as const;

export const COMMON_QUALIFICATIONS = [
  'MBBS',
  'MD',
  'MD Psychiatry',
  'MPhil',
  'PhD',
  'Diploma in Psychiatry',
  'DCH',
  'MRCP',
  'FRCP',
  'MSc Clinical Psychology',
  'PgDip Counselling',
  'BA Psychology',
  'MA Psychology',
  'Board Certified Psychiatrist',
  'Licensed Clinical Psychologist',
  'Registered Counsellor',
] as const;

export const CONSULTATION_TYPES = ['video', 'audio'] as const;

// SLMC Registration Number format validation
// Accepts: SLMC-12345, SLMC/12345, SLMC12345, or plain 4-6 digit numbers
export const SLMC_REGEX = /^(SLMC[-/]?\d{4,6}|\d{4,6})$/i;

export function isValidSlmcNumber(value: string): boolean {
  return SLMC_REGEX.test(value.trim());
}

// Full 24-hour time slots in 30-minute intervals
export const TIME_SLOTS = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30',
  '03:00', '03:30', '04:00', '04:30', '05:00', '05:30',
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
] as const;

// Quick-add slot presets grouped by time period
export const SLOT_PRESETS: Record<string, { label: string; slots: string[] }> = {
  morning: { label: 'Morning (9 AM – 12 PM)', slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'] },
  afternoon: { label: 'Afternoon (2 – 5 PM)', slots: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30'] },
  evening: { label: 'Evening (6 – 9 PM)', slots: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'] },
  night: { label: 'Night (9 PM – 12 AM)', slots: ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30'] },
};

// Group a slot time into a period label
export function getSlotPeriod(time: string): string {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour >= 6 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 18) return 'Afternoon';
  if (hour >= 18 && hour < 21) return 'Evening';
  return 'Night';
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  pendingPayment: 'Awaiting Payment',
  confirmed: 'Confirmed',
  inProgress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rated: 'Rated',
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  pendingPayment: 'bg-orange-100 text-orange-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  inProgress: 'bg-blue-100 text-blue-800',
  completed: 'bg-slate-100 text-slate-800',
  cancelled: 'bg-red-100 text-red-800',
  rated: 'bg-violet-100 text-violet-800',
};
