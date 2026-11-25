import { Link } from 'react-router-dom';
import { ArrowLeft, Radar } from 'lucide-react';

const DraftNotice = () => (
  <aside
    role="note"
    className="mb-8 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-100"
  >
    <p className="font-semibold">Draft for review. Not yet effective.</p>
    <p className="mt-1 text-amber-100/80">
      This document is not legal advice and must be reviewed by a Kenyan lawyer before publication.
      Items marked for confirmation are intentionally unresolved.
    </p>
  </aside>
);

const Terms = () => (
  <main className="min-h-screen bg-black text-gray-300">
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link
        to="/"
        className="mb-6 inline-flex items-center text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-gray-800 p-2">
          <Radar className="h-8 w-8 text-gray-400" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
          <p className="mt-1 text-sm text-gray-500">TickFlow Intelligence hosted app</p>
        </div>
      </header>

      <DraftNotice />

      <div className="space-y-8 leading-7">
        <section>
          <p className="text-sm text-gray-500">Last updated: Draft for review | 25 November 2026</p>
          <p className="mt-3">
            <strong className="text-gray-200">Provider:</strong> Tickflow Capital Limited,
            registration PVT-6Y1YWM6V, Nairobi, Kenya.
            Registered office: <strong className="text-gray-200">Greenspot Garden, Eastern Bypass, Ruiru, Kiambu County, Kenya.</strong>
          </p>
          <p className="mt-2">
            These Terms apply to the hosted TickFlow Intelligence app at{' '}
            <a className="underline hover:text-white" href="https://intelligence.tickflowcapital.com">
              intelligence.tickflowcapital.com
            </a>
            . They do not govern tickflowcapital.com or the TIES platform.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">1. Acceptance</h2>
          <p>
            By creating an account, you agree to these Terms. The Privacy Policy is a notice that
            explains how personal data is handled; acknowledging that notice does not, by itself,
            constitute consent to every processing activity. Where consent is required, we will
            request it separately. If you do not agree to these Terms, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">2. What the Service provides</h2>
          <p>
            The Service provides market analysis produced by machine-learning models, including an
            LSTM price model and FinBERT sentiment analysis, together with news aggregation. Outputs
            are for information and education only. <strong className="text-white">They are not
            financial, investment, tax or legal advice, and are not recommendations to buy, sell or
            hold any security.</strong>
          </p>
          <p className="mt-2">
            Tickflow Capital Limited is not a licensed investment adviser, fund manager or regulated
            financial institution under the Capital Markets Authority of Kenya or any other
            financial regulator. This statement must be reviewed by Kenyan counsel against the
            actual activities and regulatory status of the Service before publication.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">3. Eligibility and accounts</h2>
          <p>
            You must be at least 18 years old and legally able to enter into a binding contract.
            Keep your credentials confidential and notify us promptly if you become aware of
            unauthorised access to your account.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">4. Acceptable use</h2>
          <p>You must not:</p>
          <ul className="mt-2 list-disc space-y-2 pl-6">
            <li>use the Service in breach of any law or market-conduct rule;</li>
            <li>scrape, overload or bypass rate limits or access controls;</li>
            <li>share your account or resell the Service&apos;s data or output without a written licence;</li>
            <li>access another user&apos;s data or interfere with the operation or security of the Service.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">5. Your decisions and risk</h2>
          <p>
            Trading and investing involve substantial risk of loss. Models and data can be wrong,
            incomplete, delayed or unavailable. Past performance and model accuracy do not predict
            future results. You are solely responsible for decisions you make. Consider consulting
            a suitably licensed adviser before acting on information provided by the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">6. Third-party data</h2>
          <p>
            Market and news data may come from third-party providers. We do not guarantee the
            accuracy, completeness or timeliness of third-party data. Providers may change,
            restrict or withdraw access, which may affect the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">7. Intellectual property and open source</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li><strong className="text-gray-200">Source code:</strong> The public source code in the repository is licensed under the MIT License, copyright Anyega Alex Kamau. That licence governs the code covered by the repository&apos;s licence; it does not by itself grant rights to the hosted Service, its data or its operation.</li>
            <li><strong className="text-gray-200">Hosted Service:</strong> The hosted Service, its data and its operation are provided by Tickflow Capital Limited under these Terms, subject to third-party rights and the applicable open-source licences.</li>
            <li><strong className="text-gray-200">Names and marks:</strong> The names TickFlow, TickFlow Intelligence and Tickflow Capital, and their logos, are not licensed under the MIT License. They may not be used without written permission.</li>
            <li><strong className="text-gray-200">Your content:</strong> You retain ownership of content you submit. You grant us a limited licence to host, store, process and display that content as needed to provide and secure the Service.</li>
          </ul>
          <p className="mt-3 rounded-lg border border-amber-700/40 bg-amber-950/20 p-3 text-amber-100">
            <strong>Ownership review required:</strong> The repository identifies Anyega Alex Kamau
            as copyright holder. The rights and any assignment or licence between Anyega Alex Kamau
            and Tickflow Capital Limited must be documented in writing. These Terms do not claim
            that the company owns or may relicense code it does not own or control.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">8. Availability and changes</h2>
          <p>
            We aim to keep the Service available but do not guarantee uninterrupted access. We may
            change, suspend or discontinue features. The draft notice period for material changes is
            <strong className="text-amber-200"> [confirm whether 14 days]</strong>, except where a
            change must take effect sooner to comply with law or protect the Service and its users.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">9. Termination</h2>
          <p>
            You may request deletion of your account at any time using the account controls provided
            in the Service or by contacting us. We may suspend or terminate access for a breach of
            these Terms or where reasonably necessary to protect the Service or other users.
          </p>
          <p className="mt-2 text-amber-200">[Specify notice, exceptions and any account-appeal process before publication.]</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">10. Disclaimers and liability</h2>
          <p>
            The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties to
            the extent permitted by law. To the maximum extent permitted by law, Tickflow Capital
            Limited is not liable for indirect or consequential loss, lost profits, or losses arising
            from decisions made using the Service.
          </p>
          <p className="mt-2 text-amber-200">
            [Insert a liability cap or calculation method. Have Kenyan counsel review the exclusions
            and cap for enforceability and any non-excludable liability.]
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">11. Governing law and disputes</h2>
          <p>
            These Terms are intended to be governed by the laws of Kenya, with disputes heard by the
            courts of Nairobi, subject to applicable law.
          </p>
          <p className="mt-2 text-amber-200">[Confirm governing law and jurisdiction with Kenyan counsel.]</p>
        </section>

        <section className="border-t border-gray-800 pt-6">
          <h2 className="mb-3 text-xl font-semibold text-white">12. Contact</h2>
          <p>
            Legal enquiries: <a className="underline hover:text-white" href="mailto:legal@tickflowcapital.com">legal@tickflowcapital.com</a>.
          </p>
          <p className="mt-2 text-amber-200">[Confirm this legal mailbox is monitored before publication.]</p>
        </section>
      </div>
    </div>
  </main>
);

export default Terms;
