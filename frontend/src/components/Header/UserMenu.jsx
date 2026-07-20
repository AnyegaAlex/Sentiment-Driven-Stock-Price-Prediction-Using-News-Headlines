// frontend/src/components/Header/UserMenu.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { User, Settings, LogOut, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const UserMenu = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

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

  if (!user) return null;

  const initials = user.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'U';

  const menuItems = [
    { icon: User, label: 'Profile', to: '/profile' },
    { icon: Settings, label: 'Settings', to: '/settings' },
    { icon: LogOut, label: 'Logout', onClick: logout, className: 'text-red-600 hover:bg-red-50' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium">{initials}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.username}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.to || '#'}
              onClick={item.onClick || undefined}
              className={cn(
                'flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                item.className
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserMenu;