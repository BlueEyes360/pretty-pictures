import { useEffect, useRef } from 'react';

export default function Modal({ title, titleId, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  const close = event => { event.currentTarget.closest('dialog').close(); onClose(); };
  return (
    <dialog ref={ref} className={wide ? 'wide-dialog' : undefined} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(event); }}>
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button type="button" aria-label={`Close ${title}`} className="close-button" onClick={close}>×</button>
      </div>
      {typeof children === 'function' ? children(close) : children}
    </dialog>
  );
}
