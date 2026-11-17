import { useEffect, useRef } from 'react';

// Slide-in side panel. Focus moves to the close button on open and is restored on close.
export default function Drawer({ id, open, title, closeLabel, onClose, footer, children }) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose; // always call the latest handler without re-running the effect

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  return (
    <aside id={id} className={`drawer${open ? ' open' : ''}`} aria-label={title} aria-hidden={!open}>
      <div className="drawer-head">
        <h2>{title}</h2>
        <button type="button" ref={closeRef} className="icon-btn" aria-label={closeLabel} onClick={onClose}>&times;</button>
      </div>
      {children}
      <div className="drawer-foot">{footer}</div>
    </aside>
  );
}
