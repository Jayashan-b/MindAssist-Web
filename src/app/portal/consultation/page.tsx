'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Video,
  Phone,
  ExternalLink,
  User,
  Clock,
  Calendar,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AuthGuard from '@/components/portal/AuthGuard';
import PortalSidebar from '@/components/portal/PortalSidebar';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAppointments } from '@/lib/hooks/useAppointments';
import { watchConsultationMessages, markDoctorJoined, markDoctorLeft, type ConsultationMessage } from '@/lib/firestore';
import type { Appointment } from '@/lib/types';

export default function ConsultationPage() {
  return (
    <AuthGuard>
      <ConsultationContent />
    </AuthGuard>
  );
}

function ConsultationContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const userId = searchParams.get('userId');

  const { specialist } = useAuth();
  const { appointments, loading: aptsLoading } = useAppointments(specialist?.id);

  const appointment = appointments.find((a) => a.id === appointmentId);

  if (aptsLoading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <PortalSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!appointment || !userId) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <PortalSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Appointment not found</p>
            <Link
              href="/portal/dashboard"
              className="inline-flex items-center gap-2 mt-4 text-sm text-violet-600 font-medium hover:text-violet-700"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PortalSidebar />
      <main className="flex-1 p-8">
        <ConsultationView appointment={appointment} userId={userId} specialist={specialist} />
      </main>
    </div>
  );
}

interface ConsultationViewProps {
  appointment: Appointment;
  userId: string;
  specialist: { id: string; name: string; authUid: string } | null;
}

function ConsultationView({ appointment, userId, specialist }: ConsultationViewProps) {
  const [now, setNow] = useState(new Date());
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = watchConsultationMessages(userId, appointment.id, setMessages);
    return unsub;
  }, [userId, appointment.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const scheduledDate = new Date(appointment.scheduledAt);
  const minutesBefore = differenceInMinutes(scheduledDate, now);
  const minutesAfter = differenceInMinutes(now, scheduledDate);
  const duration = appointment.durationMinutes || 30;
  const isWithinJoinWindow = minutesBefore <= 15 && minutesAfter <= (duration + 15);
  const isValidUrl = appointment.meetingUrl?.startsWith('https://meet.jit.si/');

  const isAudio = appointment.consultationType === 'audio';
  const CallIcon = isAudio ? Phone : Video;
  const isSessionEnded = appointment.status === 'completed' || appointment.status === 'rated';
  const hasDoctorJoined = !!appointment.doctorJoinedAt;
  const hasDoctorLeft = !!appointment.doctorLeftAt;

  // Doctor can start the meeting if within join window and hasn't started yet
  const canStartMeeting = !hasDoctorJoined && !isSessionEnded && isWithinJoinWindow &&
    (appointment.status === 'confirmed' || appointment.status === 'inProgress');

  // Doctor can rejoin if already started and session not ended
  const canRejoinCall = hasDoctorJoined && !hasDoctorLeft && !isSessionEnded && isValidUrl;

  const displayName = appointment.anonymousMode
    ? appointment.anonymousAlias || 'Anonymous Patient'
    : 'Patient';

  const handleStartMeeting = async () => {
    setStarting(true);
    try {
      await markDoctorJoined(userId, appointment.id);
    } catch (err) {
      console.error('Failed to start meeting:', err);
    } finally {
      setStarting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !specialist) return;
    setSending(true);
    try {
      await addDoc(
        collection(db, 'users', userId, 'appointments', appointment.id, 'messages'),
        {
          senderId: specialist.authUid,
          senderName: specialist.name,
          text: newMessage.trim(),
          timestamp: serverTimestamp(),
          isAnonymous: false,
        },
      );
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this session? This will mark the appointment as completed.')) return;
    setEnding(true);
    try {
      await markDoctorLeft(userId, appointment.id);
    } catch (err) {
      console.error('Failed to end session:', err);
    } finally {
      setEnding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/portal/dashboard"
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consultation</h1>
          <p className="text-sm text-slate-500">
            Session with {displayName}
          </p>
        </div>
        {isSessionEnded && (
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
            Session Ended
          </span>
        )}
        {hasDoctorJoined && !isSessionEnded && (
          <span className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">
            Meeting Started
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Call + Patient Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Call Card */}
          <div className={`p-5 rounded-2xl border ${
            canRejoinCall
              ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200/40'
              : canStartMeeting
                ? 'bg-violet-50 border-violet-200 ring-1 ring-violet-200/40'
                : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <CallIcon className={`w-5 h-5 ${canRejoinCall ? 'text-emerald-600' : canStartMeeting ? 'text-violet-600' : 'text-slate-400'}`} />
              <h3 className="font-semibold text-sm text-slate-800">
                {isAudio ? 'Audio' : 'Video'} Call
              </h3>
            </div>

            {/* Step 1: Start Meeting (sets doctorJoinedAt) */}
            {canStartMeeting && (
              <button
                onClick={handleStartMeeting}
                disabled={starting}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {starting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CallIcon className="w-4 h-4" />
                )}
                {starting ? 'Starting...' : 'Start Meeting'}
              </button>
            )}

            {/* Step 2: Join Call (opens Jitsi after doctorJoinedAt is set) */}
            {canRejoinCall && (
              <a
                href={appointment.meetingUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <CallIcon className="w-4 h-4" />
                {hasDoctorJoined ? 'Join' : 'Rejoin'} {isAudio ? 'Audio' : 'Video'} Call
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Session ended */}
            {isSessionEnded && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Session completed
              </div>
            )}

            {/* Not yet in join window */}
            {!canStartMeeting && !canRejoinCall && !isSessionEnded && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
                {minutesBefore > 15
                  ? `Join opens in ${minutesBefore - 15} min`
                  : 'Join window has passed'}
              </div>
            )}

            {/* End Session button */}
            {!isSessionEnded && (appointment.status === 'confirmed' || appointment.status === 'inProgress') && (
              <button
                onClick={handleEndSession}
                disabled={ending}
                className="mt-3 w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {ending ? 'Ending...' : 'End Session'}
              </button>
            )}
          </div>

          {/* Patient Info Card */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white">
            <h3 className="font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Patient Info
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Name:</span>
                <span className="font-medium text-slate-700">{displayName}</span>
                {appointment.anonymousMode && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-violet-100 text-violet-600">Anonymous</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600">{format(scheduledDate, 'EEEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600">
                  {format(scheduledDate, 'hh:mm a')} · {appointment.durationMinutes || 30} min
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Type:</span>
                <span className="capitalize text-slate-700">{appointment.consultationType}</span>
              </div>
            </div>

            {appointment.notes && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Patient Notes</p>
                <p className="text-sm text-slate-700">{appointment.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
          {/* Chat Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-sm text-slate-800">Consultation Chat</h3>
            <span className="text-xs text-slate-400 ml-auto">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="w-10 h-10 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No messages yet</p>
                <p className="text-xs text-slate-300 mt-1">Start the conversation with your patient</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = specialist && msg.senderId === specialist.authUid;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-violet-600 text-white rounded-br-md'
                          : 'bg-slate-100 text-slate-800 rounded-bl-md'
                      }`}
                    >
                      {!isMe && (
                        <p className={`text-xs font-medium mb-1 ${isMe ? 'text-violet-200' : 'text-slate-500'}`}>
                          {msg.isAnonymous ? 'Anonymous' : msg.senderName}
                        </p>
                      )}
                      <p>{msg.text}</p>
                      {msg.timestamp && (
                        <p className={`text-xs mt-1 ${isMe ? 'text-violet-300' : 'text-slate-400'}`}>
                          {typeof msg.timestamp === 'string'
                            ? format(new Date(msg.timestamp), 'hh:mm a')
                            : ''}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {!isSessionEnded && (
            <div className="px-5 py-3 border-t border-slate-100">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
