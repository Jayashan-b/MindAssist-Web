'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from '../auth';
import { getSpecialistByAuthUid, watchSpecialist } from '../firestore';
import type { Specialist } from '../types';

interface AuthState {
  user: User | null;
  specialist: Specialist | null;
  loading: boolean;
  isRegistered: boolean;
  refreshSpecialist: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  specialist: null,
  loading: true,
  isRegistered: false,
  refreshSpecialist: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSpecialist = useCallback(async () => {
    if (!user) return;
    const spec = await getSpecialistByAuthUid(user.uid);
    setSpecialist(spec);
    setSpecialistId(spec?.id ?? null);
  }, [user]);

  // Track specialist ID for real-time listener
  const [specialistId, setSpecialistId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const spec = await getSpecialistByAuthUid(firebaseUser.uid);
        setSpecialist(spec);
        setSpecialistId(spec?.id ?? null);
      } else {
        setSpecialist(null);
        setSpecialistId(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-time listener for specialist doc changes (slots, profile updates)
  useEffect(() => {
    if (!specialistId) return;
    const unsubscribe = watchSpecialist(specialistId, (spec) => {
      setSpecialist(spec);
    });
    return unsubscribe;
  }, [specialistId]);

  return (
    <AuthContext.Provider
      value={{
        user,
        specialist,
        loading,
        isRegistered: specialist !== null,
        refreshSpecialist,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
