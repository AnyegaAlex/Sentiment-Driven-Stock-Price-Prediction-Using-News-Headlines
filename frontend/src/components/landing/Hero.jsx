import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import DashboardPreview from './DashboardPreview';

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-gray-900 py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
              Turn financial news into{' '}
              <span className="text-blue-600 dark:text-blue-400">trading signals.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              Tickflow Sentiment reads the news, extracts market mood, and gives you
              a clear view of where prices might be heading.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/signup">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Get started free
                </Button>
              </Link>
              <Link to="/dashboard?demo=true">
                <Button size="lg" variant="outline">
                  Try the demo
                </Button>
              </Link>
              <a
                href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" variant="ghost">
                  View on GitHub
                </Button>
              </a>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <DashboardPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;