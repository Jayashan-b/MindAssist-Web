'use client';

import React, { useState } from 'react';
import {
  FileText,
  FolderOpen,
  Clock as ClockIcon,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Share2,
  Download,
  Video,
  Phone,
  ShieldQuestion,
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Appointment, PatientNote, PatientDocument as PatientDocType } from '@/lib/types';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '@/lib/types';
import { usePatientNotes } from '@/lib/hooks/usePatientNotes';
import { usePatientDocuments } from '@/lib/hooks/usePatientDocuments';
import { usePatientUploads } from '@/lib/hooks/usePatientUploads';
import PatientNoteEditor from './PatientNoteEditor';
import PatientDocumentUploader from './PatientDocumentUploader';

type WorkspaceTab = 'notes' | 'documents' | 'history';

interface ConsultationWorkspaceProps {
  specialistId: string;
  patientKey: string;
  userId: string;
  appointmentId: string;
  appointments: Appointment[];
  isAnonymous: boolean;
  defaultTab?: WorkspaceTab;
}

export default function ConsultationWorkspace({
  specialistId,
  patientKey,
  userId,
  appointmentId,
  appointments,
  isAnonymous,
  defaultTab = 'notes',
}: ConsultationWorkspaceProps) {
  const [tab, setTab] = useState<WorkspaceTab>(defaultTab);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<PatientNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);

  const { notes, loading: notesLoading, addNote, editNote, removeNote, toggleSharing: toggleNoteSharing } = usePatientNotes(specialistId, patientKey);
  const { documents, loading: docsLoading, uploading, error: docError, clearError: clearDocError, uploadDocument, removeDocument, toggleSharing: toggleDocSharing } = usePatientDocuments(specialistId, patientKey);
  const { uploads } = usePatientUploads(specialistId, isAnonymous ? undefined : userId);

  // Filter patient history — other appointments with this patient (empty for anonymous)
  const patientHistory = isAnonymous ? [] : appointments
    .filter((a) => a.userId === userId && a.id !== appointmentId
      && (a.status === 'completed' || a.status === 'rated' || a.status === 'inProgress'))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  // Notes for a specific session
  const notesForSession = (aptId: string) => notes.filter((n) => n.appointmentId === aptId);

  const handleSaveNote = async (content: string, tags: string[], noteAppointmentId: string | null) => {
    if (editingNote) {
      await editNote(editingNote.id, content, tags);
      setEditingNote(null);
    } else {
      // Auto-link to current appointment
      await addNote(content, tags, noteAppointmentId ?? appointmentId);
    }
    setShowNoteEditor(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNote(noteId);
    await removeNote(noteId);
    setDeletingNote(null);
  };

  const tabs: { key: WorkspaceTab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'notes', label: 'Notes', icon: FileText, count: notes.length },
    { key: 'documents', label: 'Documents', icon: FolderOpen, count: documents.length + uploads.length },
    { key: 'history', label: 'History', icon: History, count: patientHistory.length },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Tab Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-1">
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
            {(t.count ?? 0) > 0 && (
              <span className="px-1.5 py-0.5 bg-violet-200 text-violet-700 rounded text-[10px] font-bold">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Notes Tab */}
        {tab === 'notes' && (
          <div className="space-y-4">
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
                appointmentId={editingNote?.appointmentId ?? appointmentId}
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
                <p className="text-xs text-slate-400">Add clinical notes during or after the session</p>
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
                error={docError}
                onUpload={uploadDocument}
                onRemove={removeDocument}
                onToggleShare={(doc, shared) => toggleDocSharing(doc.id, shared)}
                onClearError={clearDocError}
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

        {/* History Tab */}
        {tab === 'history' && (
          <div className="space-y-3">
            {isAnonymous && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <ShieldQuestion className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">Anonymous session — history limited to this session only</p>
              </div>
            )}

            {patientHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No previous sessions</p>
                <p className="text-xs text-slate-400">
                  {isAnonymous ? 'Anonymous sessions do not show cross-session history' : 'This is the first session with this patient'}
                </p>
              </div>
            ) : (
              patientHistory.map((apt) => {
                const sessionNotes = notesForSession(apt.id);
                return (
                  <HistorySessionCard key={apt.id} appointment={apt} notes={sessionNotes} />
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- History Session Card (expandable) ---

function HistorySessionCard({ appointment, notes }: { appointment: Appointment; notes: PatientNote[] }) {
  const [expanded, setExpanded] = useState(false);
  const scheduledDate = new Date(appointment.scheduledAt);
  const isAudio = appointment.consultationType === 'audio';

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-100/50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isAudio ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {isAudio ? <Phone className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">
              {format(scheduledDate, 'MMM d, yyyy')}
            </span>
            <span className="text-xs text-slate-400">
              {format(scheduledDate, 'hh:mm a')}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <ClockIcon className="w-3 h-3" />
              {appointment.durationMinutes} min
            </span>
            {appointment.rating && (
              <span className="text-xs text-amber-500">★ {appointment.rating}</span>
            )}
            {notes.length > 0 && (
              <span className="text-xs text-violet-500">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${APPOINTMENT_STATUS_COLORS[appointment.status]}`}>
          {APPOINTMENT_STATUS_LABELS[appointment.status]}
        </span>
      </button>

      {expanded && notes.length > 0 && (
        <div className="px-3 pb-3 space-y-2">
          <div className="border-t border-slate-200 pt-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5">Session Notes</p>
            {notes.map((note) => (
              <div key={note.id} className="bg-white rounded-lg p-2.5 mb-1.5 border border-slate-100">
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {note.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[10px] font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
