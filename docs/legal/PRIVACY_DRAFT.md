# Tickflow Intelligence — Privacy Notice (working draft)

**NOT APPROVED FOR PUBLICATION — complete all verification fields and obtain Kenyan legal review.**

Effective date: [insert after approval]

## 1. Who is responsible for your data?

The proposed data controller is Tickflow Capital Limited, company number [confirm], registered office [confirm against current CR12; company records currently state Greenspot Garden, Eastern Bypass, Ruiru, Kiambu County, Kenya].

Privacy contact: legal@tickflowcapital.com (activate, test and assign an owner before publication).

ODPC registration status/certificate: [confirm whether registration is required and provide the certificate or documented exemption analysis].

## 2. Personal data we may collect

Confirm against the production database and logs. Expected categories include:

- account identifiers and contact details, such as username and email address;
- authentication, verification, security and account-recovery records;
- account preferences, watchlists, saved settings and user-generated inputs;
- API/provider configuration supplied by a user, if enabled, including whether the secret is stored or encrypted;
- technical and usage information, such as timestamps, device/browser information, request identifiers and error diagnostics. Error diagnostics may include exception messages, stack traces, route and request metadata, and limited performance telemetry processed by Sentry. Confirm the exact fields against the deployed SDK and Sentry settings before publication;
- consent and communication-preference records, including weekly digest opt-in and unsubscribe timestamps;
- analytics and cookie identifiers, only where the applicable consent choice permits their use.

Do not include a category unless it is actually collected. State which fields are mandatory, which are optional and what happens if a user does not provide a mandatory field.

## 3. Why and on what basis we process data

Map each actual processing purpose to a lawful basis before publication. Expected purposes may include:

| Purpose | Proposed basis — confirm with counsel |
|---|---|
| Create and maintain an account and provide requested features | Contract or steps requested before contract |
| Authenticate users, prevent abuse and secure the Service | Legitimate interests and/or legal obligation |
| Respond to support and privacy requests | Contract, legitimate interests or legal obligation |
| Send account, verification, security and legally required notices | Contract and/or legal obligation |
| Send optional weekly engagement digests | Consent; disabled by default and withdrawable through settings or the unsubscribe link |
| Measure product usage using non-essential analytics | Consent where required; analytics must remain disabled until consent |
| Maintain audit records and investigate security incidents | Legitimate interests and/or legal obligation, with a documented retention period |

Do not treat acceptance of these Terms or acknowledgement of this Notice as blanket consent to unrelated processing.

## 4. Who receives personal data?

The production processor inventory must be completed from the actual account settings and contracts. Current candidates are:

- Neon — PostgreSQL database; company states the project is in Singapore.
- Render — backend hosting; repository blueprint specifies Singapore, production configuration still to be verified.
- Vercel — frontend hosting; inspected production deployment region is iad1 (US East).
- Google Analytics 4 — consent-gated website analytics; account processing region and retention setting must be verified.
- Brevo — transactional email via HTTPS API; account region and retention must be verified.
- Sentry — error monitoring. The organisation dashboard shows the EU data region; Sentry identifies Frankfurt, Germany as the EU event-data location. The current Developer plan is documented as retaining event data for 30 days. Sentry states that some data may be stored outside the selected region in the US; the exact categories must be confirmed against its data-location documentation. Confirm the current subscription, DPA, subprocessors and actual production SDK configuration before publication.
- Cloudflare — DNS and inbound Email Routing; exact processing and retention details must be verified.
- S3-compatible storage — database backups; bucket provider and region must be identified.
- Market-data and other API providers — list each provider that receives requests, identifiers, user-supplied API keys or other personal data: [complete from production data-flow audit].

For each processor, document its legal entity, role, processing location, sub-processors, DPA, retention and deletion behavior.

## 5. International transfers

Some providers may process data outside Kenya. Sentry's event data is stored in its EU region (Frankfurt, Germany), with backups within the EU. Sentry also states that some data may be stored outside the selected region in the US; confirm the exact categories against its data-location documentation. Other providers may process data in Singapore, the United States or additional regions. Do not publish a generic assurance that every transfer is protected.

Before publication, complete a transfer register identifying each recipient, country/region, purpose, data categories, transfer justification, safeguards and contract. Maintain the documentation required by applicable Kenyan law and ODPC guidance. Assess whether a DPIA is required for any high-risk processing.

## 6. Retention

The intended application policy is:

- account deletion grace period: 30 days after a user requests deletion;
- application audit logs: 90 days;
- database backup objects: 30 days;
- Sentry error events: 30 days on the Developer plan according to Sentry's current plan guidance; verify the live subscription and terms before publication;
- provider-side logs, analytics, email and other error-monitoring records: [verify each provider's actual retention setting and contract].

These are intended periods, not a statement that production jobs have already been configured. Publish them only after production schedules and provider settings have been verified.

## 7. Your rights

Subject to applicable law and its conditions, data subjects may have rights to be informed, access personal data, request correction, object to processing and request deletion or other relief. Requests may be sent to legal@tickflowcapital.com once the inbox is operational.

A data subject may also lodge a complaint with the Office of the Data Protection Commissioner in Kenya.

## 8. Cookies and analytics

Essential storage required for authentication and security is distinguished from non-essential analytics. Google Analytics 4 is configured in the production frontend and the application code gates its script and page-view events on affirmative analytics consent. No Vercel Analytics component is currently mounted in source; verify whether Vercel Web Analytics is separately enabled in the Vercel dashboard before listing it as a processor.

## 9. Security

Describe only safeguards verified in the production environment. The final notice should accurately cover access control, encryption in transit and at rest, secret handling, logging, incident response, backups and processor safeguards. Do not make blanket claims that are not evidenced.

## 10. Optional weekly digest

The weekly digest is optional and off by default. It is sent only after an affirmative opt-in. Each digest includes an unsubscribe link. Turning off the digest does not disable necessary account, verification, security or legal notices.

## 11. Changes and contact

We may update this Notice when processing changes. Material changes will be communicated as required by law.

Privacy contact: legal@tickflowcapital.com (must be activated and monitored).

Registered office and company registration details must be confirmed before publication.
