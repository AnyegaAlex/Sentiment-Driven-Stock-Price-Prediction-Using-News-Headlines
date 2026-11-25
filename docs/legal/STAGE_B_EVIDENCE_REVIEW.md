# GAP-03 Stage B: Legal and Privacy Evidence Review

**Review date:** 25 November 2026  
**Scope:** TickFlow Intelligence hosted application at `https://intelligence.tickflowcapital.com`  
**Status:** Evidence review in progress. These pages are drafts, not approved legal instruments. No effective dates or canonical hashes are set.

## Executive result

Stage B has established several source-backed facts and corrected two implementation/configuration inconsistencies. It is **not ready for legal acceptance enforcement or publication**. Production processor/region details, retention/deletion behavior, recurring-email consent, legal contact monitoring, company-document confirmation and counsel review remain open.

## Confirmed from repository / implementation

| Topic | Evidence | Finding |
|---|---|---|
| Entity | Existing Terms/Privacy source and prior company records supplied by the owner | Tickflow Capital Limited; registration `PVT-6Y1YWM6V`. Registered office recorded as Greenspot Garden, Eastern Bypass, Ruiru, Kiambu County, Kenya. This is the address now reflected in both draft pages; reconcile against the current CR12 before publication. |
| Product scope | `frontend/src/pages/Terms.jsx`, `Privacy.jsx` | The pages are scoped to the hosted TickFlow Intelligence app, not the corporate website or TIES. The Terms acceptance paragraph now distinguishes agreement to the Terms from acknowledgement of the Privacy Policy; a privacy-notice acknowledgement is not blanket consent to all processing. |
| Email delivery | Django `settings.py`; `render.yaml`; `authentication/utils.py` | Configured transactional mail path is Brevo SMTP (`smtp-relay.brevo.com`) using `BREVO_SMTP_KEY`. Legacy SendGrid health-check code exists but is not the configured mail-delivery path. |
| Frontend analytics | `ConsentManager.jsx`, `utils/analytics.js`, `App.jsx` | Google Analytics 4 is requested only after affirmative analytics preference. Vercel Analytics is conditionally mounted by `ConsentManager` after consent. An additional unconditional `<Analytics />` in `App.jsx` contradicted the draft; it has been removed. URL query strings and fragments are stripped from Vercel Analytics events. |
| Sentry | `frontend/src/sentry.js`; backend `settings.py` and `sentry_config.py` | Frontend `sendDefaultPii` is false and request scrubbing runs in `beforeSend`. Backend `SENTRY_SEND_PII` defaults false. Actual production DSN, project settings, retention and event payloads still require account-side verification. |
| Verification codes | `authentication/utils.py`; `authentication/views.py` | Signup email codes are keyed-hash cached with a 10-minute TTL. Email-change codes were cached in plaintext; this has been corrected to use the same keyed digest and constant-time comparison. |
| Account deletion | `authentication/views.py` | A request deactivates the account and sets a 30-day scheduled deletion timestamp. Cancellation is supported during the grace period. No permanent deletion job was found in this repository, so the 30-day timestamp is not evidence that records are actually purged after 30 days. |
| Audit logs | `authentication/management/commands/cleanup_audit_logs.py` | A cleanup command defaults to 90 days, but the production schedule and successful execution are not established by the repository. |
| Backups | `scripts/backup_db.py` | The script's default 30-day cleanup applies to local backup files. It does not delete old S3 objects. Actual production backup policy and provider-managed backups are unknown. |
| Passwords | Django custom user model and registration/change-password serializers | Passwords use Django's password-hashing API (`set_password`); no plaintext password storage was identified. |
| Payment data | Frontend/backend source search | No Stripe, PayPal, payment-intent or checkout implementation was found in the reviewed source. Confirm against any external billing or provider account before making an absolute public claim. |
| Source licence | Root `LICENSE` | Repository source is MIT licensed, copyright 2026 Anyega Alex Kamau. This does not establish that Tickflow Capital Limited owns the code or has a written licence/assignment to operate and sublicense it. |

## Corrections made during Stage B

