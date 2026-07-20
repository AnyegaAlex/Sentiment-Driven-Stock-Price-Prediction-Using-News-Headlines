import React from 'react';

const ProblemSection = () => {
  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Markets are noisy.
          <span className="block text-blue-600 dark:text-blue-400">We cut through the noise.</span>
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Thousands of headlines hit the wires every day. Most of them don't tell you
          what actually matters. Tickflow Sentiment filters the news, extracts
          the sentiment, and gives you a clear signal – not more noise.
        </p>
      </div>
    </section>
  );
};

export default ProblemSection;