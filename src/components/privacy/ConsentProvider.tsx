'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CONSENT_MAX_AGE_DAYS, CONSENT_VERSION, type ConsentState } from '@/config/privacy';

const STORAGE_KEY = 'contraste-consent';

interface ConsentContextValue {
  /** `undefined` mientras se lee el almacenamiento; `null` si todavía no hubo decisión. */
  consent: ConsentState | null | undefined;
  save: (choice: { analytics: boolean; advertising: boolean }) => void;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readStored(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    const ageDays = (Date.now() - new Date(parsed.decidedAt).getTime()) / 86_400_000;
    if (parsed.version !== CONSENT_VERSION || !(ageDays < CONSENT_MAX_AGE_DAYS)) return null;
    return { version: parsed.version, analytics: !!parsed.analytics, advertising: !!parsed.advertising, decidedAt: parsed.decidedAt };
  } catch {
    return null;
  }
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null | undefined>(undefined);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    // Lectura única del almacenamiento local al montar (no existe en el servidor).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readStored());
  }, []);

  const save = useCallback((choice: { analytics: boolean; advertising: boolean }) => {
    const next: ConsentState = { version: CONSENT_VERSION, ...choice, decidedAt: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sin almacenamiento: la decisión vale para esta visita.
    }
    setConsent(next);
    setPreferencesOpen(false);
    window.dispatchEvent(new CustomEvent('contraste:consent', { detail: next }));
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      save,
      preferencesOpen,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
    }),
    [consent, save, preferencesOpen],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent tiene que usarse dentro de <ConsentProvider>.');
  return ctx;
}