1. Removed the unconditional Vercel Analytics component from `frontend/src/App.jsx`; `ConsentManager` is now the sole mount point and only renders it when analytics consent is true.
2. Added consent tests to assert Vercel Analytics is absent before a choice and after rejection, and present after acceptance with the URL-scrubbing callback.
3. Changed email-change OTP cache storage from plaintext to the existing user-bound HMAC-SHA256 digest, compared with `hmac.compare_digest`.
4. Updated the email-change test fixture and added a regression test proving the cached value is the keyed digest, not the OTP.
5. Corrected backend `.env.example` to document Brevo rather than SendGrid and set `SENTRY_SEND_PII=false`, matching the settings default.
6. Replaced the registered-office placeholders in the two draft pages with the owner-supplied company-record address above. A current CR12 should still be used as the final documentary check.
7. Updated the Privacy draft's processor inventory to distinguish Brevo from legacy SendGrid code and to avoid representing Neon as a confirmed active production database processor.
8. Replaced the inaccurate “confirm marketing email is never sent” note with a factual reviewer warning: the weekly digest is sent to verified users with `weekly_digest=true`, and that preference currently defaults to true.

## Open publication blockers

### Corporate and contact details

- Obtain or inspect a current CR12 / company record to confirm the registered office exactly, including any postal address if one is required in the notice.
- Verify that `legal@tickflowcapital.com` and `privacy@tickflowcapital.com` exist, are monitored, have an assigned owner, and have a process for acknowledging and resolving requests. The source code cannot prove mailbox monitoring.
- Confirm the public contact address and whether separate legal/privacy mailboxes should remain.

### Product and regulatory wording

- Kenyan counsel must assess the actual feature set and distribution of model outputs before approving the “not investment advice / not a recommendation” language and the unlicensed-status statement. Do not rely on the draft's disclaimer as a legal conclusion.
- Confirm the hosted app's current product description and whether any outputs could reasonably be understood as recommendations, rankings, signals or personalized advice.
- Confirm the written IP assignment/licence between Anyega Alex Kamau and Tickflow Capital Limited. MIT licensing alone does not transfer ownership of the repository copyright.
- Decide notice periods for material changes, suspension/termination notice and appeals, liability limits, governing law and dispute forum with Kenyan counsel.

### Data inventory and processors

- Verify the live production database provider and region from Render's current service/environment configuration. The repository manifest contains a Neon comment, but the former Neon project was deleted and source code does not prove the currently connected database provider.
- Verify the live Render web service and Redis deployment regions, Vercel hosting region/configuration, Brevo account/data region, and Sentry organization/project region and settings.
- Confirm which market/news providers are actually enabled in production. Source code contains Finnhub, Alpha Vantage, RapidAPI/Yahoo Finance, Twelve Data and `yfinance` integrations; configured runtime keys and actual traffic determine which are active. The Privacy draft now names the primary API integrations but intentionally leaves activation and provider-side retention unconfirmed.
- Inspect production Sentry event samples and backend log payloads. `sendDefaultPii=false` is not proof that custom contexts, exception messages, breadcrumbs or application logs contain no personal data.
- Confirm whether any external analytics, customer support, CRM, fraud or billing services are connected outside the repository.

### Email and consent

- Decide the lawful basis and consent standard for weekly digest emails. Current `UserPreferences.weekly_digest` defaults to true and the digest command sends engagement summaries to verified users. The current source does not demonstrate a separate explicit marketing opt-in or a clear unsubscribe link in the digest.
- Decide whether weekly digest is optional marketing/engagement email or an essential service message. If optional, implement a genuine opt-in default, withdrawal/unsubscribe path and suppression enforcement before representing it as consent-based.
- Verify whether price/news alerts and other notification preferences trigger emails, and ensure the policy distinguishes operational/security emails from optional communications.

### Retention, deletion and rights handling

- Implement and test a permanent account/data deletion workflow for accounts whose 30-day grace period expires, or change the account-deletion promise. The current code only schedules deactivation/deletion; no purge job was found.
- Define retention by data class: account/profile/preferences, API-key metadata, usage/symbol history, audit logs, security logs, legal acceptance records, support correspondence, cache entries and backups.
- Verify and schedule the existing 90-day audit-log cleanup if that is the intended retention period. Do not promise 90 days until the production schedule is proven.
- Define retention and deletion for Render/Redis cache, Sentry, Vercel, Brevo and provider-side logs.
- Define backup retention for local and remote/S3 backups. The local cleanup code does not clean S3 objects.
- Resolve GAP-04 for Terms acceptance and Privacy acknowledgement records after account deletion. Their foreign keys use `SET_NULL`; retention must have a documented purpose, access control and period.
- Establish the data-subject request workflow, identity checks, response ownership and statutory timelines. The page's generic promise is not evidence that the process is operational.

