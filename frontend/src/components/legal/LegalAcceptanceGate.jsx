import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import apiClient, { removeAuthToken } from '@/services/client';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Existing-user legal gate. The backend remains authoritative for versions and acceptance. */
export const LegalAcceptanceGate = () => {
  const [open, setOpen] = useState(false);
  const [legal, setLegal] = useState({ terms: false, privacy: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const acceptedRef = useRef(false);
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    const onRequired = () => {
      if (!acceptedRef.current) setOpen(true);
    };
    window.addEventListener('tickflow:legal-acceptance-required', onRequired);
    if (window.__tickflowLegalAcceptanceRequired) onRequired();
    return () => window.removeEventListener('tickflow:legal-acceptance-required', onRequired);
  }, []);

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement;
      headingRef.current?.focus();
      return undefined;
    }
    returnFocusRef.current?.focus?.();
    return undefined;
  }, [open]);

  const handleChange = useCallback((event) => {
    const { name, checked } = event.target;
    setLegal((previous) => ({ ...previous, [name]: checked }));
    setError('');
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setError('You must accept both documents to continue. Use Log out if you do not accept.');
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
    if (!items.length) return;
    if (event.shiftKey && document.activeElement === items[0]) {
      event.preventDefault();
      items[items.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
      event.preventDefault();
      items[0].focus();
    }
  }, []);

  const handleAccept = async (event) => {
    event.preventDefault();
    if (submitting || acceptedRef.current) return;
    if (!legal.terms || !legal.privacy) {
      setError('Both boxes must be ticked to continue.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/auth/legal/', { accept_terms: true, acknowledge_privacy_notice: true });
      acceptedRef.current = true;
      window.__tickflowLegalAcceptanceRequired = false;
      setOpen(false);
      window.location.reload();
    } catch (requestError) {
      setError(requestError?.message || 'We could not record your acceptance. Please try again.');
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    window.location.assign('/login');
  };

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="legal-gate-title" onKeyDown={handleKeyDown} className="w-full max-w-md rounded-lg border border-gray-800 bg-black p-6 text-gray-300">
        <h2 id="legal-gate-title" ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-white focus:outline-none">Review and accept the current legal documents</h2>
        <p className="mt-2 text-sm text-gray-400">Please review both documents before continuing to your account.</p>
        <form onSubmit={handleAccept} className="mt-4 space-y-3 text-sm">
          <label htmlFor="gate-accept-terms" className="flex items-start gap-3 cursor-pointer">
            <input id="gate-accept-terms" name="terms" type="checkbox" checked={legal.terms} onChange={handleChange} className="mt-1 h-4 w-4 rounded border-gray-600 bg-black accent-white" />
            <span>I accept the <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-gray-200 underline hover:text-white">Terms of Service</Link></span>
          </label>
          <label htmlFor="gate-acknowledge-privacy" className="flex items-start gap-3 cursor-pointer">
            <input id="gate-acknowledge-privacy" name="privacy" type="checkbox" checked={legal.privacy} onChange={handleChange} className="mt-1 h-4 w-4 rounded border-gray-600 bg-black accent-white" />
            <span>I acknowledge the <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-gray-200 underline hover:text-white">Privacy Policy</Link></span>
          </label>
          {error && <p role="alert" className="text-red-400">{error}</p>}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
            <button type="button" onClick={handleLogout} className="min-h-[44px] rounded px-3 text-gray-400 hover:text-white">Log out</button>
            <button type="submit" disabled={submitting || !legal.terms || !legal.privacy} className="min-h-[44px] rounded bg-white px-4 font-medium text-black hover:bg-gray-200 disabled:opacity-60">{submitting ? 'Saving…' : 'Continue'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default LegalAcceptanceGate;
