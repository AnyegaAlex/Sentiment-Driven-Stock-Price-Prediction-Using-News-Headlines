import React from 'react';

const CTASection = () => {
  return (
    <section className="bg-black py-20 px-4 md:px-8 lg:px-16 border-t border-gray-800">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
          Ready to start?
        </h2>
        <p className="text-gray-400 text-base md:text-lg mb-4 max-w-2xl mx-auto">
          Get your API key, try the live demo, or explore the codebase.
        </p>
        <p className="text-gray-500 text-sm mb-12">
          API rate limit: 200 requests per minute with API key authentication.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://sentiment-driven-stock-price-predic.vercel.app/signup"
            className="bg-white text-black px-8 py-4 min-h-[44px] rounded-md font-bold text-base md:text-lg hover:bg-gray-200 transition duration-200 min-w-[180px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Get API Key
          </a>
          <a
            href="https://sentiment-driven-stock-price-predic.vercel.app/signup"
            className="border border-white text-white px-8 py-4 min-h-[44px] rounded-md font-bold text-base md:text-lg hover:bg-white hover:text-black transition duration-200 min-w-[180px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Launch Demo
          </a>
          <a
            href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines"
            className="border border-white text-white px-8 py-4 min-h-[44px] rounded-md font-bold text-base md:text-lg hover:bg-white hover:text-black transition duration-200 min-w-[180px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            View GitHub
          </a>
        </div>

        <div className="mt-8 text-gray-500 text-sm flex flex-wrap justify-center gap-4">
          <a
            href="https://stats.uptimerobot.com/520QWmDVBw"
            className="hover:text-gray-300 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uptime Status (98.6%)
          </a>
          <span className="text-gray-700">·</span>
          <a
            href="https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/"
            className="hover:text-gray-300 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
            target="_blank"
            rel="noopener noreferrer"
          >
            Swagger API Docs
          </a>
          <span className="text-gray-700">·</span>
          <a
            href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/wiki"
            className="hover:text-gray-300 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
            target="_blank"
            rel="noopener noreferrer"
          >
            68-Page Wiki
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTASection;