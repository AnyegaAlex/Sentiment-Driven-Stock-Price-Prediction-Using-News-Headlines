import React from 'react';

const pageBreakdown = [
  { category: 'Getting Started', count: 4, link: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/wiki/Getting-Started' },
  { category: 'API Reference', count: 11, link: 'https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/' },
  { category: 'Deployment Guides', count: 5, link: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/wiki/Deployment' },
  { category: 'Security', count: 6, link: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/wiki/Security' },
  { category: 'Machine Learning', count: 4, link: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/wiki/Machine-Learning' },
  { category: 'Appendices', count: 5, link: 'https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/wiki/Appendices' },
];

const Documentation = () => {
  const totalPages = pageBreakdown.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="bg-black py-16 px-4 md:px-8 lg:px-16 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
          Documentation
        </h2>
        <p className="text-gray-400 text-center mb-8 max-w-2xl mx-auto">
          Explore our comprehensive {totalPages}-page GitHub Wiki, covering everything 
          from setup to advanced machine learning concepts.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {pageBreakdown.map((item) => (
            <a
              key={item.category}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-900 border border-gray-800 p-4 rounded-lg text-center hover:border-gray-600 transition duration-200 group"
            >
              <span className="block text-2xl font-bold text-white group-hover:text-gray-200 transition">
                {item.count}
              </span>
              <span className="text-gray-400 text-sm">{item.category}</span>
            </a>
          ))}
        </div>

        <div className="text-center">
          <div className="inline-block bg-gray-900 border border-gray-800 px-6 py-3 rounded-lg mb-6">
            <span className="text-white font-bold text-xl">{totalPages}</span>
            <span className="text-gray-400 ml-2">Total Pages</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines/wiki"
              className="inline-block bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-gray-200 transition duration-200"
            >
              Read the Wiki
            </a>
            <a
              href="https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/"
              className="inline-block border border-white text-white px-6 py-3 rounded-md font-semibold hover:bg-white hover:text-black transition duration-200"
            >
              Swagger API Docs
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Documentation;