/**
 * Footer Component – Tickflow Capital
 * 
 * Institutional-grade footer with:
 * - Copyright and brand description
 * - Navigation links (Documentation, API, GitHub, Contact)
 * - Platform links (Web App, Backend API, Model Demo)
 * - Technology stack attribution
 * - MIT License
 * 
 * Features:
 * - Fully responsive (mobile → desktop)
 * - Accessible navigation
 * - Dark mode only (brand compliant)
 * - Clean, technical typography
 */

import React from 'react';

// ============================================================================
// Constants
// ============================================================================

const CURRENT_YEAR = new Date().getFullYear();

const NAV_LINKS = [
  { label: 'Documentation', url: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/wiki' },
  { label: 'API Reference', url: 'https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/' },
  { label: 'GitHub', url: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines' },
  { label: 'Contact', url: 'mailto:anyega.alex.kamau@gmail.com' },
];

const PLATFORM_LINKS = [
  { label: 'Web App', url: 'https://sentiment-driven-stock-price-predic.vercel.app/' },
  { label: 'Backend API', url: 'https://sentiment-driven-stock-price-prediction.onrender.com' },
  { label: 'Model Demo', url: 'https://huggingface.co/spaces/AnyegaAlex/stock-prediction-analytics' },
  { label: 'Uptime Status', url: 'https://stats.uptimerobot.com/520QWmDVBw' },
];

const TECH_STACK = ['React', 'Django', 'PyTorch', 'FinBERT', 'PostgreSQL'];

// ============================================================================
// Sub-components
// ============================================================================

const LinkList = ({ links, label }) => (
  <div className="space-y-1">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
      {label}
    </h4>
    <ul className="space-y-1">
      {links.map(({ label, url }) => (
        <li key={label}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
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
  return (
    <footer
      className="border-t border-gray-800 bg-black"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Primary Grid */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          
          {/* Brand & Description */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                © {CURRENT_YEAR} Tickflow Capital
              </p>
              <p className="text-sm text-gray-400 max-w-md leading-relaxed">
                Open-source platform combining LSTM neural networks, FinBERT sentiment analysis, 
                and technical indicators for directional stock predictions with confidence scoring.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>MIT License</span>
              <span>•</span>
              <span className="text-gray-400">Open Source</span>
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

          {/* Tech Stack */}
          <div className="lg:col-span-3">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Technology Stack
              </h4>
              <div className="flex flex-wrap gap-2">
                {TECH_STACK.map((tech) => (
                  <span
                    key={tech}
                    className="text-xs text-gray-400 bg-gray-900 px-3 py-1 rounded-full border border-gray-800"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                68-page Wiki • 30+ Endpoints • 10 Supported Symbols
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <div className="flex flex-wrap items-center gap-4">
            <span>© {CURRENT_YEAR} Tickflow Capital</span>
            <span className="hidden sm:inline">•</span>
            <span>MIT License</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-gray-600">Open-source financial intelligence</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {PLATFORM_LINKS.map(({ label, url }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
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