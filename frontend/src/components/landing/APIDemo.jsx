import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const API_BASE = 'https://sentiment-driven-stock-price-prediction.onrender.com';

const endpoints = [
  {
    name: 'Stock analysis',
    method: 'GET',
    path: '/api/v1/stock-analysis/?symbol=AAPL',
    purpose: 'Request the combined stock-analysis view for a ticker.',
    command: 'curl -H "X-API-Key: YOUR_API_KEY" "' + API_BASE + '/api/v1/stock-analysis/?symbol=AAPL"',
    access: 'Protected endpoint. Provider-backed sections may be unavailable until data access is enabled.',
  },
  {
    name: 'Technical indicators',
    method: 'GET',
    path: '/api/v1/technical-indicators/?symbol=AAPL',
    purpose: 'Request technical indicators for a ticker.',
    command: 'curl -H "X-API-Key: YOUR_API_KEY" "' + API_BASE + '/api/v1/technical-indicators/?symbol=AAPL"',
    access: 'Protected endpoint. Requires an enabled market-data source.',
  },
  {
    name: 'Sentiment analysis',
    method: 'GET',
    path: '/api/v1/sentiment-analysis/?symbol=AAPL',
    purpose: 'Request the available news-sentiment summary for a ticker.',
    command: 'curl -H "X-API-Key: YOUR_API_KEY" "' + API_BASE + '/api/v1/sentiment-analysis/?symbol=AAPL"',
    access: 'Protected endpoint. News access depends on provider permissions and configuration.',
  },
  {
    name: 'Available symbols',
    method: 'GET',
    path: '/api/v1/symbols/',
    purpose: 'Retrieve the application symbol list.',
    command: 'curl "' + API_BASE + '/api/v1/symbols/"',
    access: 'Check the API reference for the current authentication requirements.',
  },
  {
    name: 'Health check',
    method: 'GET',
    path: '/api/v1/health/',
    purpose: 'Check the API service health endpoint.',
    command: 'curl "' + API_BASE + '/api/v1/health/"',
    access: 'Health-check visibility does not guarantee that every data provider is available.',
  },
];

const APIDemo = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentEndpoint = endpoints[currentIndex];

  return (
    <section className="border-t border-gray-800 bg-black px-4 py-16 sm:px-6 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">API request examples</h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-gray-400">
          These are request patterns, not live response samples. Use the API reference for current schemas, authentication rules and endpoint availability.
        </p>

        <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 p-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Choose an API endpoint">
              {endpoints.map((endpoint, index) => (
                <button
                  key={endpoint.name}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  aria-pressed={index === currentIndex}
                  className={cn(
                    'min-h-[44px] rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400',
                    index === currentIndex
                      ? 'border-white bg-white text-black'
                      : 'border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                  )}
                >
                  {endpoint.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6" aria-live="polite">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gray-200">
                  {currentEndpoint.method}
                </span>
                <code className="break-all text-sm text-gray-200">{currentEndpoint.path}</code>
              </div>
              <p className="text-sm text-gray-400">{currentEndpoint.purpose}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Example request</p>
              <pre className="overflow-x-auto rounded-md border border-gray-800 bg-black p-4 text-xs leading-relaxed text-gray-300 sm:text-sm">
                <code>{currentEndpoint.command}</code>
              </pre>
            </div>

            <p className="rounded-md border border-gray-800 bg-black/60 p-3 text-sm text-gray-400">
              {currentEndpoint.access}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/settings?tab=developer"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            Manage API access
          </Link>
          <a
            href={API_BASE + '/api/docs/'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-600 px-5 py-2 text-sm font-medium text-white hover:border-white hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            Open API reference
          </a>
        </div>
      </div>
    </section>
  );
};

export default APIDemo;
