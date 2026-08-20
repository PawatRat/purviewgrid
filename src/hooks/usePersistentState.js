import { useState, useEffect } from 'react';

/**
 * useState that transparently syncs to localStorage.
 * Reads the initial value from storage and persists every change.
 */
export function usePersistentState(storageKey, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Corrupted storage — fall through to the fallback value
    }
    return fallback;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to persist "${storageKey}"`, e);
    }
  }, [storageKey, value]);

  return [value, setValue];
}
