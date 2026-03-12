import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Specialist, Appointment } from './types';

// ── Specialist helpers ─────────────────────────────────────────────

export function specialistFromDoc(data: DocumentData, id: string): Specialist {
  return {
    id,
    authUid: data.authUid ?? '',
    email: data.email ?? '',
    registrationNumber: data.registrationNumber ?? '',
    name: data.name ?? '',
    specialty: data.specialty ?? '',
    photoUrl: data.photoUrl ?? null,
    languages: data.languages ?? [],
    priceFormatted: data.priceFormatted ?? '',
    priceInCents: data.priceInCents ?? 0,
    isAvailable: data.isAvailable ?? false,
    bio: data.bio ?? null,
    qualifications: data.qualifications ?? [],
    clinicAddress: data.clinicAddress ?? null,
    gender: data.gender ?? null,
    specializations: data.specializations ?? [],
    isVerified: data.isVerified ?? false,
    nextAvailableSlot: data.nextAvailableSlot ?? null,
    experienceYears: data.experienceYears ?? null,
    consultationTypes: data.consultationTypes ?? ['video', 'audio'],
    availableSlots: data.availableSlots ?? null,
    reviews: data.reviews ?? [],
    isOnCall: data.isOnCall ?? false,
    onCallPriceInCents: data.onCallPriceInCents ?? data.priceInCents ?? 0,
    onCallPriceFormatted: data.onCallPriceFormatted ?? data.priceFormatted ?? 'LKR 0',
  };
}

export async function getSpecialistByAuthUid(uid: string): Promise<Specialist | null> {
  const q = query(collection(db, 'specialists'), where('authUid', '==', uid));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return specialistFromDoc(docSnap.data(), docSnap.id);
}

export async function getSpecialistById(id: string): Promise<Specialist | null> {
  const docSnap = await getDoc(doc(db, 'specialists', id));
  if (!docSnap.exists()) return null;
  return specialistFromDoc(docSnap.data(), docSnap.id);
}

export function watchSpecialist(
  specialistId: string,
  callback: (specialist: Specialist | null) => void,
) {
  return onSnapshot(doc(db, 'specialists', specialistId), (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
      return;
    }
    callback(specialistFromDoc(docSnap.data(), docSnap.id));
  });
}

export async function createSpecialist(
  id: string,
  data: Omit<Specialist, 'id'>,
): Promise<void> {
  const { ...docData } = data;
  await setDoc(doc(db, 'specialists', id), docData);
}

export async function updateSpecialist(
  id: string,
  data: Partial<Specialist>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...updateData } = data;
  await updateDoc(doc(db, 'specialists', id), updateData);
}

// ── Appointment helpers ────────────────────────────────────────────

function appointmentFromDoc(data: DocumentData, id: string): Appointment {
  return {
    id,
    userId: data.userId ?? '',
    specialistId: data.specialistId ?? '',
    specialistName: data.specialistName ?? '',
    scheduledAt: data.scheduledAt ?? '',
    status: data.status ?? 'pending',
    notes: data.notes ?? null,
    createdAt: data.createdAt ?? '',
    consultationType: data.consultationType ?? 'video',
    anonymousMode: data.anonymousMode ?? false,
    anonymousAlias: data.anonymousAlias ?? null,
    paymentId: data.paymentId ?? null,
    paymentStatus: data.paymentStatus ?? null,
    agoraChannelName: data.agoraChannelName ?? null,
    rating: data.rating ?? null,
    ratingComment: data.ratingComment ?? null,
    durationMinutes: data.durationMinutes ?? 30,
    meetingUrl: data.meetingUrl ?? null,
  };
}

export function watchAppointmentsForSpecialist(
  specialistId: string,
  callback: (appointments: Appointment[]) => void,
) {
  const q = query(
    collectionGroup(db, 'appointments'),
    where('specialistId', '==', specialistId),
    orderBy('scheduledAt', 'desc'),
  );
  return onSnapshot(q, (snapshot) => {
    const appointments = snapshot.docs.map((d) => appointmentFromDoc(d.data(), d.id));
    callback(appointments);
  });
}

export async function updateAppointmentStatus(
  userId: string,
  appointmentId: string,
  status: string,
): Promise<void> {
  await updateDoc(
    doc(db, 'users', userId, 'appointments', appointmentId),
    { status },
  );
}

export function watchConsultationMessages(
  userId: string,
  appointmentId: string,
  callback: (messages: ConsultationMessage[]) => void,
) {
  const q = query(
    collection(db, 'users', userId, 'appointments', appointmentId, 'messages'),
    orderBy('timestamp', 'asc'),
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        senderId: data.senderId ?? '',
        senderName: data.senderName ?? '',
        text: data.text ?? '',
        timestamp: data.timestamp ?? '',
        isAnonymous: data.isAnonymous ?? false,
      };
    });
    callback(messages);
  });
}

export interface ConsultationMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isAnonymous: boolean;
}
