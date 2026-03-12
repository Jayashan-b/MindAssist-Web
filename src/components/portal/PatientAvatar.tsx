'use client';

import React from 'react';
import { ShieldQuestion } from 'lucide-react';

interface PatientAvatarProps {
  name: string | null;
  isAnonymous: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
};

export default function PatientAvatar({ name, isAnonymous, size = 'md' }: PatientAvatarProps) {
  if (isAnonymous) {
    return (
      <div className={`${sizeClasses[size]} rounded-xl bg-slate-100 flex items-center justify-center text-slate-400`}>
        <ShieldQuestion className={iconSizes[size]} />
      </div>
    );
  }

  const initial = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className={`${sizeClasses[size]} rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold`}>
      {initial}
    </div>
  );
}
