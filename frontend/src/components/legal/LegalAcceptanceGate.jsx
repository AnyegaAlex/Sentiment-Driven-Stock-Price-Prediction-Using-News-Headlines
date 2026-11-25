import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import apiClient, { removeAuthToken } from '@/services/client';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const ESCAPE_MESSAGE = 'You must accept both documents to continue. Use Log out if you do not accept.';

/**
 * Existing-user acceptance gate (GAP-03).
 *
 * Opened when an authenticated request returns 403 `legal_acceptance_required`.
 * Two separate, unticked controls: Terms acceptance and Privacy Policy
 * acknowledgement. The server decides which versions are current; this
 * component sends only the flags.
 *
 * Accessibility: focus moves to the heading on open, Tab stays inside the dialog,
 * and focus returns to the previously focused element on close. Escape does not
 * log out (logout is destructive); the explicit Log out button is the only exit.
 */
export const LegalAcceptanceGate = () => {
  const [open, setOpen] = useState(false);
  const [legal, setLegal] = useState({ terms: false, privacy: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Once acceptance succeeds, late 403s from requests already in flight must not reopen the gate.
  const acceptedRef = useRef(false);
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    const onRequired = () => {
      if (!acceptedRef.current) setOpen(true);
    };
    window.addEventListener('tickflow:legal-acceptance-required', onRequired);
    return () => window.removeEventListener('tickflow:legal-acceptance-required', onRequired);
  }, []);

  // Initial focus on open; restore focus to the trigger when the dialog closes.
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement;
      headingRef.current?.focus();
      return undefined;
    }
    if (returnFocusRef.current && typeof returnFocusRef.current.focus === 'function') {
      returnFocusRef.current.focus();
    }
    return undefined;
  }, [open]);

  const handleChange = useCallback((e) => {
    const { name, checked } = e.target;
    setLegal((prev) => ({ ...prev, [name]: checked }));
    setError('');
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      // Deliberately does nothing destructive. Explain why the dialog is still open.
      e.preventDefault();
      setError(ESCAPE_MESSAGE);
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const handleAccept = async (e) => {
    e.preventDefault();
    if (submitting || acceptedRef.current) return;
    if (!legal.terms || !legal.privacy) {
      setError('Both boxes must be ticked to continue.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/auth/legal/', {
        accept_terms: true,
        acknowledge_privacy_notice: true,
      });
      acceptedRef.current = true;
      setOpen(false);
      // Reload so every query re-runs against the now-accepted account.
      window.location.reload();
    } catch (err) {
      setError(err?.message || 'We could not record your acceptance. Please try again.');
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    window.location.assign('/login');
  };

  if (!open) return null;

  // Portaled to document.body so no ancestor transform, filter or stacking
  // context can clip or re-stack the gate (GAP-03 review).
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-gate-title"
        onKeyDown={handleKeyDown}
        className="w-full max-w-md rounded-lg border border-gray-800 bg-black p-6 text-gray-300"
      >
        <h2 id="legal-gate-title" ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-white focus:outline-none">
          Accept our updated terms to continue
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Before you use TickFlow Intelligence, please review and confirm the current documents.
        </p>

        <form onSubmit={handleAccept} className="mt-4 space-y-3 text-sm">
          <label htmlFor="gate-accept-terms" className="flex items-start gap-3 cursor-pointer">
            <input
              id="gate-accept-terms"
              name="terms"
              type="checkbox"
              checked={legal.terms}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-gray-600 bg-black accent-white"
            />
            <span>
              I accept the{' '}
              <Link to="/terms" className="text-gray-200 underline hover:text-white">Terms of Service</Link>
            </span>
          </label>
          <label htmlFor="gate-acknowledge-privacy" className="flex items-start gap-3 cursor-pointer">
            <input
              id="gate-acknowledge-privacy"
              name="privacy"
              type="checkbox"
              checked={legal.privacy}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-gray-600 bg-black accent-white"
            />
            <span>
              I have read the{' '}
              <Link to="/privacy" className="text-gray-200 underline hover:text-white">Privacy Policy</Link>
            </span>
          </label>

          {error && (
            <p role="alert" className="text-red-400">{error}</p>
          )}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[44px] rounded px-3 text-gray-400 hover:text-white"
            >
              Log out
            </button>
            <button
              type="submit"
              disabled={submitting || !legal.terms || !legal.privacy}
              className="min-h-[44px] rounded bg-white px-4 font-medium text-black hover:bg-gray-200 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default LegalAcceptanceGate;
