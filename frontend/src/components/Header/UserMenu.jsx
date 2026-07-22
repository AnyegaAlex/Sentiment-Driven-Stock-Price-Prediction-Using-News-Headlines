// frontend/src/components/Header/UserMenu.jsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { User, Settings, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const UserMenu = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on ESC key
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
    setIsOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  }, [logout]);

  if (!user) return null;

  const initials = user.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'U';

  const menuItems = [
    { 
      id: 'profile',
      icon: User, 
      label: 'Profile', 
      to: '/profile', 
      type: 'link' 
    },
    { 
      id: 'settings',
      icon: Settings, 
      label: 'Settings', 
      to: '/settings', 
      type: 'link' 
    },
    { 
      id: 'logout',
      icon: LogOut, 
      label: 'Logout', 
      onClick: handleLogout, 
      type: 'button',
      className: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20',
      disabled: isLoggingOut,
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="user-menu-dropdown"
      >
        <span className="text-sm font-medium">{initials}</span>
      </button>

      {isOpen && (
        <div
          id="user-menu-dropdown"
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
          role="menu"
          aria-label="User menu"
        >
          {/* User Info */}
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.username}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>

          {/* Menu Items */}
          {menuItems.map((item) => {
            const baseClassName = cn(
              'flex items-center gap-3 px-4 py-2 text-sm w-full transition-colors',
              'focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700',
              item.className
            );

            if (item.type === 'button') {
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={cn(
                    baseClassName,
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    item.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  role="menuitem"
                >
                  {item.disabled ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <item.icon className="h-4 w-4" />
                  )}
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={cn(
                  baseClassName,
                  'hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
                role="menuitem"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default React.memo(UserMenu);