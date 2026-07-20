import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CTASection = () => (
  <section className="py-20 bg-blue-600 dark:bg-blue-700">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl font-bold text-white mb-6">
        Get started with Tickflow Sentiment today.
      </h2>
      <div className="flex flex-wrap justify-center gap-4">
        <Link to="/signup">
          <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
            Get Started Free
          </Button>
        </Link>
        <Link to="/dashboard?demo=true">
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-blue-700">
            Launch Demo
          </Button>
        </Link>
        <a
          href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
        >
          View GitHub
        </a>
      </div>
    </div>
  </section>
);

export default CTASection;