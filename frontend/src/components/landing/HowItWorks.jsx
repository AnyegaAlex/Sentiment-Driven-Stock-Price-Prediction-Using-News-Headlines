import React from 'react';
import { Search, Brain, TrendingUp, LayoutDashboard } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Search any stock',
    description: 'Type in a ticker or company name to get started.',
  },
  {
    icon: Brain,
    title: 'AI reads the news',
    description: 'Our NLP model extracts sentiment and key themes from headlines.',
  },
  {
    icon: TrendingUp,
    title: 'Get a forecast',
    description: 'Machine learning predicts where the price might head next.',
  },
  {
    icon: LayoutDashboard,
    title: 'Explore the dashboard',
    description: 'See sentiment, confidence, and historical trends in one place.',
  },
];

const HowItWorks = () => (
  <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
        How It Works
      </h2>
      <div className="grid md:grid-cols-4 gap-8">
        {steps.map((step, index) => (
          <div key={index} className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <step.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;