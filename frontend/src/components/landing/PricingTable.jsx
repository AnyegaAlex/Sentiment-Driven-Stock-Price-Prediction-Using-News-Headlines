import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Try the platform',
    features: ['10 analyses/day', 'Basic sentiment', '30-day history'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For active traders',
    features: ['Unlimited analyses', 'LSTM predictions', 'Alerts', 'Export data'],
    cta: 'Start Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For institutions',
    features: ['Custom models', 'White-label', 'Dedicated support'],
    cta: 'Contact Sales',
    popular: false,
  },
];

const PricingTable = () => (
  <section className="py-20 bg-white dark:bg-gray-900">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
        Simple, Transparent Pricing
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`p-6 rounded-xl border ${
              plan.popular
                ? 'border-blue-600 dark:border-blue-400 shadow-lg'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {plan.popular && (
              <span className="inline-block bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full mb-4">
                Most Popular
              </span>
            )}
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {plan.price}
              <span className="text-base font-normal text-gray-500 dark:text-gray-400">/mo</span>
            </p>
            <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">{plan.description}</p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
            <Link to={plan.name === 'Enterprise' ? '/contact' : '/signup'}>
              <Button className="w-full mt-8" variant={plan.popular ? 'default' : 'outline'}>
                {plan.cta}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingTable;