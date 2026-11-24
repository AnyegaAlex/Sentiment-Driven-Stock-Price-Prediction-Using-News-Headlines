const modules = [
  {
    title: 'News context',
    description: 'The codebase includes news ingestion and sentiment-analysis components. Their availability depends on provider configuration, access permissions and current service status.',
  },
  {
    title: 'Technical analysis',
    description: 'Technical indicators are calculated from market data when the relevant data access is enabled and the required history is available.',
  },
  {
    title: 'Prediction engine',
    description: 'The repository contains an LSTM prediction pipeline. A prediction should only be presented when the model and its required inputs return a valid result.',
  },
  {
    title: 'Account and API layer',
    description: 'The application includes account authentication, preferences and developer settings for managing API access.',
  },
];

const TechnicalBreakdown = () => (
  <section className="border-t border-gray-800 bg-black px-4 py-16 sm:px-6 lg:px-16">
    <div className="mx-auto max-w-6xl">
      <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">What sits behind the workspace</h2>
      <p className="mx-auto mb-12 max-w-2xl text-center text-gray-400">
        The platform is modular. Each analysis area has its own data requirements and availability conditions.
      </p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {modules.map((module) => (
          <article key={module.title} className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-3 text-xl font-semibold text-white">{module.title}</h3>
            <p className="text-sm leading-relaxed text-gray-400">{module.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default TechnicalBreakdown;
