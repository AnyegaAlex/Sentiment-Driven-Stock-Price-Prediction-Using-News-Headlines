# Stage B: Legal and privacy publication evidence review

**Status:** Remediation in progress. Not approved for publication.
**Review date:** 25 November 2026
**Repository branch:** feat/stage-b-publication-blockers-gap03-2026-11-25
**Production changes:** None. No migration, deployment, commit, push, PR or merge has been performed.

This register separates code evidence, account configuration evidence and legal decisions. A source-code change does not prove that the corresponding production job or provider setting is active.

## 1. Publication blockers

| Area | Current evidence | Status | Required closure evidence |
|---|---|---|---|
| Weekly digest | Existing default was enabled. Remediation changes the default to off, adds opt-in/unsubscribe timestamps, records preference changes, disables legacy default-on subscriptions in a migration, and adds an unsubscribe route to digest emails. | Code implemented; migration not deployed | Apply migration after approval; test the deployed settings flow and unsubscribe link; verify no legacy user is mailed without a recorded opt-in. |
| Account deletion | Existing application scheduled deletion after 30 days but had no permanent purge worker. Remediation adds purge_scheduled_accounts; cancellation now uses a signed email link that works while the account is inactive. | Code implemented; schedule not verified | Deploy migration/code; configure and verify a daily job; inspect successful run logs and test a real deletion lifecycle. |
| Audit logs | A 90-day cleanup command exists. Remediation adds run_retention_maintenance, which runs account purging and audit cleanup independently. User-linked audit logs are removed when the account is purged to avoid leaving IP/email details behind. Terms acceptance and Privacy Notice acknowledgement rows remain with the user foreign key set to null; these rows currently contain version, content hash and timestamp only, but their retention basis and period still need legal approval. | Code implemented; schedule not verified | Configure and verify the production schedule and a successful run. |
| Backups | Existing script used localhost, wrote a .sql.gz file without actually compressing the dump, silently swallowed S3 upload errors and did not expire old S3 objects. Remediation adds a Django backup_db command using the configured PostgreSQL host, gzip compression, S3 expiry including object versions, and visible failures. | Code implemented; production storage and schedule unverified | Confirm Neon direct (non-pooler) backup URL, S3 bucket, region, credentials, encryption, versioning and lifecycle; run a production backup and restore test; verify schedule and logs. |
| Database | The company has stated that the database is Neon in Singapore. render.yaml also specifies Singapore for the Render service. The actual production DATABASE_URL and Neon project settings have not been inspected. | User-provided/configuration evidence only | Verify the production Neon project, branch, region, backup/PITR settings and Render connection without exposing credentials. |
| Render | Live Render account inspection confirms the production backend service is Tickflow-Capital-Intelligence-Backend, branch master, Singapore region, Free plan, one instance, with auto-deploy disabled. Latest live deploy is commit 6edf5820fe48913f1e0fc32695f48a075aa72e12 from 24 November 2026. Staging is also Singapore/Free and uses branch staging. The Render account contains no Postgres instance, consistent with Neon being external. Only these two web services are listed; no Cron Job service exists. The live service environment-variable values are not exposed by the connected read-only service inspection. | Pending account verification | Configure and verify one daily Cron Job for python manage.py run_daily_maintenance; no job currently exists. Verify the live service's required env-key presence and values through the Render dashboard, without copying secrets into this report. No workspace-plan upgrade is assumed. Approve the Cron Job's usage-based compute and $1/month minimum charge before creation. |
| Vercel | The inspected production frontend deployment is READY in iad1 (US East). Production has a GA4 measurement ID, and the source loads Google Analytics only after analytics consent. Earlier environment inspection found frontend Sentry variables scoped to Preview, not Production. Sentry now shows frontend project events, so their originating deployment (Preview, older production build or another environment) remains unverified. No Vercel Analytics component is currently mounted in source. The project also contains a production SECRET_KEY variable and unused VITE_API_KEY, VITE_ALPHA_VANTAGE_KEY and VITE_RAPIDAPI_KEY entries; none are referenced by the frontend source. | Deployment region verified; production env hygiene needs review | Verify Vercel production Sentry DSN and release/environment variables; verify dashboard-level Vercel Analytics is not separately enabled; remove the unused SECRET_KEY and stale API-key variables after confirming they are not used by any build integration; rotate the backend secret if the Vercel SECRET_KEY is the same value. Confirm Vercel DPA, analytics region/retention and sub-processors. |
| Brevo | Source remediation uses the Brevo transactional HTTP API over HTTPS, not SMTP. The Brevo API key and sender identity have not been inspected in the production account. | Code aligned; account settings pending | Verify API key is configured in Render, sender identity/domain authentication, account region, DPA, retention and suppression/unsubscribe behavior. |
| Sentry | Read-only account inspection confirms two active projects (Django backend and React frontend), EU organisation region, Developer plan, and 30-day event retention per Sentry plan documentation. Both projects allow all domains (`*`). Organisation-level Require Data Scrubber, Require Default Scrubbers, Prevent Storing IP Addresses and Require 2FA are disabled. Existing custom scrubbing is limited to email replacement in `$message`; custom sensitive fields include email, username and selected financial-profile fields. SDK code review found explicit user/request context and development traffic paths. Stage B worktree now removes structured user identity, IP/device fields, request query strings and bodies, disables profiling by default, and disables local development reporting unless explicitly enabled with a separate DSN. | Account inspected; code fixes prepared; live settings and deployment pending | Approve enabling required/default data scrubbers and IP storage prevention; restrict frontend Allowed Domains to the verified production origin; confirm all members can comply before enforcing 2FA; verify active Render/Vercel DSNs, release/environment labels, DPA, subprocessors and deployed code. |
| Cloudflare | Email Routing is enabled. `info@tickflowcapital.com` is active and forwards to the verified Gmail destination; no emails were received in the last 7 days. `legal@tickflowcapital.com` does not exist yet. Catch-all is disabled. The root SPF record currently authorises Cloudflare Email Routing only; Brevo DKIM/sender authentication still needs verification. DMARC is currently p=none and reports to dmarc-reports@tickflowcapital.com; mailbox ownership and report delivery have not been verified. | DNS and info@ route verified; legal@ pending | Create and test legal@ to the existing verified forwarding destination; verify delivery and assign a response owner. Keep info@ active for verification and general correspondence. Inspect Brevo's exact SPF/DKIM instructions in its authenticated domain screen before changing DNS; do not guess a DKIM selector or add a second SPF record. |
| Legal contact | `legal@tickflowcapital.com` has not yet been set up. `info@tickflowcapital.com` exists and forwards to the verified destination. Existing legal JSON uses the incorrect tickflow.com domain. | Blocked | Create and test legal@ through Cloudflare Email Routing, designate a responsible person, and verify the existing info@ route remains operational. |
| Intellectual property | LICENSE is MIT and currently names Anyega Alex Kamau. The repository is under the personal GitHub account AnyegaAlex. No signed company assignment or KECOBO recordal evidence has been supplied. | Blocked | Execute an economic-rights assignment; lodge it with KECOBO and obtain the certificate of recordal/Assignment Register entry; transfer repository administration to a company-controlled GitHub organisation. |
| ODPC | Tickflow Capital Limited's data-handler registration position/certificate has not been verified. | Blocked | Confirm whether registration is required for the company's processing activities and size/sector; retain the certificate or documented exemption analysis. |
| Registered office | Company records previously supplied state Greenspot Garden, Eastern Bypass, Ruiru, Kiambu County, Kenya. A current CR12 has not been checked in this review. | Pending documentary check | Verify the registered office and legal company name against a current CR12/company search before publishing. |

## 2. Provider and transfer inventory

| Provider | Known role | Region evidence | Contract/retention evidence |
|---|---|---|---|
| Neon | Production PostgreSQL (as stated by the company) | Singapore (company-provided; verify project console) | DPA, backup/PITR, retention and subprocessor list pending |
| Render | Backend hosting | Production and staging services verified in Singapore; both are Free plan | DPA, logs retention, backup and subprocessor details pending |
| Vercel | Frontend hosting | Production deployment iad1 (US East); no Vercel Analytics component found in source | DPA, deployment/log retention and subprocessors pending |
| Google Analytics 4 | Website analytics, gated by the application's analytics-consent choice | Google account processing region not verified | Google data-processing terms, account retention, advertising features and subprocessors pending |
| Brevo | Transactional email via HTTPS API | Account-specific region not verified | DPA, retention, sender authentication and subprocessors pending |
| Sentry | Error monitoring, if production DSN is configured | Project region not verified | DPA, event retention, PII scrubbing and subprocessors pending |
| Cloudflare | DNS and inbound Email Routing | Global service; exact processing region not verified | Email Routing terms, retention and subprocessors pending |
| S3-compatible backup storage | Database backup objects | Bucket region not supplied | Bucket owner, region, encryption, versioning, lifecycle, DPA and access controls pending |

