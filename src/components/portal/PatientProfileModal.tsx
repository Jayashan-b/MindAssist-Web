'use client';

import React, { useRef, useState } from 'react';
import { X, Calendar, Star, FileText, FolderOpen, Clock, Video, Phone, Plus, Pencil, Trash2, Loader2, ShieldQuestion, Share2, Download, MessageCircle, Lock, Stethoscope, ChevronDown, Upload } from 'lucide-react';
import { format } from 'date-fns';
import type { PatientProfile, PatientNote, PatientDocument, Appointment, NoteCategory } from '@/lib/types';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS, NOTE_TAGS } from '@/lib/types';
import { usePatientNotes } from '@/lib/hooks/usePatientNotes';
import { useSessionNotes } from '@/lib/hooks/usePatientNotes';
import { usePatientDocuments } from '@/lib/hooks/usePatientDocuments';
import { useSessionDocuments } from '@/lib/hooks/usePatientDocuments';
import { usePatientUploads } from '@/lib/hooks/usePatientUploads';
import { usePatientMessage } from '@/lib/hooks/usePatientMessage';
import PatientAvatar from './PatientAvatar';
import PatientNoteEditor from './PatientNoteEditor';
import PatientDocumentUploader from './PatientDocumentUploader';
import { sessionRefId, patientRefId } from '@/lib/utils/referenceIds';

type Tab = 'overview' | 'sessions' | 'notes' | 'documents';

interface PatientProfileModalProps {
  open: boolean;
  onClose: () => void;
  patient: PatientProfile;
  specialistId: string | undefined;
}

export default function PatientProfileModal({
  open,
  onClose,
  patient,
  specialistId,
}: PatientProfileModalProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<PatientNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);

  // For anonymous patients, get the single appointment ID
  const anonymousAppointmentId = patient.isAnonymous ? patient.appointments[0]?.id : undefined;

  // Session notes — use real userId for regular, appointmentId for anonymous
  const {
    notes: sessionNotesRegular,
    loading: sessionNotesRegularLoading,
    addNote: addSessionNote,
    editNote: editSessionNote,
    removeNote: removeSessionNote,
    toggleSharing: toggleSessionNoteSharing,
  } = usePatientNotes(
    patient.isAnonymous ? undefined : specialistId,
    patient.isAnonymous ? undefined : patient.userId,
    { category: 'session' },
  );

  // For anonymous: query session notes by appointmentId — with CRUD
  const {
    notes: sessionNotesAnon,
    loading: sessionNotesAnonLoading,
    addNote: addSessionNoteAnon,
    editNote: editSessionNoteAnon,
    removeNote: removeSessionNoteAnon,
    toggleSharing: toggleSessionNoteSharingAnon,
  } = useSessionNotes(
    patient.isAnonymous ? specialistId : undefined,
    anonymousAppointmentId,
    patient.isAnonymous ? patient.userId : undefined,
  );

  // Clinical notes — enabled for all patients (including anonymous, keyed by ref ID)
  const {
    notes: clinicalNotes,
    loading: clinicalNotesLoading,
    addNote: addClinicalNote,
    editNote: editClinicalNote,
    removeNote: removeClinicalNote,
  } = usePatientNotes(
    specialistId,
    patient.userId,
    { category: 'patient' },
  );

  // Session documents — use real userId
  const {
    documents: sessionDocuments,
    uploading,
    error: docError,
    clearError: clearDocError,
    uploadDocument,
    removeDocument,
    toggleSharing: toggleDocSharing,
  } = usePatientDocuments(
    patient.isAnonymous ? undefined : specialistId,
    patient.isAnonymous ? undefined : patient.userId,
    { category: 'session' },
  );

  // For anonymous: session documents — with CRUD
  const {
    documents: sessionDocsAnon,
    uploading: uploadingAnon,
    error: docErrorAnon,
    clearError: clearDocErrorAnon,
    uploadDocument: uploadDocumentAnon,
    removeDocument: removeDocumentAnon,
    toggleSharing: toggleDocSharingAnon,
  } = useSessionDocuments(
    patient.isAnonymous ? specialistId : undefined,
    anonymousAppointmentId,
    patient.isAnonymous ? patient.userId : undefined,
  );

  // Clinical documents — enabled for all patients (including anonymous)
  const {
    documents: clinicalDocuments,
    loading: clinicalDocsLoading,
    uploading: clinicalUploading,
    error: clinicalDocError,
    clearError: clearClinicalDocError,
    uploadDocument: uploadClinicalDocument,
    removeDocument: removeClinicalDocument,
  } = usePatientDocuments(
    specialistId,
    patient.userId,
    { category: 'patient' },
  );

  const { uploads } = usePatientUploads(specialistId, patient.userId);
  const { message: patientMessage } = usePatientMessage(specialistId, patient.userId);

  if (!open) return null;

  // Resolve notes/docs and CRUD callbacks based on anonymous vs regular
  const sessionNotes = patient.isAnonymous ? sessionNotesAnon : sessionNotesRegular;
  const documents = patient.isAnonymous ? sessionDocsAnon : sessionDocuments;
  const resolvedAddSessionNote = patient.isAnonymous ? addSessionNoteAnon : addSessionNote;
  const resolvedEditSessionNote = patient.isAnonymous ? editSessionNoteAnon : editSessionNote;
  const resolvedRemoveSessionNote = patient.isAnonymous ? removeSessionNoteAnon : removeSessionNote;
  const resolvedToggleSessionNoteSharing = patient.isAnonymous ? toggleSessionNoteSharingAnon : toggleSessionNoteSharing;
  const resolvedUploadDocument = patient.isAnonymous ? uploadDocumentAnon : uploadDocument;
  const resolvedRemoveDocument = patient.isAnonymous ? removeDocumentAnon : removeDocument;
  const resolvedToggleDocSharing = patient.isAnonymous ? toggleDocSharingAnon : toggleDocSharing;
  const resolvedUploading = patient.isAnonymous ? uploadingAnon : uploading;
  const resolvedDocError = patient.isAnonymous ? docErrorAnon : docError;
  const resolvedClearDocError = patient.isAnonymous ? clearDocErrorAnon : clearDocError;

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Star },
    { key: 'sessions', label: 'Sessions', icon: Calendar },
    { key: 'notes', label: 'Clinical Notes', icon: Stethoscope },
    { key: 'documents', label: 'Clinical Records', icon: Lock },
  ];

  // Clinical note save handler (for Notes tab)
  const handleSaveClinicalNote = async (content: string, tags: string[], _appointmentId: string | null, _category: NoteCategory) => {
    if (editingNote) {
      await editClinicalNote(editingNote.id, content, tags);
      setEditingNote(null);
    } else {
      await addClinicalNote(content, tags, undefined, 'patient');
    }
    setShowNoteEditor(false);
  };

  const handleDeleteClinicalNote = async (noteId: string) => {
    setDeletingNote(noteId);
    await removeClinicalNote(noteId);
    setDeletingNote(null);
  };

  const handleUploadClinicalDocument = async (file: File, description?: string) => {
    await uploadClinicalDocument(file, description, undefined, 'patient');
  };

  const videoCount = patient.appointments.filter((a) => a.consultationType === 'video').length;
  const audioCount = patient.appointments.filter((a) => a.consultationType === 'audio').length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <PatientAvatar name={patient.displayName} isAnonymous={patient.isAnonymous} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">{patient.displayName}</h2>
              {patient.email && <p className="text-sm text-slate-500">{patient.email}</p>}
              <span className="inline-block mt-1 font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded select-all">{patientRefId(patient.profileKey)}</span>
              {patient.isAnonymous && (
                <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-lg">
                  <ShieldQuestion className="w-3.5 h-3.5" />
                  Anonymous Session — identity protected
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {t.key === 'notes' && clinicalNotes.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-violet-200 text-violet-700 rounded text-[10px] font-bold">{clinicalNotes.length}</span>
                )}
                {t.key === 'documents' && clinicalDocuments.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-violet-200 text-violet-700 rounded text-[10px] font-bold">{clinicalDocuments.length}</span>
                )}
                {t.key === 'sessions' && patient.appointments.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">{patient.appointments.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Last Session Summary */}
              {patient.appointments.length > 0 && (() => {
                const lastApt = patient.appointments[0];
                const lastSessionNote = sessionNotes.find((n) => n.appointmentId === lastApt.id);
                return (
                  <div className="bg-gradient-to-r from-violet-50 to-teal-50 rounded-xl p-4 border border-violet-100/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-600">
                        <Clock className="w-3 h-3" />
                        Last Session
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {format(new Date(lastApt.scheduledAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {lastSessionNote ? (
                      <p className="text-sm text-slate-700 line-clamp-2">{lastSessionNote.content}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No notes recorded</p>
                    )}
                  </div>
                );
              })()}

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-violet-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-violet-700">{patient.totalSessions}</p>
                  <p className="text-xs text-violet-500">Total Sessions</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{patient.completedSessions}</p>
                  <p className="text-xs text-emerald-500">Completed</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{patient.cancelledSessions}</p>
                  <p className="text-xs text-red-500">Cancelled</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">
                    {patient.averageRating ? patient.averageRating.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-amber-500">Avg Rating</p>
                </div>
              </div>

              {/* Details */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">First Visit</span>
                  <span className="font-medium text-slate-800">
                    {patient.firstVisit ? format(new Date(patient.firstVisit), 'MMM d, yyyy') : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Last Visit</span>
                  <span className="font-medium text-slate-800">
                    {patient.lastVisit ? format(new Date(patient.lastVisit), 'MMM d, yyyy') : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Consultation Preference</span>
                  <span className="font-medium text-slate-800 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs">
                      <Video className="w-3 h-3 text-blue-500" /> {videoCount}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <Phone className="w-3 h-3 text-emerald-500" /> {audioCount}
                    </span>
                  </span>
                </div>
              </div>

              {/* Quick clinical notes preview */}
              {clinicalNotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400" /> Clinical Notes
                  </h3>
                  <div className="space-y-2">
                    {clinicalNotes.slice(0, 3).map((note) => (
                      <div key={note.id} className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                        <p className="text-sm text-slate-700 line-clamp-2">{note.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px] font-medium">
                            <Lock className="w-2 h-2" /> Private
                          </span>
                          {note.tags.map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[10px] font-medium">{tag}</span>
                          ))}
                          <span className="text-[10px] text-slate-400 ml-auto">
                            {format(new Date(note.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {clinicalNotes.length > 3 && (
                    <button onClick={() => setTab('notes')} className="text-xs text-violet-600 font-medium mt-2 hover:text-violet-700">
                      View all {clinicalNotes.length} clinical notes →
                    </button>
                  )}
                </div>
              )}

              {/* Patient message preview */}
              {patientMessage && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-semibold text-teal-700">Message from Patient</span>
                    <span className="text-[10px] text-teal-500 ml-auto">
                      {format(new Date(patientMessage.sentAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-teal-800 line-clamp-2">{patientMessage.content}</p>
                </div>
              )}
            </div>
          )}

          {/* Sessions Tab — each session expandable with inline note/doc CRUD */}
          {tab === 'sessions' && (
            <div className="space-y-2">
              {patient.appointments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No sessions found</p>
              ) : (
                patient.appointments.map((apt: Appointment) => {
                  const notesForSession = sessionNotes.filter((n) => n.appointmentId === apt.id);
                  const docsForSession = documents.filter((d) => d.appointmentId === apt.id);
                  return (
                    <SessionDetailCard
                      key={apt.id}
                      appointment={apt}
                      notes={notesForSession}
                      documents={docsForSession}
                      isAnonymous={patient.isAnonymous}
                      onAddNote={async (content, tags) => {
                        if (patient.isAnonymous) {
                          await resolvedAddSessionNote(content, tags);
                        } else {
                          await resolvedAddSessionNote(content, tags, apt.id, 'session');
                        }
                      }}
                      onEditNote={async (noteId, content, tags) => {
                        await resolvedEditSessionNote(noteId, content, tags);
                      }}
                      onDeleteNote={async (noteId) => {
                        await resolvedRemoveSessionNote(noteId);
                      }}
                      onToggleNoteSharing={async (noteId, shared) => {
                        await resolvedToggleSessionNoteSharing(noteId, shared);
                      }}
                      onUploadDocument={async (file, description) => {
                        if (patient.isAnonymous) {
                          await resolvedUploadDocument(file, description);
                        } else {
                          await resolvedUploadDocument(file, description, apt.id, 'session');
                        }
                      }}
                      onRemoveDocument={async (doc) => {
                        await resolvedRemoveDocument(doc);
                      }}
                      onToggleDocSharing={async (docId, shared) => {
                        await resolvedToggleDocSharing(docId, shared);
                      }}
                      uploading={resolvedUploading}
                      docError={resolvedDocError}
                      clearDocError={resolvedClearDocError}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* Clinical Notes Tab — private doctor-specific notes only */}
          {tab === 'notes' && (
            <div className="space-y-4">
              {/* Patient message to doctor */}
              {patientMessage && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-semibold text-teal-700">Message from Patient</span>
                    <span className="text-[10px] text-teal-500 ml-auto">
                      {format(new Date(patientMessage.sentAt), 'MMM d, yyyy hh:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-teal-800 whitespace-pre-wrap">{patientMessage.content}</p>
                </div>
              )}

              {/* Note editor */}
              {(showNoteEditor || editingNote) && (
                <PatientNoteEditor
                  initialContent={editingNote?.content}
                  initialTags={editingNote?.tags}
                  category="patient"
                  isAnonymous={false}
                  onSave={handleSaveClinicalNote}
                  onCancel={() => { setShowNoteEditor(false); setEditingNote(null); }}
                />
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-700">
                      Clinical Notes
                      <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">{clinicalNotes.length}</span>
                    </h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">
                      <Lock className="w-2.5 h-2.5" /> Private — never shared
                    </span>
                  </div>
                  {!showNoteEditor && !editingNote && (
                    <button
                      onClick={() => setShowNoteEditor(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Note
                    </button>
                  )}
                </div>

                {clinicalNotesLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
                  </div>
                ) : clinicalNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <Stethoscope className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No clinical notes yet</p>
                    <p className="text-xs text-slate-400 mt-1">These are private notes — never shared with the patient</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clinicalNotes.map((note) => (
                      <div key={note.id} className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 group">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {note.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-md text-[10px] font-medium">{tag}</span>
                          ))}
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px] font-medium">
                            <Lock className="w-2 h-2" /> Private
                          </span>
                          <span className="text-[10px] text-slate-400 ml-auto">
                            {format(new Date(note.createdAt), 'MMM d, yyyy hh:mm a')}
                          </span>
                          <button
                            onClick={() => { setEditingNote(note); setShowNoteEditor(false); }}
                            className="p-1 text-slate-400 hover:text-violet-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteClinicalNote(note.id)}
                            disabled={deletingNote === note.id}
                            className="p-1 text-slate-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                          >
                            {deletingNote === note.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Clinical Records Tab — private doctor-specific documents only */}
          {tab === 'documents' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Clinical Records
                  <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">{clinicalDocuments.length}</span>
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">
                  <Lock className="w-2.5 h-2.5" /> Private — never shared
                </span>
              </div>

              {clinicalDocsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                </div>
              ) : (
                <PatientDocumentUploader
                  documents={clinicalDocuments}
                  uploading={clinicalUploading}
                  error={clinicalDocError}
                  onUpload={handleUploadClinicalDocument}
                  onRemove={removeClinicalDocument}
                  onToggleShare={() => Promise.resolve()}
                  onClearError={clearClinicalDocError}
                  hideSharingControls
                />
              )}

              {/* Patient uploads (read-only) */}
              {uploads.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Uploaded by Patient
                    <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">{uploads.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {uploads.map((upload) => (
                      <div key={upload.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{upload.fileName}</p>
                          <p className="text-xs text-slate-400">
                            {formatBytes(upload.fileSizeBytes)}
                            {' — '}
                            {format(new Date(upload.uploadedAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <a
                          href={upload.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-all"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  SessionDetailCard — expandable with inline CRUD         */
/* ───────────────────────────────────────────────────────── */

function SessionDetailCard({
  appointment: apt,
  notes,
  documents: docs,
  isAnonymous,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onToggleNoteSharing,
  onUploadDocument,
  onRemoveDocument,
  onToggleDocSharing,
  uploading,
  docError,
  clearDocError,
}: {
  appointment: Appointment;
  notes: PatientNote[];
  documents: PatientDocument[];
  isAnonymous: boolean;
  onAddNote: (content: string, tags: string[]) => Promise<void>;
  onEditNote: (noteId: string, content: string, tags: string[]) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onToggleNoteSharing: (noteId: string, shared: boolean) => Promise<void>;
  onUploadDocument: (file: File, description?: string) => Promise<void>;
  onRemoveDocument: (doc: PatientDocument) => Promise<void>;
  onToggleDocSharing: (docId: string, shared: boolean) => Promise<void>;
  uploading: boolean;
  docError?: string | null;
  clearDocError?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    if (editingId) {
      await onEditNote(editingId, noteText.trim(), selectedTags);
      setEditingId(null);
    } else {
      await onAddNote(noteText.trim(), selectedTags);
    }
    setNoteText('');
    setSelectedTags([]);
    setShowNoteInput(false);
    setSaving(false);
  };

  const handleStartEdit = (note: PatientNote) => {
    setEditingId(note.id);
    setNoteText(note.content);
    setSelectedTags(note.tags);
    setShowNoteInput(true);
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingId(noteId);
    await onDeleteNote(noteId);
    setDeletingId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUploadDocument(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemoveDoc = async (doc: PatientDocument) => {
    setDeletingDocId(doc.id);
    await onRemoveDocument(doc);
    setDeletingDocId(null);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden transition-all">
      {/* Header — always visible, always clickable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left cursor-pointer hover:bg-slate-100/60 transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          apt.consultationType === 'audio' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {apt.consultationType === 'audio' ? <Phone className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">
              {format(new Date(apt.scheduledAt), 'MMM d, yyyy')}
            </span>
            <span className="text-xs text-slate-400">
              {format(new Date(apt.scheduledAt), 'hh:mm a')}
            </span>
            <span className="font-mono text-[10px] bg-slate-200/70 text-slate-500 px-1.5 py-0.5 rounded select-all">{sessionRefId(apt.id)}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {apt.durationMinutes} min
            </span>
            {apt.rating && (
              <span className="text-xs text-amber-500">★ {apt.rating}</span>
            )}
            {notes.length > 0 && (
              <span className="text-[10px] font-semibold text-violet-600">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
            )}
            {docs.length > 0 && (
              <span className="text-[10px] font-semibold text-teal-600">{docs.length} doc{docs.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold shrink-0 ${APPOINTMENT_STATUS_COLORS[apt.status]}`}>
          {APPOINTMENT_STATUS_LABELS[apt.status]}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-3">
          {/* Notes subsection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-violet-500" />
                <span className="text-[11px] font-semibold text-violet-600 uppercase tracking-wide">Session Notes</span>
              </div>
              {!showNoteInput && (
                <button
                  onClick={() => { setShowNoteInput(true); setEditingId(null); setNoteText(''); setSelectedTags([]); }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-violet-600 hover:bg-violet-50 rounded-md transition-colors"
                >
                  <Plus className="w-3 h-3" /> Write Note
                </button>
              )}
            </div>

            {/* Inline note editor */}
            {showNoteInput && (
              <div className="bg-white border border-violet-200 rounded-lg p-3 mb-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a session note..."
                  className="w-full text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none min-h-[60px]"
                  autoFocus
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {NOTE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    onClick={() => { setShowNoteInput(false); setEditingId(null); setNoteText(''); setSelectedTags([]); }}
                    className="px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    disabled={!noteText.trim() || saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-[11px] font-medium rounded-md hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {editingId ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Notes list */}
            {notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="bg-white border border-slate-100 rounded-lg p-3 group">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {note.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[10px] font-medium">{tag}</span>
                      ))}
                      {note.sharedWithPatient && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-600">
                          <Share2 className="w-2.5 h-2.5" /> Shared
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {format(new Date(note.createdAt), 'MMM d, hh:mm a')}
                      </span>
                      <button
                        onClick={() => onToggleNoteSharing(note.id, !note.sharedWithPatient)}
                        title={note.sharedWithPatient ? 'Shared — click to unshare' : 'Share with patient'}
                        className={`p-1 rounded transition-all ${
                          note.sharedWithPatient
                            ? 'text-emerald-600'
                            : 'text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="p-1 text-slate-400 hover:text-violet-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deletingId === note.id}
                        className="p-1 text-slate-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                      >
                        {deletingId === note.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showNoteInput ? (
              <p className="text-xs text-slate-400 text-center py-2">No notes for this session</p>
            ) : null}
          </div>

          {/* Documents subsection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-3 h-3 text-teal-500" />
                <span className="text-[11px] font-semibold text-teal-600 uppercase tracking-wide">Session Documents</span>
              </div>
              <>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-teal-600 hover:bg-teal-50 rounded-md transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </>
            </div>

            {docError && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-red-50 border border-red-200 rounded-md mb-2">
                <p className="flex-1 text-[10px] text-red-700">{docError}</p>
                {clearDocError && (
                  <button onClick={clearDocError} className="p-0.5 text-red-400 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {docs.length > 0 ? (
              <div className="space-y-1.5">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2.5 p-2 bg-white border border-slate-100 rounded-lg group"
                  >
                    <div className="w-7 h-7 rounded-md bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{doc.fileName}</p>
                      <p className="text-[10px] text-slate-400">{formatBytes(doc.fileSizeBytes)}</p>
                    </div>
                    <button
                      onClick={() => onToggleDocSharing(doc.id, !doc.sharedWithPatient)}
                      title={doc.sharedWithPatient ? 'Shared — click to unshare' : 'Share with patient'}
                      className={`p-1 rounded transition-all ${
                        doc.sharedWithPatient
                          ? 'text-emerald-600'
                          : 'text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-teal-600 rounded transition-all"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => handleRemoveDoc(doc)}
                      disabled={deletingDocId === doc.id}
                      className="p-1 text-slate-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      {deletingDocId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">No documents for this session</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
