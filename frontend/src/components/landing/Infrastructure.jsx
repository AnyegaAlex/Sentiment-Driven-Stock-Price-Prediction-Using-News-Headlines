const availabilityNotes = [
  {
    title: 'Market data',
    description: 'Price-derived features are only available when the configured data source and access policy permit the request.',
  },
  {
    title: 'News data',
    description: 'News ingestion and analysis depend on provider availability and the permissions attached to the intended use.',
  },
  {
    title: 'Model outputs',
    description: 'Missing price history or an unavailable model should result in an explicit unavailable state, not a fabricated prediction.',
  },
];

const Infrastructure = () => (
  <section className="border-t border-gray-800 bg-black px-4 py-16 sm:px-6 lg:px-16">
    <div className="mx-auto max-w-6xl">
      <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">Data availability and limitations</h2>
      <p className="mx-auto mb-10 max-w-2xl text-center text-gray-400">
        Access to provider-backed features is controlled deliberately. A visible limitation is more useful than a result that cannot be supported.
      </p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {availabilityNotes.map((note) => (
          <article key={note.title} className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-3 text-lg font-semibold text-white">{note.title}</h3>
            <p className="text-sm leading-relaxed text-gray-400">{note.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default Infrastructure;
