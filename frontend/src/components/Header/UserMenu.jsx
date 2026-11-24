import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { User, Settings, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const UserMenu = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((previous) => !previous);
  }, []);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  }, [logout]);

  if (!user) return null;

  const initials = user.username ? user.username.slice(0, 2).toUpperCase() : 'U';

  const menuItems = [
    { id: 'profile', icon: User, label: 'Profile', to: '/profile', type: 'link' },
    { id: 'settings', icon: Settings, label: 'Settings', to: '/settings', type: 'link' },
  ];

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        aria-label="Open account menu"
        aria-expanded={isOpen}
        aria-controls="user-menu-dropdown"
      >
        <span className="text-sm font-medium">{initials}</span>
      </button>

      {isOpen && (
        <div
          id="user-menu-dropdown"
          className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-lg"
          aria-label="Account options"
        >
          <div className="border-b border-gray-800 px-4 py-3">
            <p className="truncate text-sm font-medium text-white">{user.username}</p>
            <p className="truncate text-xs text-gray-400">{user.email || 'Signed-in account'}</p>
          </div>

          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-500"
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}

          <div className="my-1 border-t border-gray-800" />
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-300"
          >
            {isLoggingOut
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <LogOut className="h-4 w-4" aria-hidden="true" />}
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
};

UserMenu.propTypes = {
  className: PropTypes.string,
};

export default React.memo(UserMenu);
