import { Link } from 'react-router-dom';

const steps = [
  {
    step: '01',
    title: 'Create your account',
    description: 'Register and sign in to access your research workspace and account settings.',
  },
  {
    step: '02',
    title: 'Choose a ticker',
    description: 'Search by company name or enter a stock symbol directly in the workspace.',
  },
  {
    step: '03',
    title: 'Review available analysis',
    description: 'Explore the analysis modules that are enabled for your account. Price and news features depend on provider access.',
  },
  {
    step: '04',
    title: 'Set your preferences',
    description: 'Choose your investment goal, risk tolerance and experience level to shape how research is presented.',
  },
];

const HowItWorks = () => (
  <section className="border-t border-gray-800 bg-black px-4 py-16 sm:px-6 lg:px-16">
    <div className="mx-auto max-w-6xl">
      <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">Getting started</h2>
      <p className="mx-auto mb-12 max-w-2xl text-center text-gray-400">
        A straightforward path from account setup to reviewing the available research.
      </p>
      <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li key={step.step} className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 font-mono text-sm font-semibold text-white">
              {step.step}
            </span>
            <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
            <p className="text-sm leading-relaxed text-gray-400">{step.description}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 text-center">
        <Link
          to="/signup"
          className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:border-white hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        >
          Create an account
        </Link>
      </div>
    </div>
  </section>
);

export default HowItWorks;
