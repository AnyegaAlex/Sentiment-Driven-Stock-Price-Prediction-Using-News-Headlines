import { Link } from 'react-router-dom';

const CTASection = () => (
  <section className="border-t border-gray-800 bg-black px-4 py-20 sm:px-6 lg:px-16">
    <div className="mx-auto max-w-4xl text-center">
      <h2 className="mb-5 text-3xl font-bold text-white sm:text-5xl">Start with the evidence</h2>
      <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-gray-400 sm:text-lg">
        Create an account to explore the workspace, or inspect the code and API documentation before you begin.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to="/signup"
          className="inline-flex min-h-[48px] min-w-[180px] items-center justify-center rounded-md bg-white px-7 py-3 font-semibold text-black transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        >
          Create an account
        </Link>
        <a
          href="https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[48px] min-w-[180px] items-center justify-center rounded-md border border-gray-600 px-7 py-3 font-semibold text-white transition-colors hover:border-white hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        >
          Explore GitHub
        </a>
      </div>
      <p className="mt-8 text-sm text-gray-500">
        Provider-backed data features are subject to access configuration and provider permissions.
      </p>
    </div>
  </section>
);

export default CTASection;
