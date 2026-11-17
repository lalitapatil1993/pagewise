import { useEffect, useRef } from 'react';

// Wrapper around the native <dialog>. Content is only rendered while `open`,
// so any state inside children resets every time the dialog is reopened.
export default function Modal({ open, onClose, labelledBy, id, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dlg = ref.current;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      id={id}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}
    >
      {open && (
        <>
          <button type="button" className="icon-btn dlg-close" aria-label="Close" onClick={() => ref.current.close()}>&times;</button>
          {children}
        </>
      )}
    </dialog>
  );
}
