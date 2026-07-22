// components/Navbar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Radar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PropTypes from 'prop-types';

const propTypes = {
  /** Layout variant: 'public' for landing, 'app' for dashboard */
  variant: PropTypes.oneOf(['public', 'app']),
};

const NAV_LINKS = [
  { name: 'Features', href: '#features' },
  { name: 'Documentation', href: '/docs' },
  { name: 'GitHub', href: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines' },
];

const Navbar = ({ variant = 'public' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  }, [logout, navigate]);

  const isExternalLink = (href) => href.startsWith('http') || href.startsWith('#');

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800'
          : 'bg-transparent'
      )}
      aria-label="Main navigation"
      ref={menuRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md">
            <Radar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Tickflow Sentiment
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
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
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
                      'text-sm transition',
                      isActive
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
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
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Get Started
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {user?.username}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div
          id="mobile-menu"
          className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 space-y-3"
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
                  className="block text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
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
                    'block text-sm transition',
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
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
              <Link
                to="/login"
                className="block text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                onClick={() => setIsOpen(false)}
                role="menuitem"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="block text-sm font-medium text-blue-600 dark:text-blue-400"
                onClick={() => setIsOpen(false)}
                role="menuitem"
              >
                Get Started
              </Link>
            </>
          ) : (
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="block text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 w-full text-left"
              role="menuitem"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

Navbar.propTypes = propTypes;

export default React.memo(Navbar);