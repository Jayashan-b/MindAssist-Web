'use client';

import React, { useState } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { NOTE_TAGS } from '@/lib/types';

interface PatientNoteEditorProps {
  initialContent?: string;
  initialTags?: string[];
  appointmentId?: string | null;
  onSave: (content: string, tags: string[], appointmentId: string | null) => Promise<void>;
  onCancel: () => void;
}

export default function PatientNoteEditor({
  initialContent = '',
  initialTags = [],
  appointmentId = null,
  onSave,
  onCancel,
}: PatientNoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave(content.trim(), tags, appointmentId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a clinical note..."
        rows={4}
        className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none transition-all resize-none"
        autoFocus
      />

      {/* Tags */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-1.5">Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {NOTE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                tags.includes(tag)
                  ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!content.trim() || saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Note
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}
