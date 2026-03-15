'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileText, Trash2, Loader2, Download, Share2, X, Lock } from 'lucide-react';
import type { PatientDocument } from '@/lib/types';

interface PatientDocumentUploaderProps {
  documents: PatientDocument[];
  uploading: boolean;
  error?: string | null;
  onUpload: (file: File, description?: string) => Promise<void>;
  onRemove: (doc: PatientDocument) => Promise<void>;
  onToggleShare: (doc: PatientDocument, shared: boolean) => Promise<void>;
  onClearError?: () => void;
  /** Hides share toggle on doc rows; shows "Private" badge instead (for clinical docs) */
  hideSharingControls?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function PatientDocumentUploader({
  documents,
  uploading,
  error,
  onUpload,
  onRemove,
  onToggleShare,
  onClearError,
  hideSharingControls,
}: PatientDocumentUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUpload(file, description || undefined);
    setDescription('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemove = async (doc: PatientDocument) => {
    setDeleting(doc.id);
    try {
      await onRemove(doc);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className={`border-2 border-dashed border-slate-200 rounded-xl p-6 text-center transition-colors ${hideSharingControls ? 'hover:border-amber-300' : 'hover:border-violet-300'}`}>
        <input
          ref={fileRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx"
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-slate-300" />
          )}
          <p className="text-sm text-slate-500">
            {uploading ? 'Uploading...' : 'Drop a file here or'}
          </p>
          {!uploading && (
            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
            >
              Choose File
            </button>
          )}
        </div>
        <div className="mt-3">
          <input
            type="text"
            placeholder="Optional description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full max-w-xs mx-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-violet-500/30 outline-none"
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="flex-1 text-xs text-red-700">{error}</p>
          {onClearError && (
            <button onClick={onClearError} className="p-0.5 text-red-400 hover:text-red-600 rounded transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${hideSharingControls ? 'bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-600'}`}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName}</p>
                <p className="text-xs text-slate-400">
                  {formatBytes(doc.fileSizeBytes)}
                  {doc.description && ` — ${doc.description}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {hideSharingControls ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-[10px] font-medium">
                    <Lock className="w-2.5 h-2.5" /> Private
                  </span>
                ) : (
                  <button
                    onClick={() => onToggleShare(doc, !doc.sharedWithPatient)}
                    title={doc.sharedWithPatient ? 'Shared with patient — click to unshare' : 'Share with patient'}
                    className={`p-1.5 rounded-md transition-all ${
                      doc.sharedWithPatient
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleRemove(doc)}
                  disabled={deleting === doc.id}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                >
                  {deleting === doc.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
