import React from 'react';

const services = [
  { 
    name: 'Sentry', 
    description: 'Error tracking and performance monitoring',
    badge: 'prod'
  },
  { 
    name: 'UptimeRobot', 
    description: '98.6% uptime monitoring (7-day)',
    link: 'https://stats.uptimerobot.com/520QWmDVBw',
    badge: 'prod'
  },
  { 
    name: 'SendGrid', 
    description: 'Email delivery for notifications',
    badge: 'prod'
  },
  { 
    name: 'Cron Jobs', 
    description: 'Daily prediction resolution (7-day cycle)',
    badge: 'prod'
  },
  { 
    name: 'Health Check', 
    description: '/health endpoint with DB, Redis, memory checks',
    badge: 'prod'
  },
  { 
    name: 'JSON Logs', 
    description: 'Structured logging for observability',
    badge: 'prod'
  },
  { 
    name: 'GitHub Actions', 
    description: 'CI/CD with automated tests and deployment',
    badge: 'prod'
  },
  { 
    name: 'Security Headers', 
    description: 'CORS, HSTS, and security headers',
    badge: 'prod'
  },
];

const dataProviders = [
  { name: 'Finnhub', description: 'Primary data source – 60 calls/min' },
  { name: 'Twelve Data', description: 'Secondary – 800 calls/day' },
  { name: 'Yahoo Finance', description: 'Fallback – unlimited but unreliable' },
  { name: 'Alpha Vantage', description: 'Last resort – 5 calls/min' },
];

const newsSources = [
  { name: 'Alpha Vantage', description: 'News feed with sentiment' },
  { name: 'Finnhub', description: 'Company news API' },
  { name: 'Yahoo Finance', description: 'News via RapidAPI' },
];

const Infrastructure = () => {
  return (
    <section className="bg-black py-16 px-4 md:px-8 lg:px-16 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
          Infrastructure Stack
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Production-grade monitoring, logging, and data pipelines.
        </p>

        {/* Production Services */}
        <div className="mb-12">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4 text-center">
            Production Services
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {services.map((service) => (
              <div 
                key={service.name} 
                className="bg-gray-900 border border-gray-800 p-4 rounded-lg text-center hover:border-gray-600 transition duration-200"
              >
                {service.link ? (
                  <a 
                    href={service.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white font-semibold text-sm hover:text-gray-300 transition"
                  >
                    {service.name}
                  </a>
                ) : (
                  <h3 className="text-white font-semibold text-sm">{service.name}</h3>
                )}
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                  {service.description}
                </p>
                <span className="inline-block mt-2 text-[8px] uppercase tracking-wider text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                  production
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Providers */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4 text-center">
            Data Providers (Priority Order)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dataProviders.map((provider) => (
              <div key={provider.name} className="bg-gray-900 border border-gray-800 p-4 rounded-lg text-center">
                <h3 className="text-white font-semibold text-sm">{provider.name}</h3>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">{provider.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* News Sources */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4 text-center">
            News Sources
          </h3>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {newsSources.map((source) => (
              <div key={source.name} className="bg-gray-900 border border-gray-800 p-4 rounded-lg text-center">
                <h3 className="text-white font-semibold text-sm">{source.name}</h3>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">{source.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Infrastructure;