### Security and incident response

- Confirm the breach-response owner, escalation process, affected-person/regulator assessment and notification workflow against applicable Kenyan law.
- Verify current Sentry and logging redaction in production. The backend's `SENTRY_SEND_PII` default is false, but the deployment environment may override it.
- Verify processor contracts/data-processing terms and cross-border transfer safeguards for each active provider before listing transfer arrangements.

## External corporate-site material checked

The corporate site's legal/privacy pages and compliance statement are separate from the hosted-app policy and must not be silently copied into it. The corporate privacy page publicly lists Ruiru, Kiambu, Kenya, while the company-record address supplied for this review is more specific. A current CR12 remains the primary check for the registered office. The official Kenyan company-search description says a CR12 confirms the registered office address.

## Release decision

**Do not set `LEGAL_ACCEPTANCE_ENFORCEMENT_ENABLED=true` or `VITE_LEGAL_ACCEPTANCE_ENABLED=true`. Do not assign effective dates, versions or SHA-256 hashes yet.** The draft pages still contain unresolved legal-review notes, and the retention/email/processor decisions above materially affect what users are being asked to accept or acknowledge.

## Kenyan data-protection research checkpoints (25 November 2026)

This is a compliance checklist for Kenyan counsel, not a legal opinion.

- **Data protection registration:** ODPC's published FAQ states that Section 18 and the 2021 Registration Regulations require public and private organisations/individuals processing personal data to register, and describes registration tiers. Obtain Tickflow Capital Limited's current ODPC data-controller registration certificate or written advice on the applicable registration position before publishing a compliance statement. Source: [ODPC FAQs](https://www.odpc.go.ke/faqs/).
- **Collection notice:** Section 29 of the Data Protection Act requires notice, before collection where practicable, of data collection, purposes, data-subject rights, recipients/transfers and safeguards, controller/processor contacts, security measures, whether collection is legally required or voluntary, and consequences of not providing requested data. The Privacy draft needs a final field-by-field completeness check against the actual signup/profile flows. Source: [Data Protection Act, 2019, section 29](https://sheria.net/legislation/akn/ke/act/2019/24/section/29).
- **Cross-border processing:** ODPC's 2026 cross-border guidance calls for identifying destination jurisdictions and documenting the applicable transfer basis, necessity, safeguards and written legal instrument/data-processing terms. Do not publish a generic claim that transfers are protected until each active processor's country, contract and safeguards are verified. Sources: [ODPC 2026 Cross-border Guidance](https://odpc.go.ke/wp-content/uploads/2026/09/ODPC-%E2%80%93-Guidance-Notes-for-Cross-border-Data-Transfers.pdf) and [ODPC Guidance Notes for Data Protection Policies](https://odpc.go.ke/wp-content/uploads/2026/07/ODPC-%E2%80%93-Guidance-Note-for-Data-Protection-Policies.pdf).
- **Data-processing policy:** ODPC's 2026 guidance expects the policy to describe third-party/controller/processor relationships and cross-border safeguards. The hosted-app Privacy Policy should identify the actual processors and not rely on a generic “service providers” statement where providers are known.

### Additional legal decisions to confirm

- Obtain Tickflow Capital Limited's ODPC registration certificate and verify its scope/validity and whether any separate processor registration is required for the company's actual activities.
- Map every signup/profile field to purpose, lawful basis, whether required/optional, recipient and consequence if omitted, as required for the collection notice.
- Determine whether a Data Protection Officer is required or should be appointed based on the actual processing activities and current statutory criteria.
- Confirm whether a DPIA is required for any high-risk processing, including profiling/automated analysis, and document the assessment where applicable.
- For every active provider, obtain the applicable data-processing terms and confirm country/region, onward transfers, deletion/return, security, breach notice and audit terms.
