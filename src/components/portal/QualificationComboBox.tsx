'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Plus } from 'lucide-react';
import { COMMON_QUALIFICATIONS } from '@/lib/types';

interface QualificationComboBoxProps {
  value: string[];
  onChange: (qualifications: string[]) => void;
}

export default function QualificationComboBox({ value, onChange }: QualificationComboBoxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = COMMON_QUALIFICATIONS.filter(
    (q) =>
      q.toLowerCase().includes(query.toLowerCase()) &&
      !value.includes(q),
  );

  const addQualification = (qual: string) => {
    const trimmed = qual.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeQualification = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        addQualification(filtered[0]);
      } else if (query.trim()) {
        addQualification(query);
      }
    }
    if (e.key === 'Backspace' && !query && value.length > 0) {
      removeQualification(value.length - 1);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showCustomAdd = query.trim() &&
    !COMMON_QUALIFICATIONS.some((q) => q.toLowerCase() === query.toLowerCase()) &&
    !value.includes(query.trim());

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Qualifications
      </label>

      {/* Selected chips */}
      <div
        className="flex flex-wrap gap-1.5 p-2.5 min-h-[46px] bg-slate-50/80 border border-slate-200 rounded-xl cursor-text focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-violet-400 transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((qual, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-medium"
          >
            {qual}
            <button
              onClick={(e) => { e.stopPropagation(); removeQualification(i); }}
              className="hover:text-violet-900 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          placeholder={value.length === 0 ? 'Search or type a qualification...' : 'Add more...'}
        />

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors self-center"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (filtered.length > 0 || showCustomAdd) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((qual) => (
            <button
              key={qual}
              type="button"
              onClick={() => addQualification(qual)}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {qual}
            </button>
          ))}
          {showCustomAdd && (
            <button
              type="button"
              onClick={() => addQualification(query)}
              className="w-full text-left px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-2 border-t border-slate-100"
            >
              <Plus className="w-3.5 h-3.5" />
              Add &quot;{query.trim()}&quot;
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-1">
        Select from common qualifications or type a custom one
      </p>
    </div>
  );
}
