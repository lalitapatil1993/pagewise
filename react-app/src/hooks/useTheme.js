import { useState } from 'react';

// The initial theme is applied before first paint by a script in index.html.
export function useTheme() {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('pagewise-theme', next); } catch { /* storage unavailable */ }
  };

  return [theme, toggle];
}
