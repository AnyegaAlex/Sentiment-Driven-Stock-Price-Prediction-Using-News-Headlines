import { Link } from 'react-router-dom';

const Hero = () => (
  <section className="bg-black px-4 pb-20 pt-28 text-white sm:px-6 lg:px-16 lg:pb-24">
    <div className="mx-auto max-w-5xl text-center">
      <p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-gray-400">
        Open-source stock research workspace
      </p>
      <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
        Research stocks with
        <span className="block text-gray-300">more context, less guesswork.</span>
      </h1>
      <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-300 sm:text-lg">
        Explore stock analysis, technical indicators and news context in one workspace.
        See what data is available, understand its limitations, and inspect the code behind the platform.
      </p>

      <div className="mx-auto mb-10 max-w-3xl rounded-lg border border-gray-800 bg-gray-900/70 px-4 py-3 text-left text-sm text-gray-300">
        <span className="font-semibold text-white">Data availability:</span>{' '}
        Some market-data and news-backed features are currently restricted while provider access and permissions are being finalized.
        The workspace will identify unavailable data rather than presenting it as a live result.
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to="/signup"
          className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-white px-7 py-3 font-semibold text-black transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Create an account
        </Link>
        <a
          href="https://github.com/AnyegaAlex/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-gray-600 px-7 py-3 font-semibold text-white transition-colors hover:border-white hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Explore the source
        </a>
      </div>
    </div>
  </section>
);

export default Hero;
