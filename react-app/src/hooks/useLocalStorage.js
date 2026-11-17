import { useEffect, useState } from 'react';

// useState that persists to localStorage. `sanitize` cleans whatever was stored.
export function useLocalStorage(key, initial, sanitize = (v) => v) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? sanitize(JSON.parse(raw)) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }, [key, value]);

  return [value, setValue];
}
