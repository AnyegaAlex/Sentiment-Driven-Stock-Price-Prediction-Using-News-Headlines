import React from 'react';
import { Link } from 'react-router-dom';

const AboutSection = () => (
  <section className="py-20 bg-white dark:bg-gray-900">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Built by Tickflow Capital
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
        Tickflow Capital builds institutional‑grade financial tools. We combine
        quantitative research with machine learning to turn financial news into
        actionable intelligence. Tickflow Sentiment is our open‑source platform
        – designed for traders, analysts, and developers who want to move faster.
      </p>
      <Link
        to="/about"
        className="inline-block mt-6 text-blue-600 dark:text-blue-400 hover:underline font-medium"
      >
        Learn more about Tickflow Capital →
      </Link>
    </div>
  </section>
);

export default AboutSection;