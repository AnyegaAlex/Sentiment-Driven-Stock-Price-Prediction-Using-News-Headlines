// components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Radar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Navbar = ({ variant = 'public' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Documentation', href: '/docs' },
    { name: 'GitHub', href: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800'
          : 'bg-transparent'
      )}
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Radar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Tickflow Sentiment
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {link.name}
              </a>
            ))}
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
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {user?.username}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Logout
                </Button>
              </>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="block text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setIsOpen(false)}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {link.name}
            </a>
          ))}
          {variant === 'public' ? (
            <>
              <Link
                to="/login"
                className="block text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="block text-sm font-medium text-blue-600 dark:text-blue-400"
                onClick={() => setIsOpen(false)}
              >
                Get Started
              </Link>
            </>
          ) : (
            <button
              onClick={() => {
                logout();
                navigate('/');
                setIsOpen(false);
              }}
              className="block text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;