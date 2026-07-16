/**
 * Footer Component – Tickflow Capital
 * 
 * Institutional-grade footer with:
 * - Copyright and brand description
 * - Navigation links (Documentation, API, GitHub, Contact)
 * - Platform links (Web App, Backend API, Model Demo)
 * - Newsletter subscription
 * - Technology stack attribution
 * - MIT License
 * 
 * Features:
 * - Fully responsive (mobile → desktop)
 * - Accessible form with ARIA live regions
 * - Loading, success, and error states
 * - Dark mode support
 * - Clean, premium typography & spacing
 */

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants (extracted for maintainability)
// ============================================================================

const CURRENT_YEAR = new Date().getFullYear();

/** Navigation links (primary) */
const NAV_LINKS = [
  { label: 'Documentation', url: 'https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/' },
  { label: 'API', url: 'https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/' },
  { label: 'GitHub', url: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines' },
  { label: 'Contact', url: 'mailto:anyega.alex.kamau@gmail.com' },
];

/** Platform links (formerly "Live Demo") */
const PLATFORM_LINKS = [
  { label: 'Web App', url: 'https://sentiment-driven-stock-price-predic.vercel.app/' },
  { label: 'Backend API', url: 'https://sentiment-driven-stock-price-prediction.onrender.com' },
  { label: 'Model Demo', url: 'https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics' },
];

/** Technology stack (optional, displayed subtly) */
const TECH_STACK = ['React', 'Django', 'PyTorch', 'FinBERT', 'PostgreSQL'];

// ============================================================================
// Helper Functions
// ============================================================================

const subscribe = async (email) => {
  const response = await apiClient.post('/subscribe/', { email });
  return response;
};

// ============================================================================
// Sub‑components
// ============================================================================

/**
 * Renders a list of links (used for both NAV_LINKS and PLATFORM_LINKS)
 */
const LinkList = ({ links, label }) => (
  <div className="space-y-1">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {label}
    </h4>
    <ul className="space-y-1">
      {links.map(({ label, url }) => (
        <li key={label}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition"
          >
            {label}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const mutation = useMutation({
    mutationFn: subscribe,
    onSuccess: () => {
      setSubscriptionStatus('success');
      setEmail('');
      // Auto-clear status after 5 seconds
      setTimeout(() => setSubscriptionStatus(null), 5000);
    },
    onError: (error) => {
      setSubscriptionStatus('error');
      setErrorMessage(error.message || 'Subscription failed. Please try again.');
    },
  });

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!email) return;
    mutation.mutate(email);
  };

  return (
    <footer
      className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Primary Grid */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          
          {/* Brand & Description */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                © {CURRENT_YEAR} Tickflow Capital
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                Open-source AI platform for financial news intelligence, market sentiment analysis, and quantitative research.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span>Powered by</span>
              <span className="font-medium text-gray-600 dark:text-gray-300">Tickflow Capital</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-2">
            <LinkList links={NAV_LINKS} label="Resources" />
          </div>

          {/* Platform Links */}
          <div className="lg:col-span-2">
            <LinkList links={PLATFORM_LINKS} label="Platform" />
          </div>

          {/* Newsletter Subscription */}
          <div className="lg:col-span-3">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Receive product updates
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Stay informed about releases and research.
              </p>
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col sm:flex-row gap-2"
                aria-label="Email subscription form"
              >
                <div className="relative w-full">
                  <label htmlFor="footer-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="footer-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="your@email.com"
                    required
                    className={cn(
                      'w-full px-3 py-2 rounded-md border text-sm',
                      'border-gray-300 dark:border-gray-600 focus:outline-none',
                      'focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
                      'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                      'placeholder-gray-400 dark:placeholder-gray-500',
                      mutation.isPending && 'opacity-70'
                    )}
                    disabled={mutation.isPending}
                    aria-describedby="subscription-status"
                  />
                  <div
                    id="subscription-status"
                    aria-live="polite"
                    className="absolute -bottom-5 left-0 right-0 text-center text-xs"
                  >
                    {subscriptionStatus === 'success' && (
                      <span className="text-green-600 dark:text-green-400">
                        ✓ Subscribed successfully!
                      </span>
                    )}
                    {subscriptionStatus === 'error' && (
                      <span className="text-red-600 dark:text-red-400">
                        {errorMessage}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className={cn(
                    'px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap',
                    'bg-blue-600 text-white hover:bg-blue-700',
                    'dark:bg-blue-500 dark:hover:bg-blue-600',
                    'transition-colors',
                    'disabled:opacity-70 disabled:cursor-not-allowed'
                  )}
                  aria-label={mutation.isPending ? 'Subscribing...' : 'Subscribe to updates'}
                >
                  {mutation.isPending ? 'Subscribing…' : 'Subscribe'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex flex-wrap items-center gap-4">
            <span>MIT License</span>
            <span className="hidden sm:inline">•</span>
            <span className="flex flex-wrap gap-1">
              <span>Built with</span>
              {TECH_STACK.map((tech, idx, arr) => (
                <React.Fragment key={tech}>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{tech}</span>
                  {idx < arr.length - 1 && <span>•</span>}
                </React.Fragment>
              ))}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {PLATFORM_LINKS.map(({ label, url }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 dark:hover:text-gray-100 transition"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;