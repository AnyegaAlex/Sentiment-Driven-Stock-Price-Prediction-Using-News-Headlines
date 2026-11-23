const principles = [
  {
    title: 'Evidence before output',
    description: 'The application brings together available market, technical and news context instead of asking users to rely on a label alone.',
  },
  {
    title: 'Visible data limitations',
    description: 'Provider outages, disabled access and missing inputs should be reported clearly, not disguised as valid analysis.',
  },
  {
    title: 'Account controls',
    description: 'Manage your profile, investment preferences, security and developer access from the workspace.',
  },
  {
    title: 'Open implementation',
    description: 'Review the code, inspect how features are built and report issues through the public repository.',
  },
];

const Metrics = () => (
  <section className="border-t border-gray-800 bg-black px-4 py-16 sm:px-6 lg:px-16">
    <div className="mx-auto max-w-6xl">
      <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
        Built around useful research
      </h2>
      <p className="mx-auto mb-10 max-w-2xl text-center text-gray-400">
        The interface is designed to make the evidence, access status and limitations easier to understand.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {principles.map((item) => (
          <article
            key={item.title}
            className="rounded-lg border border-gray-800 bg-gray-900 p-6 transition-colors hover:border-gray-600"
          >
            <h3 className="mb-2 text-lg font-semibold text-white">{item.title}</h3>
            <p className="text-sm leading-relaxed text-gray-400">{item.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default Metrics;
