import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'clientkhata-settings';

const DEFAULT_SETTINGS = {
  /** Days; jobs paid longer ago are hidden from the Paid column. 0 = show all. */
  paidColumnCutoffDays: 30,
};

const SettingsContext = createContext(null);

function loadSettings() {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      paidColumnCutoffDays: typeof parsed.paidColumnCutoffDays === 'number' ? parsed.paidColumnCutoffDays : DEFAULT_SETTINGS.paidColumnCutoffDays,
    };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(loadSettings);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

  const setPaidColumnCutoffDays = (days) => {
    setSettingsState((prev) => ({ ...prev, paidColumnCutoffDays: Number(days) }));
  };

  return (
    <SettingsContext.Provider value={{ settings, setPaidColumnCutoffDays }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
