const resources = [
  {
    title: 'Getting started',
    description: 'Set up the project, configure the environment and run the application.',
    href: 'https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/blob/master/README.md',
  },
  {
    title: 'API reference',
    description: 'Review available endpoints, authentication requirements and request formats.',
    href: 'https://sentiment-driven-stock-price-prediction.onrender.com/api/docs/',
  },
  {
    title: 'Technical documentation',
    description: 'Browse the repository documentation and implementation notes.',
    href: 'https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/tree/master/docs',
  },
];

const Documentation = () => (
  <section className="border-t border-gray-800 bg-black px-4 py-16 sm:px-6 lg:px-16">
    <div className="mx-auto max-w-6xl">
      <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">Documentation and resources</h2>
      <p className="mx-auto mb-10 max-w-2xl text-center text-gray-400">
        Start with the setup guide, use the API reference for current contracts, or inspect the technical documentation in the repository.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {resources.map((resource) => (
          <a
            key={resource.title}
            href={resource.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-800 bg-gray-900 p-6 transition-colors hover:border-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            <h3 className="mb-2 text-lg font-semibold text-white">{resource.title}</h3>
            <p className="text-sm leading-relaxed text-gray-400">{resource.description}</p>
            <span className="mt-4 inline-block text-sm font-medium text-gray-200">Open resource ↗</span>
          </a>
        ))}
      </div>
    </div>
  </section>
);

export default Documentation;
