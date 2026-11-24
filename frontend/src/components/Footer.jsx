import PropTypes from 'prop-types';
import TfcLogo from '@/assets/Primary Icon White.svg';

const CURRENT_YEAR = new Date().getFullYear();

const RESOURCE_LINKS = [
  {
    label: 'Getting started',
    url: 'https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/blob/master/README.md',
  },
  {
    label: 'API reference',
    url: 'https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/',
  },
  {
    label: 'GitHub repository',
    url: 'https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence',
  },
];

const TECH_STACK = ['React', 'Django', 'PyTorch', 'FinBERT', 'PostgreSQL'];

const LinkList = ({ links, label }) => (
  <div className="space-y-2">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</h3>
    <ul className="space-y-2">
      {links.map(({ label: linkLabel, url }) => (
        <li key={linkLabel}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[36px] items-center rounded text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            {linkLabel}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

LinkList.propTypes = {
  links: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
  })).isRequired,
  label: PropTypes.string.isRequired,
};

const Footer = () => (
  <footer className="border-t border-gray-800 bg-black" role="contentinfo" aria-label="Site footer">
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img src={TfcLogo} alt="" className="h-8 w-8 flex-shrink-0 opacity-80" />
            <span className="text-sm font-semibold text-white">TickFlow Intelligence</span>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-gray-400">
            An open-source stock research application. Provider-backed data features depend on current access configuration and provider permissions.
          </p>
          <span className="inline-flex rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-400">
            MIT License
          </span>
        </div>

        <LinkList links={RESOURCE_LINKS} label="Resources" />

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Technology</h3>
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map((technology) => (
              <span
                key={technology}
                className="rounded-full border border-gray-800 bg-gray-900 px-3 py-1 text-xs text-gray-400"
              >
                {technology}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('tickflow:open-consent-settings'))}
            className="inline-flex min-h-[36px] items-center rounded text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            Privacy preferences
          </button>
          <a
            href="https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/blob/master/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[36px] items-center rounded text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            Read the license
          </a>
        </div>
      </div>

      <div className="mt-8 border-t border-gray-800 pt-5 text-xs text-gray-500">
        <span>© {CURRENT_YEAR} TickFlow Capital. All rights reserved.</span>
        <p className="mt-2">
          Research tools are informational and do not constitute investment advice.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
