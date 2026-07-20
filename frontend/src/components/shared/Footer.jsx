// components/Footer.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Radar } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/services/client';
import { cn } from '@/lib/utils';

const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);

  const mutation = useMutation({
    mutationFn: async (email) => {
      const response = await apiClient.post('/subscribe/', { email });
      return response.data;
    },
    onSuccess: () => {
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus(null), 5000);
    },
    onError: (error) => {
      setStatus('error');
      setTimeout(() => setStatus(null), 5000);
    },
  });

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    mutation.mutate(email);
  };

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Radar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-gray-900 dark:text-white">
                Tickflow Sentiment
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Open-source financial news intelligence.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              © {CURRENT_YEAR} Tickflow Capital
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
              Product
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/features" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Features
                </Link>
              </li>
              <li>
                <a href="/api/docs" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  API Docs
                </a>
              </li>
              <li>
                <Link to="/dashboard?demo=true" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
              Company
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link to="/about" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <a href="mailto:anyega.alex.kamau@gmail.com" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Subscribe */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
              Updates
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Get notified about new releases.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                disabled={mutation.isPending}
              />
              <button
                type="submit"
                disabled={mutation.isPending}
                className={cn(
                  'w-full px-4 py-2 rounded-md font-medium text-sm',
                  'bg-blue-600 text-white hover:bg-blue-700',
                  'dark:bg-blue-500 dark:hover:bg-blue-600',
                  'transition-colors',
                  'disabled:opacity-70 disabled:cursor-not-allowed'
                )}
              >
                {mutation.isPending ? 'Subscribing…' : 'Subscribe'}
              </button>
              {status === 'success' && (
                <p className="text-xs text-green-600 dark:text-green-400">✓ Subscribed!</p>
              )}
              {status === 'error' && (
                <p className="text-xs text-red-600 dark:text-red-400">Something went wrong. Try again.</p>
              )}
            </form>
          </div>
        </div>

        {/* Bottom bar – minimal */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
          <span>MIT License</span>
          <span>
            Built with React · Django · PyTorch · FinBERT
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;