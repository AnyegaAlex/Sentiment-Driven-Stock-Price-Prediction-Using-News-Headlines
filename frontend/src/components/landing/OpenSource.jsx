const OpenSource = () => (
  <section className="border-t border-gray-800 bg-black px-4 py-16 sm:px-6 lg:px-16">
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">Open source and transparency</h2>
      <p className="mx-auto mb-10 max-w-2xl text-center text-gray-400">
        The project is released under the MIT License. You can inspect the implementation, review its limitations and contribute through the repository.
      </p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <article className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h3 className="mb-3 text-xl font-semibold text-white">MIT License</h3>
          <p className="mb-5 text-sm leading-relaxed text-gray-400">
            The license permits use, modification, distribution and private use, subject to its terms and notice requirements.
          </p>
          <a
            href="https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            Read the license
          </a>
        </article>

        <article className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h3 className="mb-3 text-xl font-semibold text-white">Review the implementation</h3>
          <p className="mb-5 text-sm leading-relaxed text-gray-400">
            Explore the source, inspect open issues and report problems. Public source code should be reviewed on its current merits, not treated as a security or performance guarantee.
          </p>
          <a
            href="https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            View the repository
          </a>
        </article>
      </div>
    </div>
  </section>
);

export default OpenSource;
