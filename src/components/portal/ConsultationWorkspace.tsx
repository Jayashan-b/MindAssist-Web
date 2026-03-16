'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Stethoscope,
  Lock,
  Hash,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Appointment, PatientNote, PatientDocument as PatientDocType, NoteCategory } from '@/lib/types';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '@/lib/types';
import { usePatientNotes } from '@/lib/hooks/usePatientNotes';
import { usePatientDocuments } from '@/lib/hooks/usePatientDocuments';
import { usePatientUploads } from '@/lib/hooks/usePatientUploads';
import { sessionRefId } from '@/lib/utils/referenceIds';
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
  const [noteCategory, setNoteCategory] = useState<NoteCategory>('session');

  // Session notes for this appointment — always use real userId, filter by appointmentId
  const {
    notes: sessionNotes,
    loading: sessionNotesLoading,
    addNote,
    editNote,
    removeNote,
    toggleSharing: toggleNoteSharing,
  } = usePatientNotes(specialistId, userId, { category: 'session', appointmentId });

  // Clinical notes (patient-level, private) — enabled for ALL patients including anonymous
  const {
    notes: clinicalNotes,
    loading: clinicalNotesLoading,
    addNote: addClinicalNote,
    editNote: editClinicalNote,
    removeNote: removeClinicalNote,
  } = usePatientNotes(specialistId, userId, { category: 'patient' });

  // Session documents — real userId + appointmentId filter
  const {
    documents: sessionDocuments,
    loading: docsLoading,
    uploading,
    error: docError,
    clearError: clearDocError,
    uploadDocument,
    removeDocument,
    toggleSharing: toggleDocSharing,
  } = usePatientDocuments(specialistId, userId, { category: 'session', appointmentId });

  // Clinical documents (patient-level, private) — enabled for ALL patients including anonymous
  const {
    documents: clinicalDocuments,
    loading: clinicalDocsLoading,
    uploading: clinicalUploading,
    error: clinicalDocError,
    clearError: clearClinicalDocError,
    uploadDocument: uploadClinicalDocument,
    removeDocument: removeClinicalDocument,
  } = usePatientDocuments(specialistId, userId, { category: 'patient' });

  // All session notes/docs for this patient (unfiltered by appointmentId — used by History tab)
  const { notes: allSessionNotes } = usePatientNotes(specialistId, userId, { category: 'session' });
  const { documents: allSessionDocs } = usePatientDocuments(specialistId, userId, { category: 'session' });

  const { uploads } = usePatientUploads(specialistId, userId);

  // Combined note counts for tab badge
  const allNotesCount = sessionNotes.length + clinicalNotes.length;

  // Filter patient history — other appointments with this patient
  const patientHistory = appointments
    .filter((a) => a.userId === userId && a.id !== appointmentId
      && (a.status === 'completed' || a.status === 'rated' || a.status === 'inProgress'))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const handleSaveNote = async (content: string, tags: string[], noteAppointmentId: string | null, category: NoteCategory) => {
    if (editingNote) {
      // Editing uses the original note's context
      if (editingNote.category === 'patient') {
        await editClinicalNote(editingNote.id, content, tags);
      } else {
        await editNote(editingNote.id, content, tags);
      }
      setEditingNote(null);
    } else if (category === 'patient') {
      await addClinicalNote(content, tags, undefined, 'patient');
    } else {
      // Session note — auto-link to current appointment
      await addNote(content, tags, noteAppointmentId ?? appointmentId, 'session');
    }
    setShowNoteEditor(false);
    setNoteCategory('session');
  };

  const handleDeleteNote = async (noteId: string, category: NoteCategory) => {
    setDeletingNote(noteId);
    if (category === 'patient') {
      await removeClinicalNote(noteId);
    } else {
      await removeNote(noteId);
    }
    setDeletingNote(null);
  };

  const handleUploadDocument = async (file: File, description?: string) => {
    await uploadDocument(file, description, appointmentId, 'session');
  };

  const handleUploadClinicalDocument = async (file: File, description?: string) => {
    await uploadClinicalDocument(file, description, undefined, 'patient');
  };

  const tabs: { key: WorkspaceTab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'notes', label: 'Notes', icon: FileText, count: allNotesCount },
    { key: 'documents', label: 'Documents', icon: FolderOpen, count: sessionDocuments.length + clinicalDocuments.length + uploads.length },
    { key: 'history', label: 'History', icon: History, count: patientHistory.length },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[calc(100vh-180px)]">
      {/* Tab Header — underline style */}
      <div className="px-5 pt-3 pb-0 border-b border-slate-100 flex items-center gap-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-1.5 px-1 pb-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-violet-700'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {(t.count ?? 0) > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tab === t.key
                  ? 'bg-violet-100 text-violet-600'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {t.count}
              </span>
            )}
            {tab === t.key && (
              <motion.div
                layoutId="workspace-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Notes Tab */}
        {tab === 'notes' && (
          <div className="space-y-4">
            {/* Session Notes Section */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Session Notes
                <span className="ml-1.5 px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full text-[10px] font-bold normal-case">{sessionNotes.length}</span>
              </h3>
              {!showNoteEditor && !editingNote && (
                <button
                  onClick={() => { setNoteCategory('session'); setShowNoteEditor(true); }}
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
                category={editingNote?.category ?? noteCategory}
                isAnonymous={isAnonymous}
                onSave={handleSaveNote}
                onCancel={() => { setShowNoteEditor(false); setEditingNote(null); setNoteCategory('session'); }}
              />
            )}

            {sessionNotesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
            ) : sessionNotes.length === 0 && !showNoteEditor ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No session notes yet</p>
                <p className="text-xs text-slate-400 mt-0.5">Add notes during or after the session</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessionNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    deletingNote={deletingNote}
                    onToggleSharing={toggleNoteSharing}
                    onEdit={(n) => { setEditingNote(n); setShowNoteEditor(false); }}
                    onDelete={(id) => handleDeleteNote(id, 'session')}
                    showShareToggle
                  />
                ))}
              </div>
            )}

            {/* Clinical Notes Section */}
            <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Clinical Notes
                      <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full text-[10px] font-bold normal-case">{clinicalNotes.length}</span>
                    </h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  </div>
                  {!showNoteEditor && !editingNote && (
                    <button
                      onClick={() => { setNoteCategory('patient'); setShowNoteEditor(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Clinical Note
                    </button>
                  )}
                </div>

                {clinicalNotesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
                  </div>
                ) : clinicalNotes.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                    <Stethoscope className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">
                      No clinical notes. These are private notes about this patient — never shared.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clinicalNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        deletingNote={deletingNote}
                        onEdit={(n) => { setEditingNote(n); setShowNoteEditor(false); }}
                        onDelete={(id) => handleDeleteNote(id, 'patient')}
                        showShareToggle={false}
                        isClinical
                      />
                    ))}
                  </div>
                )}
              </div>
          </div>
        )}

        {/* Documents Tab */}
        {tab === 'documents' && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Session Documents
              <span className="ml-1.5 px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full text-[10px] font-bold normal-case">{sessionDocuments.length}</span>
            </h3>
            {docsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
            ) : (
              <PatientDocumentUploader
                documents={sessionDocuments}
                uploading={uploading}
                error={docError}
                onUpload={handleUploadDocument}
                onRemove={removeDocument}
                onToggleShare={(doc, shared) => toggleDocSharing(doc.id, shared)}
                onClearError={clearDocError}
              />
            )}

            {/* Clinical Documents Section */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Clinical Records
                  <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full text-[10px] font-bold normal-case">{clinicalDocuments.length}</span>
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">
                  <Lock className="w-2.5 h-2.5" /> Private
                </span>
              </div>
              {clinicalDocsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
                </div>
              ) : (
                <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3">
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
                </div>
              )}
            </div>

            {/* Patient uploads (read-only) */}
            {uploads.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Uploaded by Patient
                  <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full text-[10px] font-bold normal-case">{uploads.length}</span>
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
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No previous sessions</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAnonymous ? 'Anonymous sessions do not show cross-session history' : 'This is the first session with this patient'}
                </p>
              </div>
            ) : (
              patientHistory.map((apt) => {
                const notesForApt = allSessionNotes.filter((n) => n.appointmentId === apt.id);
                const docsForApt = allSessionDocs.filter((d) => d.appointmentId === apt.id);
                return (
                  <HistorySessionCard key={apt.id} appointment={apt} notes={notesForApt} documents={docsForApt} />
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Note Card ---

function NoteCard({
  note,
  deletingNote,
  onToggleSharing,
  onEdit,
  onDelete,
  showShareToggle,
  isClinical = false,
}: {
  note: PatientNote;
  deletingNote: string | null;
  onToggleSharing?: (noteId: string, shared: boolean) => Promise<void>;
  onEdit: (note: PatientNote) => void;
  onDelete: (noteId: string) => void;
  showShareToggle: boolean;
  isClinical?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 group transition-shadow duration-200 hover:shadow-sm ${isClinical ? 'bg-amber-50/50 border border-amber-100 border-l-2 border-l-amber-300' : 'bg-white border border-slate-100 border-l-2 border-l-violet-300'}`}>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
      <div className="flex items-center gap-2 mt-2">
        {note.tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-md text-[10px] font-medium">{tag}</span>
        ))}
        {isClinical && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px] font-medium">
            <Lock className="w-2 h-2" /> Private
          </span>
        )}
        <span className="text-[10px] text-slate-400 ml-auto">
          {format(new Date(note.createdAt), 'MMM d, yyyy hh:mm a')}
        </span>
        {showShareToggle && onToggleSharing && (
          <button
            onClick={() => onToggleSharing(note.id, !note.sharedWithPatient)}
            title={note.sharedWithPatient ? 'Shared with patient — click to unshare' : 'Share with patient'}
            className={`p-1 rounded transition-all ${
              note.sharedWithPatient
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100'
            }`}
          >
            <Share2 className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={() => onEdit(note)}
          className="p-1 text-slate-400 hover:text-violet-600 rounded opacity-0 group-hover:opacity-100 transition-all"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDelete(note.id)}
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
  );
}

// --- History Session Card (expandable) ---

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function HistorySessionCard({ appointment, notes, documents }: { appointment: Appointment; notes: PatientNote[]; documents: PatientDocType[] }) {
  const [expanded, setExpanded] = useState(false);
  const scheduledDate = new Date(appointment.scheduledAt);
  const isAudio = appointment.consultationType === 'audio';
  const hasContent = notes.length > 0 || documents.length > 0;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden hover:shadow-sm transition-shadow duration-200">
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
            <span className="font-mono text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded select-all">
              {sessionRefId(appointment.id)}
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
            {documents.length > 0 && (
              <span className="text-xs text-teal-500">{documents.length} doc{documents.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${APPOINTMENT_STATUS_COLORS[appointment.status]}`}>
          {APPOINTMENT_STATUS_LABELS[appointment.status]}
        </span>
      </button>

      {expanded && hasContent && (
        <div className="px-3 pb-3 space-y-2">
          {notes.length > 0 && (
            <div className="border-t border-slate-200 pt-2">
              <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Notes
              </p>
              {notes.map((note) => (
                <div key={note.id} className="bg-white rounded-lg p-2.5 mb-1.5 border border-slate-100">
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {note.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[10px] font-medium">{tag}</span>
                    ))}
                    {note.sharedWithPatient && <Share2 className="w-2.5 h-2.5 text-emerald-500" />}
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {format(new Date(note.createdAt), 'MMM d, hh:mm a')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {documents.length > 0 && (
            <div className={`${notes.length > 0 ? '' : 'border-t border-slate-200'} pt-2`}>
              <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <FolderOpen className="w-3 h-3" /> Documents
              </p>
              {documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 bg-white rounded-lg p-2.5 mb-1.5 border border-slate-100 hover:border-teal-200 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{doc.fileName}</p>
                    <p className="text-[10px] text-slate-400">{formatBytes(doc.fileSizeBytes)}</p>
                  </div>
                  <Download className="w-3 h-3 text-slate-400" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
