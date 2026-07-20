import React from 'react';
import { Brain, TrendingUp, Newspaper, BarChart3, Clock, Code } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Financial News Intelligence',
    description: 'Turn news headlines into actionable trading signals using NLP.',
  },
  {
    icon: TrendingUp,
    title: 'Market Sentiment',
    description: 'See real‑time market mood – positive, neutral, or negative – at a glance.',
  },
  {
    icon: Newspaper,
    title: 'Prediction Engine',
    description: 'Get directional price forecasts from our machine learning models.',
  },
  {
    icon: BarChart3,
    title: 'Interactive Dashboard',
    description: 'Track sentiment trends, confidence scores, and historical patterns in one place.',
  },
  {
    icon: Clock,
    title: 'Historical Research',
    description: 'Review past predictions and compare them against actual market moves.',
  },
  {
    icon: Code,
    title: 'Developer API',
    description: 'Pull sentiment data into your own apps with a clean REST API.',
  },
];

const FeaturesGrid = () => (
  <section className="py-20 bg-white dark:bg-gray-900">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
        Core Capabilities
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <feature.icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesGrid;