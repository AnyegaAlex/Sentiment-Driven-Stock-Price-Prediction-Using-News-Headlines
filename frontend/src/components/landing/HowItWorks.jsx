import React from 'react';

const steps = [
  {
    step: 1,
    title: 'Search any stock',
    description: 'Enter a stock symbol (e.g., AAPL, TSLA, NVDA) from the 10 supported symbols to begin analysis.',
  },
  {
    step: 2,
    title: 'Fetch news from 3+ sources',
    description: 'Aggregate headlines from Alpha Vantage, Finnhub, and Yahoo Finance. Apply SHA-256 deduplication, then FinBERT sentiment analysis with key phrase extraction and source reliability ranking (1-100).',
  },
  {
    step: 3,
    title: 'LSTM processes 7 features',
    description: 'The neural network (32 hidden units) processes sentiment plus MA7, MA21, STD21, RSI14, UpperBB, and LowerBB to generate directional predictions.',
  },
  {
    step: 4,
    title: 'View dashboard & track accuracy',
    description: 'Get a unified stock opinion (BUY/SELL/HOLD) with confidence scoring, technical indicators (SMA-50, SMA-200, RSI, support/resistance, volume), sentiment history, price targets, risk assessment, and 7-day prediction resolution.',
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-black py-16 px-4 md:px-8 lg:px-16 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
          How It Works
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          From stock symbol to prediction in four steps.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div 
              key={step.step} 
              className="bg-gray-900 border border-gray-800 p-6 rounded-lg hover:border-gray-600 transition duration-200"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-gray-800 rounded-full text-white font-bold text-xl mb-4">
                {step.step}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;