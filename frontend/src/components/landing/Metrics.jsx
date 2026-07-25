import React from 'react';

const metrics = [
  { 
    label: 'LSTM Prediction Accuracy', 
    value: '63%',
    description: 'On 7-day resolved predictions'
  },
  { 
    label: 'Years of Training Data', 
    value: '5+',
    description: 'Price history + news coverage'
  },
  { 
    label: 'Supported Symbols', 
    value: '10',
    description: 'AAPL, TSLA, NVDA, GOOGL, AMZN, META, MSFT, JPM, IBM, VTI'
  },
  { 
    label: 'API Endpoints', 
    value: '30+',
    description: 'Including /stock-analysis/, /technical-indicators/, /sentiment-analysis/'
  },
  { 
    label: 'Wiki Pages', 
    value: '68',
    description: 'Full API reference + deployment guides'
  },
  { 
    label: 'Uptime (7-day)', 
    value: '98.6%',
    description: 'Monitored by UptimeRobot'
  },
];

const Metrics = () => {
  return (
    <section className="bg-black py-16 px-4 md:px-8 lg:px-16 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
          Platform Metrics
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Production-grade accuracy, scale, and reliability.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div 
              key={metric.label} 
              className="bg-gray-900 border border-gray-800 p-6 rounded-lg text-center hover:border-gray-600 transition duration-200"
            >
              <span className="block text-3xl md:text-4xl font-bold text-white">{metric.value}</span>
              <span className="text-gray-400 text-xs uppercase tracking-wider block mt-1">
                {metric.label}
              </span>
              <span className="text-gray-500 text-[10px] mt-2 block">
                {metric.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Metrics;