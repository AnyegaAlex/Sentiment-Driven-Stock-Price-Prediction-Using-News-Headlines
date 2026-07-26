import React from 'react';

const OpenSource = () => {
  return (
    <section className="bg-black py-16 px-4 md:px-8 lg:px-16 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Open Source & Security</h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Fully transparent, MIT-licensed, and production-ready.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* MIT License */}
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg hover:border-gray-600 transition duration-200">
            <h3 className="text-xl font-semibold text-white mb-4">MIT License</h3>
            <ul className="text-gray-400 space-y-2 text-sm">
              <li>✓ Commercial use permitted</li>
              <li>✓ Modification allowed</li>
              <li>✓ Distribution allowed</li>
              <li>✓ Private use allowed</li>
              <li className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-800">
                68-page Wiki • 30+ Endpoints • 10 Symbols • 63% LSTM Accuracy
              </li>
              <li className="text-xs text-gray-500">
                <a
                  href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/blob/main/LICENSE"
                  className="text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
                >
                  View full license
                </a>
              </li>
            </ul>
          </div>

          {/* GitHub Security */}
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg hover:border-gray-600 transition duration-200">
            <h3 className="text-xl font-semibold text-white mb-4">GitHub Security</h3>
            <ul className="text-gray-400 space-y-2 text-sm">
              <li>✓ Dependabot alerts</li>
              <li>✓ CodeQL static analysis</li>
              <li>✓ Secret scanning</li>
              <li>✓ Security advisories</li>
              <li className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-800">
                <a
                  href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/security"
                  className="text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
                >
                  View security policies
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <span className="text-gray-400 text-sm">
            <span className="text-white font-bold">68</span> Wiki Pages
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400 text-sm">
            <span className="text-white font-bold">30+</span> API Endpoints
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400 text-sm">
            <span className="text-white font-bold">10</span> Supported Symbols
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400 text-sm">
            <span className="text-white font-bold">MIT</span> License
          </span>
        </div>

        <div className="text-center mt-8">
          <a
            href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines"
            className="inline-block border border-white text-white px-6 py-3 min-h-[44px] rounded-md font-semibold hover:bg-white hover:text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
};

export default OpenSource;