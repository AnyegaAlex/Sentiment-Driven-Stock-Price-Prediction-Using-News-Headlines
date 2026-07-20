import React from 'react';
import { User, Brain, Code } from 'lucide-react';

const BuiltForSection = () => {
  const personas = [
    {
      icon: User,
      title: 'Traders',
      description: 'See how news events could shift prices before they move.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Brain,
      title: 'Researchers',
      description: 'Backtest sentiment signals against historical price action.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: Code,
      title: 'Developers',
      description: 'Grab structured market intelligence via a simple API.',
      color: 'from-emerald-500 to-emerald-600',
    },
  ];

  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          Built For
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
          We built Tickflow Sentiment for people who actually use data to make decisions.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {personas.map((persona) => (
            <div
              key={persona.title}
              className="p-8 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow bg-white dark:bg-gray-800"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${persona.color} flex items-center justify-center mb-4`}>
                <persona.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {persona.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {persona.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BuiltForSection;