import React from 'react';
import { Button } from '@/components/ui/button';

const OpenSourceSection = () => (
  <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Open source, fully transparent.
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
        Tickflow Sentiment is MIT‑licensed. You can browse the code, submit
        improvements, or use it as a starting point for your own projects.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button asChild variant="default">
          <a href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="/docs">Documentation</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/api/docs">API Docs</a>
        </Button>
      </div>
    </div>
  </section>
);

export default OpenSourceSection;