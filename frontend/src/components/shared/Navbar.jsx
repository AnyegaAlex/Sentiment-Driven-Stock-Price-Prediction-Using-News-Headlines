import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import TfcLogo from '@/assets/Primary Icon White.svg';

const NAV_LINKS = [
  { name: 'Documentation', href: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/wiki' },
  { name: 'API Reference', href: 'https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/' },
  { name: 'GitHub', href: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <nav
      ref={navRef}
      className={cn(
        'fixed left-0 right-0 top-0 z-50 bg-black transition-colors duration-300',
        scrolled ? 'border-b border-gray-800' : 'border-b border-transparent'
      )}
      aria-label="Public navigation"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex min-h-[44px] items-center gap-2.5 rounded-md px-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            aria-label="TickFlow Intelligence home"
          >
            <img src={TfcLogo} alt="" className="h-8 w-8 flex-shrink-0" />
            <span className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              TickFlow Intelligence
            </span>
          </Link>

          <div className="hidden items-center gap-5 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center rounded px-2 text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                {link.name}
              </a>
            ))}
            <Link
              to="/login"
              className="inline-flex min-h-[44px] items-center rounded px-2 text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex min-h-[44px] items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Create account
            </Link>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-300 hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 md:hidden"
            aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={isOpen}
            aria-controls="public-mobile-navigation"
          >
            <span className="sr-only">{isOpen ? 'Close' : 'Open'} navigation</span>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {isOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="public-mobile-navigation"
        hidden={!isOpen}
        className="space-y-1 border-b border-gray-800 bg-black px-4 py-4 md:hidden"
      >
          {NAV_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center rounded px-3 text-sm text-gray-300 hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </a>
          ))}
          <Link
            to="/login"
            className="flex min-h-[44px] items-center rounded px-3 text-sm text-gray-300 hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            onClick={() => setIsOpen(false)}
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="flex min-h-[44px] items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            onClick={() => setIsOpen(false)}
          >
            Create account
          </Link>
        </div>
    </nav>
  );
};

export default React.memo(Navbar);