Do not publish a generic statement that all international transfers are protected until actual recipient locations, transfer purposes, transfer records and safeguards have been documented. The ODPC's 2026 cross-border guidance requires transfer documentation and demonstrable safeguards.

## 3. Current legal-page defects

The existing frontend/src/legal/documents/terms.json and privacy.json are not ready for publication:

- They use legal@tickflow.com and privacy@tickflow.com, not the intended company domain.
- The privacy notice does not adequately identify all processors, transfer destinations, safeguards, retention periods or the mandatory/voluntary status and consequences of requested data.
- It does not accurately distinguish essential account/security email from optional weekly digest email.
- The terms overstate that all content and code are MIT-licensed.
- The terms and privacy notice need the complete legal entity name and documentary confirmation of the registered office.
- The legal pages must be reconciled with actual production provider configuration and deployed retention jobs before legal acceptance is enabled.

Drafts are kept separately in this folder. The public JSON documents are deliberately not changed or versioned in this remediation pass.

## 4. Kenyan compliance checkpoints

1. Section 29 of the Data Protection Act requires a collection notice covering the data collected, purposes, data-subject rights, recipients and safeguards, controller/processor contacts, and whether provision is voluntary or mandatory and the consequences of not providing it.
2. Cross-border transfers require a documented recipient, justification, description of transferred data and safeguards. Maintain the transfer register and assess whether a DPIA is required.
3. ODPC's current FAQ describes an exemption only where BOTH annual turnover/revenue is below KES 5 million AND the organisation has fewer than 10 employees, and the organisation is not processing for a listed non-exempt purpose. The listed purposes include provision of financial services and direct marketing. Confirm Tickflow's actual turnover, employee count and whether this financial-market intelligence service falls within a non-exempt financial-services category; obtain an ODPC/advocate determination and certificate or documented exemption analysis.
4. The company should have a designated owner for privacy requests, incidents, processor reviews and retention verification.

## 5. Release controls

- LEGAL_ACCEPTANCE_ENFORCEMENT_ENABLED remains disabled.
- VITE_LEGAL_ACCEPTANCE_ENABLED remains disabled.
- No production migration has been applied.
- No production deployment has been made.
- No legal document version or SHA-256 acceptance hash has been finalised.
- Do not enable legal acceptance enforcement until the blockers above have documentary evidence and the final legal documents have been reviewed by Kenyan counsel.

## 6. Code verification

- Django system check: passed, no issues.
- Migration consistency check: passed, no model changes pending.
- Focused backend remediation tests: 51 passed, covering weekly digest, Brevo API delivery, deletion/unsubscribe tokens, account purge, audit retention, backup upload/encryption and daily maintenance.
- Frontend production build: passed.
- Frontend tests: 157 passed across 35 test files.
- git diff --check: passed.
- The latest full backend-suite run reported 812 passed, 30 failed, 12 skipped and 21 xfailed (85.37% coverage). Remaining failures are in existing API-key middleware response contracts, news/sentiment tests, chaos tests, stock-cache management tests, observability tests and URL expectations. The log-safety tests now pass after isolating local HTTP requests from the suite-wide requests.get mock. The focused remediation suite passed 51 tests after the final deletion-email rollback and Neon direct-backup-URL changes. The complete backend suite is NOT certified green and needs a separate baseline investigation before release.

## 7. Primary legal references

- Kenya Data Protection Act, 2019, especially sections 26, 29 and 30: https://odpc.go.ke/wp-content/uploads/2024/02/TheDataProtectionAct__No24of2019.pdf
- ODPC Guidance Notes for Cross-border Data Transfers (2026): https://odpc.go.ke/wp-content/uploads/2026/09/ODPC-%E2%80%93-Guidance-Notes-for-Cross-border-Data-Transfers.pdf
- ODPC registration FAQs (including the two-part threshold and non-exempt categories): https://www.odpc.go.ke/faqs/
- Data Protection Act, 2019, section 29 duty to notify: https://odpc.go.ke/wp-content/uploads/2024/02/TheDataProtectionAct__No24of2019.pdf
- Kenya Copyright Act, Cap. 130 (Rev. 2022), especially sections 31–33: https://copyright.go.ke/sites/default/files/downloads/CopyrightAct12of2001.pdf
