// components/Navbar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PropTypes from 'prop-types';

const propTypes = {
  /** Layout variant: 'public' for landing, 'app' for dashboard */
  variant: PropTypes.oneOf(['public', 'app']),
};

const NAV_LINKS = [
  { name: 'Documentation', href: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/wiki' },
  { name: 'API Reference', href: 'https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/' },
  { name: 'GitHub', href: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines' },
];

const Navbar = ({ variant = 'public' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const isExternalLink = (href) => href.startsWith('http');

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-black border-b border-gray-800'
          : 'bg-transparent border-transparent'
      )}
      aria-label="Main navigation"
      ref={menuRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-md min-h-[44px] px-2"
          >
            <span className="text-xl font-bold text-white tracking-tight">
              Tickflow Sentiment
            </span>
            <span className="text-xs text-gray-500 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
              v2.4
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const isExternal = isExternalLink(link.href);
              if (isExternal) {
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px] inline-flex items-center px-2"
                  >
                    {link.name}
                  </a>
                );
              }
              return (
                <NavLink
                  key={link.name}
                  to={link.href}
                  className={({ isActive }) =>
                    cn(
                      'text-sm transition min-h-[44px] inline-flex items-center px-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                      isActive
                        ? 'text-white font-medium'
                        : 'text-gray-400 hover:text-white'
                    )
                  }
                  aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
                >
                  {link.name}
                </NavLink>
              );
            })}

            {variant === 'public' ? (
              <>
                <a
                  href="https://sentiment-driven-stock-price-predic.vercel.app/signup"
                  className="text-sm text-gray-400 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px] inline-flex items-center px-2"
                >
                  Sign In
                </a>
                <a
                  href="https://sentiment-driven-stock-price-predic.vercel.app/signup"
                  className="inline-block bg-white text-black px-4 py-2 rounded-md font-medium text-sm hover:bg-gray-200 transition min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Get API Key
                </a>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  {/* user?.username – handled by auth context if needed */}
                </span>
                <button
                  className="text-sm text-gray-400 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px] inline-flex items-center px-2"
                  // onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            <span className="sr-only">{isOpen ? 'Close' : 'Open'} menu</span>
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div
          id="mobile-menu"
          className="md:hidden bg-black border-b border-gray-800 px-4 py-4 space-y-3"
          role="menu"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map((link) => {
            const isExternal = isExternalLink(link.href);
            if (isExternal) {
              return (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-gray-400 hover:text-white min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded px-2"
                  onClick={() => setIsOpen(false)}
                  role="menuitem"
                >
                  {link.name}
                </a>
              );
            }
            return (
              <NavLink
                key={link.name}
                to={link.href}
                className={({ isActive }) =>
                  cn(
                    'block text-sm transition min-h-[44px] flex items-center rounded px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                    isActive
                      ? 'text-white font-medium'
                      : 'text-gray-400 hover:text-white'
                  )
                }
                onClick={() => setIsOpen(false)}
                role="menuitem"
                aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
              >
                {link.name}
              </NavLink>
            );
          })}

          {variant === 'public' ? (
            <>
              <a
                href="https://sentiment-driven-stock-price-predic.vercel.app/signup"
                className="block text-sm text-gray-400 hover:text-white min-h-[44px] flex items-center rounded px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                onClick={() => setIsOpen(false)}
                role="menuitem"
              >
                Sign In
              </a>
              <a
                href="https://sentiment-driven-stock-price-predic.vercel.app/signup"
                className="block text-sm font-medium text-white bg-gray-800 px-4 py-2 rounded-md text-center min-h-[44px] flex items-center justify-center hover:bg-gray-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                onClick={() => setIsOpen(false)}
                role="menuitem"
              >
                Get API Key
              </a>
            </>
          ) : (
            <button
              className="block text-sm text-gray-400 hover:text-white w-full text-left min-h-[44px] flex items-center rounded px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              role="menuitem"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

Navbar.propTypes = propTypes;

export default React.memo(Navbar);