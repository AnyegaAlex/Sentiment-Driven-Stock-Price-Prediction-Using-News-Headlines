import React from 'react';

const Hero = () => {
  return (
    <section className="relative bg-black text-white pt-24 pb-20 px-4 md:px-8 lg:px-16 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#1a1a1a_0%,_#000000_70%)]"></div>
      
      <div className="relative max-w-5xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
          LSTM-driven stock direction{' '}
          <span className="text-white border-b-4 border-gray-500 pb-1">
            with confidence scoring
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-4 leading-relaxed">
          An open-source platform combining{' '}
          <span className="text-white font-semibold">FinBERT sentiment</span>,{' '}
          <span className="text-white font-semibold">7 technical indicators</span>, and{' '}
          <span className="text-white font-semibold">LSTM neural networks (32 hidden units)</span>{' '}
          to generate directional predictions (BUY/SELL/HOLD) with quantifiable confidence.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-2xl mx-auto bg-gray-900/50 border border-gray-800 p-3 rounded-lg">
          <span className="text-gray-400 text-sm">Hybrid Weighting:</span>
          <span className="text-white text-sm font-mono">50% LSTM</span>
          <span className="text-gray-600">|</span>
          <span className="text-white text-sm font-mono">30% Sentiment</span>
          <span className="text-gray-600">|</span>
          <span className="text-white text-sm font-mono">20% Technicals</span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-500 text-xs font-mono">Fallback: Sentiment-only</span>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <a
            href="https://sentiment-driven-stock-price-predic.vercel.app/signup"
            className="bg-white text-black px-8 py-3.5 rounded-md font-semibold hover:bg-gray-200 transition duration-200 text-base"
          >
            Get API Key
          </a>
          <a
          href="https://sentiment-driven-stock-price-predic.vercel.app/signup"
          className="border border-white text-white px-8 py-3.5 rounded-md font-semibold hover:bg-white hover:text-black transition duration-200 text-base"
          >
          Launch Live Demo
          </a>
          <a
            href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines"
            className="border border-white text-white px-8 py-3.5 rounded-md font-semibold hover:bg-white hover:text-black transition duration-200 text-base"
          >
            View on GitHub
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg text-center hover:border-gray-600 transition">
            <span className="block text-2xl font-bold text-white">63%</span>
            <span className="text-gray-400 text-xs uppercase tracking-wider">LSTM Accuracy</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg text-center hover:border-gray-600 transition">
            <span className="block text-2xl font-bold text-white">5+ Years</span>
            <span className="text-gray-400 text-xs uppercase tracking-wider">Historical Data</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg text-center hover:border-gray-600 transition">
            <span className="block text-2xl font-bold text-white">30+</span>
            <span className="text-gray-400 text-xs uppercase tracking-wider">API Endpoints</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg text-center hover:border-gray-600 transition">
            <span className="block text-2xl font-bold text-white">68</span>
            <span className="text-gray-400 text-xs uppercase tracking-wider">Wiki Pages</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg text-center hover:border-gray-600 transition col-span-2 md:col-span-1">
            <span className="block text-2xl font-bold text-white">98.6%</span>
            <span className="text-gray-400 text-xs uppercase tracking-wider">Uptime (7-day)</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;