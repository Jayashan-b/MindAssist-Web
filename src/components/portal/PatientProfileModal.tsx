'use client';

import React, { useState } from 'react';
import { X, Calendar, Star, FileText, FolderOpen, Clock, Video, Phone, Plus, Pencil, Trash2, Loader2, ShieldQuestion, Share2, Download, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { PatientProfile, PatientNote, Appointment } from '@/lib/types';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '@/lib/types';
import { usePatientNotes } from '@/lib/hooks/usePatientNotes';
import { usePatientDocuments } from '@/lib/hooks/usePatientDocuments';
import { usePatientUploads } from '@/lib/hooks/usePatientUploads';
import { usePatientMessage } from '@/lib/hooks/usePatientMessage';
import PatientAvatar from './PatientAvatar';
import PatientNoteEditor from './PatientNoteEditor';
import PatientDocumentUploader from './PatientDocumentUploader';

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

  // For anonymous patients, use profileKey (anon:{appointmentId}) to isolate notes/docs per session
  const notesKey = patient.isAnonymous ? patient.profileKey : patient.userId;
  const { notes, loading: notesLoading, addNote, editNote, removeNote, toggleSharing: toggleNoteSharing } = usePatientNotes(specialistId, notesKey);
  const { documents, loading: docsLoading, uploading, uploadDocument, removeDocument, toggleSharing: toggleDocSharing } = usePatientDocuments(specialistId, notesKey);
  const { uploads } = usePatientUploads(specialistId, patient.isAnonymous ? undefined : patient.userId);
  const { message: patientMessage } = usePatientMessage(specialistId, patient.isAnonymous ? undefined : patient.userId);

  if (!open) return null;

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Star },
    { key: 'sessions', label: 'Sessions', icon: Calendar },
    { key: 'notes', label: 'Notes', icon: FileText },
    { key: 'documents', label: 'Documents', icon: FolderOpen },
  ];

  const handleSaveNote = async (content: string, tags: string[], appointmentId: string | null) => {
    if (editingNote) {
      await editNote(editingNote.id, content, tags);
      setEditingNote(null);
    } else {
      await addNote(content, tags, appointmentId ?? undefined);
    }
    setShowNoteEditor(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNote(noteId);
    await removeNote(noteId);
    setDeletingNote(null);
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
                {t.key === 'notes' && notes.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-violet-200 text-violet-700 rounded text-[10px] font-bold">{notes.length}</span>
                )}
                {t.key === 'documents' && documents.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-violet-200 text-violet-700 rounded text-[10px] font-bold">{documents.length}</span>
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

              {/* Quick notes preview */}
              {notes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent Notes</h3>
                  <div className="space-y-2">
                    {notes.slice(0, 3).map((note) => (
                      <div key={note.id} className="bg-white border border-slate-100 rounded-lg p-3">
                        <p className="text-sm text-slate-700 line-clamp-2">{note.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
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
                  {notes.length > 3 && (
                    <button onClick={() => setTab('notes')} className="text-xs text-violet-600 font-medium mt-2 hover:text-violet-700">
                      View all {notes.length} notes
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sessions Tab */}
          {tab === 'sessions' && (
            <div className="space-y-2">
              {patient.appointments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No sessions found</p>
              ) : (
                patient.appointments.map((apt: Appointment) => (
                  <div key={apt.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
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
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {apt.durationMinutes} min
                        </span>
                        {apt.rating && (
                          <span className="text-xs text-amber-500">★ {apt.rating}</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${APPOINTMENT_STATUS_COLORS[apt.status]}`}>
                      {APPOINTMENT_STATUS_LABELS[apt.status]}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Notes Tab */}
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

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  {notes.length} Note{notes.length !== 1 ? 's' : ''}
                </h3>
                {!showNoteEditor && !editingNote && (
                  <button
                    onClick={() => setShowNoteEditor(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Note
                  </button>
                )}
              </div>

              {(showNoteEditor || editingNote) && (
                <PatientNoteEditor
                  initialContent={editingNote?.content}
                  initialTags={editingNote?.tags}
                  appointmentId={editingNote?.appointmentId}
                  onSave={handleSaveNote}
                  onCancel={() => { setShowNoteEditor(false); setEditingNote(null); }}
                />
              )}

              {notesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                </div>
              ) : notes.length === 0 && !showNoteEditor ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No notes yet</p>
                  <p className="text-xs text-slate-400">Add clinical notes about this patient</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-white border border-slate-100 rounded-xl p-4 group">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {note.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-md text-[10px] font-medium">{tag}</span>
                        ))}
                        <span className="text-[10px] text-slate-400 ml-auto">
                          {format(new Date(note.createdAt), 'MMM d, yyyy hh:mm a')}
                        </span>
                        <button
                          onClick={() => toggleNoteSharing(note.id, !note.sharedWithPatient)}
                          title={note.sharedWithPatient ? 'Shared with patient — click to unshare' : 'Share with patient'}
                          className={`p-1 rounded transition-all ${
                            note.sharedWithPatient
                              ? 'text-emerald-600'
                              : 'text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Share2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => { setEditingNote(note); setShowNoteEditor(false); }}
                          className="p-1 text-slate-400 hover:text-violet-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={deletingNote === note.id}
                          className="p-1 text-slate-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                        >
                          {deletingNote === note.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {tab === 'documents' && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                {documents.length} Document{documents.length !== 1 ? 's' : ''}
              </h3>
              {docsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                </div>
              ) : (
                <PatientDocumentUploader
                  documents={documents}
                  uploading={uploading}
                  onUpload={uploadDocument}
                  onRemove={removeDocument}
                  onToggleShare={(doc, shared) => toggleDocSharing(doc.id, shared)}
                />
              )}

              {/* Patient uploads (read-only) */}
              {uploads.length > 0 && (
                <div className="mt-6">
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
                            {upload.fileSizeBytes < 1024
                              ? `${upload.fileSizeBytes} B`
                              : upload.fileSizeBytes < 1048576
                              ? `${(upload.fileSizeBytes / 1024).toFixed(1)} KB`
                              : `${(upload.fileSizeBytes / 1048576).toFixed(1)} MB`}
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
