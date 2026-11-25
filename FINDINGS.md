# FINDINGS.md

Flat audit findings for source baseline 881c7c54d8756257f5220d7e74d6a1ea6ebdd72e, branch fix/frontend-domain-analytics-consent-2026-11-24. Findings are sorted by severity. Line references are relative to that SHA. Live observations are separately identified because the production SHA is unknown.

## Critical

### F-01 — Production dependency graph contains critical/high advisories
- **Severity:** Critical
- **Evidence:** frontend/package-lock.json; npm audit --omit=dev output: 23 production dependency vulnerabilities, including 1 critical and 13 high. Full audit: 41 total, including 1 critical, 20 high, 15 moderate and 5 low.
- **Impact:** Known vulnerable packages are present in the production dependency graph. Audit output alone does not prove exploitability or runtime reachability, but a critical advisory in production dependencies must be resolved or formally assessed before release.
- **Recommended fix:** Update affected direct/transitive packages to patched compatible versions; regenerate lockfile; rerun npm audit, tests and build; document any accepted exception with package path and reachability evidence.
- **Blocks launch:** Yes, pending remediation or a documented security exception.

### F-02 — Database backup implementation is not operational
- **Severity:** Critical
- **Evidence:** sentiment_driven_stock_price_prediction_engine/scripts/backup_db.py:L1-L115; Dockerfile:L1-L110; .github/workflows/db_maintenance.yml.
- **Impact:** The backup file is not under an installed app's management/commands path and has no direct executable entry point. It targets localhost rather than the configured database host, names output .sql.gz without compressing it, depends on pg_dump which is not installed in the Docker image, has no scheduled workflow invocation, and has no restore counterpart/test. S3 upload errors do not establish a successful backup. Production data recovery is therefore unproven.
- **Recommended fix:** Implement a supported backup command using the configured DATABASE_URL host, install/pin the required client tool, produce a correctly compressed/encrypted artifact, upload to a verified private target, schedule it, alert on failure, define retention, and test restore into an isolated database.
- **Blocks launch:** Yes for a production system holding user/customer data.

### F-03 — Account deletion grace period is not implemented end to end
- **Severity:** Critical
- **Evidence:** authentication/views.py:L1260-L1405; authentication/urls.py; frontend/src/App.jsx:L220-L366; authentication/models.py.
- **Impact:** Delete-account marks the account inactive immediately and sets a scheduled date. The cancellation view requires IsAuthenticated, but the account is already inactive. No public token-based cancellation route or frontend cancel-deletion route exists. No scheduled worker was found to perform final deletion after the grace period. Data can remain indefinitely while the user is unable to use the advertised cancellation path.
- **Recommended fix:** Define a complete deletion state machine. Keep recovery access separate from normal login, use a purpose-bound signed cancellation token, implement a scheduled final-delete worker with auditable results, define backup deletion behaviour, and test the full lifecycle.
- **Blocks launch:** Yes for any product or policy promising account deletion and a 30-day recovery period.

## High

### F-04 — Terms/privacy acceptance is not recorded or enforced
- **Severity:** High
- **Evidence:** frontend/src/pages/Terms.jsx; frontend/src/pages/Privacy.jsx; authentication/models.py; authentication/serializers.py; authentication/views.py; settings.py:L108-L124.
- **Impact:** The legal pages are display routes. No LegalAcceptance model, accepted document version/hash, registration acceptance field, server-side gate or legal-specific 403 path was found. Existing users and API-key creation are not gated.
- **Recommended fix:** Decide the required acceptance model with counsel. Persist user, document identifier, version/hash, timestamp and acceptance source. Enforce at registration and at protected API entry when a material version changes. Add re-acceptance and rollback tests.
- **Blocks launch:** Yes if account creation or service use is conditioned on accepting these terms.

### F-05 — No age/date-of-birth gate backs the 18+ statement
- **Severity:** High
- **Evidence:** authentication/models.py; authentication/serializers.py; authentication/views.py; frontend/src/pages/Terms.jsx.
- **Impact:** The reviewed Terms page states an age threshold, but the registration/model path contains no date-of-birth field or age validation. A statement in legal copy is not an implemented age control.
- **Recommended fix:** Confirm the intended eligibility policy with counsel, then implement proportionate age verification and server-side enforcement or remove the unsupported claim.
- **Blocks launch:** Yes if the product is restricted to adults.

### F-06 — Vercel Analytics bypasses the local consent manager
- **Severity:** High
- **Evidence:** frontend/src/App.jsx:L373-L395; frontend/src/components/consent/ConsentManager.jsx; frontend/src/pages/Privacy.jsx.
- **Impact:** Vercel Analytics is mounted unconditionally while Google Analytics is inserted only after consent. If the Privacy page promises opt-in analytics, the application behaviour conflicts with that statement.
- **Recommended fix:** Gate Vercel Analytics behind the same consent state or revise the policy only after a documented legal/privacy review. Test first visit, reject, accept, withdrawal and returning sessions.
- **Blocks launch:** Yes where opt-in consent is promised or required.

### F-07 — JWT refresh rotation is incompatible with client token persistence
- **Severity:** High
- **Evidence:** settings.py:L282-L290; frontend/src/services/client.js; frontend/src/hooks/useAuthState.js.
- **Impact:** Backend rotates refresh tokens and blacklists the old token. The frontend interceptor stores the returned access token but does not persist the new refresh token. A later refresh may submit the blacklisted token and force reauthentication.
- **Recommended fix:** Persist the rotated refresh token atomically with the access token, or move refresh credentials to a secure HttpOnly cookie/BFF design. Add concurrent-refresh and expired-session tests.
- **Blocks launch:** Yes for reliable long-lived authenticated sessions.

### F-08 — Frontend logout calls a backend route that does not exist
- **Severity:** High
- **Evidence:** frontend/src/hooks/useAuthState.js; frontend/src/services/client.js; authentication/urls.py; authentication/views.py.
- **Impact:** The client attempts POST /api/v1/auth/logout/, but no matching backend route/view is registered. Clearing browser state does not revoke the refresh token server-side.
- **Recommended fix:** Implement a logout endpoint that validates and blacklists the submitted refresh token, clears the client state, and handles expired/replayed tokens idempotently. Add route and integration tests.
- **Blocks launch:** Yes if the product claims server-side logout/session revocation.

### F-09 — APIKeyAuthentication fallback queries the wrong model field
- **Severity:** High
- **Evidence:** authentication/authentication.py:L149-L195; authentication/models.py:L422-L515; authentication/middleware.py:L145-L210.
- **Impact:** UserAPIKey defines key_hash. The authentication class's direct database fallback filters on hashed_key. A cache miss or path that does not populate the middleware cache can fail authentication.
- **Recommended fix:** Use the single canonical key_hash field and a shared lookup helper. Test cache hit, cache miss, revoked key, expired key, malformed key and multiple workers.
- **Blocks launch:** Yes for external API-key authentication.

### F-10 — API keys have no scopes or endpoint-specific authorisation
- **Severity:** High
- **Evidence:** authentication/models.py:L422-L515; authentication/views.py API-key create/list/revoke views; authentication/middleware.py.
- **Impact:** An accepted API key represents its owning user for IsAuthenticated endpoints. No scope/role/permission field limits what a key can access. Compromise of one key can therefore expose the user's broad authenticated API surface.
- **Recommended fix:** Add explicit scopes and enforce them per endpoint, display scopes at creation, default to least privilege, and support rotation/revocation audit.
- **Blocks launch:** Yes before third-party API-key distribution.

### F-11 — SendGrid client construction uses an unsupported timeout argument
- **Severity:** High
- **Evidence:** authentication/utils.py:L219-L285; tests/authentication/test_email_utils.py; installed SendGrid SDK in the tested environment.
- **Impact:** SendGridAPIClient is constructed with timeout=10. The installed SDK constructor rejects that keyword, causing the primary send path to raise TypeError and enter fallback handling.
- **Recommended fix:** Configure timeout through the SDK-supported HTTP client/request configuration, pin the SDK version, and add an integration test against the supported SDK constructor.
- **Blocks launch:** Yes for transactional email flows.

### F-12 — Email delivery is synchronous and has no durable outbox
- **Severity:** High
- **Evidence:** authentication/utils.py:L219-L285; settings.py:L293-L314; authentication/views.py registration/verification/reset paths.
- **Impact:** Email is sent in request handling. If Brevo credentials are absent, the configured console backend can report a local write rather than delivery to the recipient. No durable outbox, delivery ledger, bounce webhook or scheduled retry worker was found.
- **Recommended fix:** Use a durable outbox and worker or a provider API call with bounded timeout, explicit status tracking, idempotency and retries. Verify production sender credentials and delivery with a non-customer test account.
- **Blocks launch:** Yes for account verification and password-reset delivery.

### F-13 — News ingestion workflow does not enable the command's feature flag
- **Severity:** High
- **Evidence:** news/management/commands/fetch_news.py; settings.py:L538-L547; .github/workflows/data_pipeline.yml.
- **Impact:** NEWS_INGESTION_ENABLED defaults false. The scheduled workflow invokes the command without setting the flag, so the workflow can run successfully while ingestion remains disabled.
- **Recommended fix:** Set and validate the flag in the intended environment, make the command report an explicit skipped/disabled status, and verify a scheduled run writes a known row with provider provenance.
- **Blocks launch:** Yes if the product advertises scheduled/fresh news ingestion.

### F-14 — Prediction generation workflow does not enable the command's feature flag
- **Severity:** High
- **Evidence:** stocks/management/commands/generate_predictions.py; settings.py prediction settings; .github/workflows/prediction_pipeline.yml.
- **Impact:** Prediction generation is disabled by default. The workflow's pipeline flag does not match the backend setting checked by the command, so scheduled prediction generation can be a no-op.
- **Recommended fix:** Align one canonical flag name between workflow and backend, fail the workflow when generation is skipped unexpectedly, and verify prediction rows and run metadata.
- **Blocks launch:** Yes if the product advertises automated predictions.

### F-15 — LSTM training pipeline does not preserve temporal target construction or evaluate the held-out test set
- **Severity:** High
- **Evidence:** training/train_pipeline.py:L70-L205; stocks/lstm_predictor.py.
- **Impact:** The training script samples rows before constructing next-row targets, so adjacent sampled rows are not guaranteed to be adjacent trading observations. The LSTM input sequence length is one timestep, and the test dataframe is defined but not used for final evaluation. Accuracy/performance claims from this pipeline are not independently reproducible.
- **Recommended fix:** Sort and preserve the full time series, construct targets before any sampling, split chronologically before fitting transforms, use a genuine sequence window, evaluate the untouched test period, compare baselines, and record data/model versions.
- **Blocks launch:** Yes for public predictive-performance claims or a production model release.

### F-16 — Live unauthenticated API behaviour does not match the audited source middleware gate
- **Severity:** High
- **Evidence:** settings.py:L108-L124; authentication/middleware.py:L28-L72; live probes in ARCHITECTURE.md §16.5.
- **Impact:** Source middleware does not include /api/v1/news/ or /api/v1/performance/ in its public allowlist. Live unauthenticated requests to news/symbol-search returned 200 and news/get-news/performance returned 503 rather than the expected middleware 401. The deployed SHA is not exposed. A proxy-injected credential or different deployed code/configuration cannot be ruled out.
- **Recommended fix:** Expose the deployed commit SHA in a protected health/build-info endpoint, compare production settings with the audited branch, inspect Cloudflare transformations, and add unauthenticated integration tests against the actual deployment.
- **Blocks launch:** Yes until the production authentication boundary is explained.

### F-17 — Entrypoint continues after a migration failure
- **Severity:** High
- **Evidence:** sentiment_driven_stock_price_prediction_engine/entrypoint.sh:L30-L69.
- **Impact:** Migration execution is retried, but the second failure is suppressed and the script proceeds to static collection/Gunicorn. The service can start with an outdated or incompatible schema.
- **Recommended fix:** Make migration failure terminate the entrypoint with non-zero status. Separate migration job from web startup if needed, and add deploy-time migration checks and smoke tests.
- **Blocks launch:** Yes for safe production deployment.

### F-18 — Stock-analysis lastUpdated is request time, not source-data time
- **Severity:** High
- **Evidence:** stocks/views.py:L354-L465; live GET /api/v1/stock-analysis/?symbol=AAPL output in ARCHITECTURE.md §16.5.
- **Impact:** The response can contain disabled/null market fields while returning a current lastUpdated timestamp. A client can mistake request time for market-data freshness.
- **Recommended fix:** Return provider/data-vintage timestamps from the underlying data record. If unavailable, return null and an explicit unavailable/stale status. Do not use server request time as a market-data timestamp.
- **Blocks launch:** Yes if the UI labels lastUpdated as data freshness.

### F-19 — Legacy plaintext User.api_key field remains in the user model
- **Severity:** High
- **Evidence:** authentication/models.py:L124-L185; authentication/serializers.py.
- **Impact:** The User model contains a legacy plaintext API-key field separate from the hashed UserAPIKey table. A database read or admin/debug exposure can disclose the raw legacy credential.
- **Recommended fix:** Identify whether any active client still uses the field, migrate/revoke existing values, remove it from the model and serializers, and verify no compatibility path depends on it.
- **Blocks launch:** Yes if populated legacy credentials remain valid.

### F-20 — VITE_DEMO_PASSWORD is a client-bundle value if configured
- **Severity:** High
- **Evidence:** frontend/src/pages/Login.jsx; frontend/src/components/auth/LoginForm.jsx; frontend/vite.config.js.
- **Impact:** Vite exposes VITE_ variables to browser code. Any configured demo password is recoverable from the compiled bundle and cannot be treated as a server secret.
- **Recommended fix:** Do not place a privileged credential in VITE_ variables. Use a restricted demo account with no access to personal data, or remove client-side demo login. Verify the deployed bundle and rotate any credential that was treated as secret.
- **Blocks launch:** Yes if the value grants access to a privileged account.

### F-21 — VITE_PUBLIC_API_KEY is a public credential, not a secret
- **Severity:** High
- **Evidence:** frontend/src/services/client.js; frontend/.env references; Vite build configuration.
- **Impact:** The key is embedded in browser requests/bundle. Anyone can extract and replay it. It is a TickFlow platform API key, not user BYOK.
- **Recommended fix:** Treat it as public and restrict its scopes/quotas, or remove it from the client. Do not rely on obscurity.
- **Blocks launch:** Yes if it grants broad access or is relied on as a secret.

### F-22 — Request and email logging include personal identifiers
- **Severity:** High
- **Evidence:** authentication/middleware.py:L306-L430; authentication/utils.py:L219-L285; authentication/views.py.
- **Impact:** Request logs include IP/user identity/user-agent context; email helper logs recipient addresses and provider exception text. This conflicts with any absolute claim that logs never contain personal data.
- **Recommended fix:** Define an explicit log schema, hash/truncate identifiers where possible, remove email addresses and provider response bodies from routine logs, sanitise control characters, and test log output with synthetic PII.
- **Blocks launch:** Yes if the published privacy statement promises no personal data in logs/events.

### F-23 — Sentry PII configuration is inconsistent across defaults and example environment
- **Severity:** High
- **Evidence:** settings.py:L493-L516; sentry_config.py; sentiment_driven_stock_price_prediction_engine/.env.example.
- **Impact:** Settings default SENTRY_SEND_PII to false, while the tracked environment example sets it true. The backend scrubber is selective. Operators can enable PII capture by copying the example without understanding the consequence.
- **Recommended fix:** Set the example to false, document every field sent, test before_send with synthetic headers/body/email values, and require explicit approval for any PII-enabled environment.
- **Blocks launch:** Yes if PII capture is enabled without approved disclosure/controls.

## Medium

### F-24 — Live Redis is not configured; LocMemCache is process-local
- **Severity:** Medium
- **Evidence:** settings.py:L367-L399; health/views.py; live health output in ARCHITECTURE.md §16.5.
- **Impact:** Live health reports memory cache and Redis not configured. Cache-backed throttles, verification codes and API-key lookup state are not shared across multiple application instances. The current Render entrypoint starts one Gunicorn worker, but horizontal scaling would split state.
- **Recommended fix:** Configure a shared Redis service before scaling beyond one instance. Add readiness checks and tests for cross-instance verification/throttle behaviour.
- **Blocks launch:** No for the observed single-instance setup; yes before horizontal scaling.

### F-25 — Rate-limit response headers use incorrect cache-key formats
- **Severity:** Medium
- **Evidence:** authentication/middleware.py:L235-L299; authentication/throttles.py:L25-L113.
- **Impact:** The middleware constructs anonymous and user throttle cache keys that do not match DRF's actual throttle key formats. X-RateLimit remaining/reset values can be wrong even when DRF enforcement itself is active.
- **Recommended fix:** Use the same throttle instances/cache-key methods as DRF or remove the misleading headers. Add tests for anonymous, authenticated and API-key callers.
- **Blocks launch:** No.

### F-26 — Backend test suite has 35 failures
- **Severity:** Medium
- **Evidence:** Backend test command output in ARCHITECTURE.md §16.4; tests include authentication, email, middleware, news, management, observability and URL cases.
- **Impact:** 35 failing tests remain among 725 passing, 12 skipped and 21 xfailed. Coverage is 83.28%, but coverage does not offset failing tests. Individual failures require triage to distinguish code regressions from stale test expectations.
- **Recommended fix:** Triage each failing test, update stale tests only where the current contract is intentional, fix actual defects, and require a green suite in CI.
- **Blocks launch:** Yes until every failure has an explained disposition.

### F-27 — Frontend lint reports 248 errors and 20 warnings
- **Severity:** Medium
- **Evidence:** frontend package lint script; npm run lint output; frontend/src/components/settings/DeveloperTab.jsx.
- **Impact:** Static analysis is not clean. The Developer Settings component includes an undefined activeKey reference. Other lint errors may conceal additional runtime defects.
- **Recommended fix:** Fix activeKey and triage all lint errors; do not suppress rules globally. Add lint to CI.
- **Blocks launch:** Yes for affected Developer Settings path; otherwise release gate should require agreed lint baseline.

### F-28 — OpenAPI schema generation emits warnings
- **Severity:** Medium
- **Evidence:** manage.py check --deploy output; DRF Spectacular settings in settings.py; serializers/views.
- **Impact:** Schema generation reports 24 warnings, including unresolved/ambiguous serializer or operation metadata. External API documentation and generated clients may be incomplete or misleading.
- **Recommended fix:** Correct serializer type hints, operation IDs, response schemas and deprecated/legacy routes. Add schema generation validation to CI.
- **Blocks launch:** No, but blocks treating generated OpenAPI as authoritative until clean.

### F-29 — Sentiment model attribution differs between runtime configuration and legal attribution page
- **Severity:** Medium
- **Evidence:** settings.py:L521-L536; news/utils.py; training/train_pipeline.py; docs/wiki/13.3-Data-Attribution.md.
- **Impact:** Effective FINBERT_CONFIG uses ProsusAI/finbert, while the reviewed attribution page names a DistilBERT model. Runtime code comments/defaults also retain DistilBERT wording. This creates attribution and reproducibility ambiguity.
- **Recommended fix:** Document the exact model identifier and revision used in production, align training/inference, identify the model license and update attribution only after verification.
- **Blocks launch:** Yes for public model attribution/performance claims until reconciled.

### F-30 — Root MIT license and wiki license statement conflict
- **Severity:** Medium
- **Evidence:** LICENSE:L1-L20; docs/wiki/13.1-License.md.
- **Impact:** Root license names Anyega Alex Kamau and contains MIT terms. Wiki page names Tickflow Capital Ltd and Anyega Alex Kamau and describes additional restrictions/patent language not present in the root file.
- **Recommended fix:** Decide the actual rights holder and licensing model with counsel, then make root LICENSE, wiki and any NOTICE consistent. Do not add restrictions to an MIT-labelled project without a deliberate license change.
- **Blocks launch:** Yes for public licensing claims until corrected.

### F-31 — Cloudflare network-layer classification is not substantiated by contract evidence
- **Severity:** Medium
- **Evidence:** frontend/src/pages/Privacy.jsx; live API HEAD response in ARCHITECTURE.md §16.5.
- **Impact:** The Privacy page explicitly excludes Cloudflare from its app-processor list because it classifies Cloudflare as a network-layer provider. Live headers show API traffic passes through Cloudflare. Whether the contractual processing role justifies this classification cannot be established from source or response headers.
- **Recommended fix:** Confirm the Cloudflare account, service terms and data-processing role with the provider and counsel. Keep the disclosure classification explicitly unverified until supported by contract evidence.
- **Blocks launch:** Yes if the processor list is intended to be exhaustive; otherwise requires counsel confirmation.

### F-32 — Subscription endpoint has no unsubscribe or delivery workflow
- **Severity:** Medium
- **Evidence:** stocks/views.py subscription view; stocks/models.py Subscription; stocks/urls.py; frontend/src/pages/Settings.jsx.
- **Impact:** The endpoint stores an email address. No unsubscribe endpoint, confirmation workflow or scheduled digest delivery was found. It must not be represented as a functioning notification/weekly-summary service.
- **Recommended fix:** Either remove notification promises or implement confirmed subscription, unsubscribe, preference and delivery records with suppression handling.
- **Blocks launch:** Yes if subscriptions or email notifications are marketed.

### F-33 — Retention/cleanup commands are not scheduled
- **Severity:** Medium
- **Evidence:** authentication/management/commands/cleanup_audit_logs.py; cleanup_sessions.py; cleanup_api_keys.py; delete_unverified_users.py; .github/workflows/*.yml.
- **Impact:** Cleanup commands exist, but inspected workflows do not invoke audit-log cleanup, session cleanup, expired-key cleanup or unverified-user deletion. A command's default retention is not proof of an active retention policy.
- **Recommended fix:** Define retention per table, schedule the relevant commands, emit run metrics/failure alerts and test actual row deletion in a disposable database.
- **Blocks launch:** Yes for retention promises that rely on these jobs.

### F-34 — Render manifest and observed production configuration do not align
- **Severity:** Medium
- **Evidence:** sentiment_driven_stock_price_prediction_engine/render.yaml; settings.py:L293-L314, L367-L399; live health and response headers in ARCHITECTURE.md §16.5.
- **Impact:** Manifest names service trading-algo and declares a Redis resource; live API hostname and health response identify a Render origin with Redis not configured. Manifest provides SendGrid key but not the Brevo key required for the SMTP fallback. The deployed service identity and environment are unverified.
- **Recommended fix:** Reconcile Render dashboard with the manifest, use one canonical service identity, confirm actual database/cache/email settings and record the deployed SHA.
- **Blocks launch:** No, but deployment runbook is not reliable until reconciled.

### F-35 — No Content-Security-Policy configuration was found
- **Severity:** Medium
- **Evidence:** settings.py security-header section; frontend/vercel.json; search output in ARCHITECTURE.md §16.6.
- **Impact:** The reviewed application configuration sets several security headers but does not define a CSP. A CSP can reduce the impact of script injection and constrain external resource loading.
- **Recommended fix:** Design a report-only CSP from actual script/connect/image/font sources, validate in production, then enforce with an explicit nonce/hash strategy.
- **Blocks launch:** No.

### F-36 — refresh_stock_cache checks one cache key and writes another
- **Severity:** Medium
- **Evidence:** stocks/management/commands/refresh_stock_cache.py:L23-L105.
- **Impact:** The command checks a stock-analysis cache key but writes a technical-cache key. Repeated runs can miss the cache it intended to warm and report misleading cache status.
- **Recommended fix:** Align the cache key read/write contract and add a command test that verifies the exact key used by the stock-analysis view.
- **Blocks launch:** No.

### F-37 — DeveloperTab references undefined activeKey
- **Severity:** Medium
- **Evidence:** frontend/src/components/settings/DeveloperTab.jsx around line 523; npm run lint output.
- **Impact:** Undefined activeKey can cause the Developer Settings API-key panel to fail at runtime or render incorrectly.
- **Recommended fix:** Derive the selected key from component state/props, add a component test for empty and populated key lists, and verify key creation/revocation UX.
- **Blocks launch:** Yes for the Developer Settings API-key path.

### F-38 — No active Celery worker or task queue exists
- **Severity:** Medium
- **Evidence:** requirements.txt; celery_app.py; news/tasks.py; stocks/tasks.py; settings.py:L83-L106; workflow inventory.
- **Impact:** celery_app.py imports Celery, but Celery is not in requirements, project startup does not import the app, app tasks.py files are empty and no broker/worker/queue/dead-letter configuration exists. Async behaviour must not be claimed.
- **Recommended fix:** Either remove the dormant Celery module and document GitHub Actions as the only scheduler, or implement/pin/configure a real worker and broker with retries and monitoring.
- **Blocks launch:** No for current synchronous site; yes for any advertised queue/worker capability.

### F-39 — BYOK, risk-disclosure, NOTICE and legal JSON artefacts are absent
- **Severity:** Medium
- **Evidence:** tracked path inventory and legal-artefact search in ARCHITECTURE.md §16.6; authentication models/views; frontend settings routes.
- **Impact:** The requested BYOK addendum, risk-disclosure document, NOTICE and legal JSON artefacts were not found. The existing Developer API key feature is not provider BYOK.
- **Recommended fix:** Create only the legal documents the business actually needs, obtain counsel review, and align each claim to implemented controls. Do not claim BYOK until provider credentials are safely stored and proxied.
- **Blocks launch:** Yes where those documents/capabilities are claimed.

### F-40 — Model and dataset licence/provenance are not established
- **Severity:** Medium
- **Evidence:** tracked model/data artifacts; training/train_pipeline.py; news/utils.py; docs/wiki/13.3-Data-Attribution.md; no per-artifact license file found.
- **Impact:** Model weights and a dataset are committed, but their source, version, licence, redistribution permission and consent/provenance are not documented in the inspected tree.
- **Recommended fix:** Record dataset source, collection method, terms, model identifier/revision, licence, attribution and redistribution status. Remove artifacts that cannot lawfully be distributed.
- **Blocks launch:** Yes before distributing model/data artifacts or making claims based on them.

### F-41 — Production deployment SHA is not observable
- **Severity:** Medium
- **Evidence:** health/views.py; live GET /api/v1/health/ response and HEAD headers in ARCHITECTURE.md §16.5.
- **Impact:** Health/readiness response and observed headers do not identify the running commit/build. A source audit cannot be tied to the production instance.
- **Recommended fix:** Expose a non-secret build SHA/version from the build environment, include it in health metadata and Sentry release, and record it in deployment workflow output.
- **Blocks launch:** Yes for an audit that claims production behaviour is running the reviewed source.

### F-42 — Provider terms and data redistribution rights are unverified
- **Severity:** Medium
- **Evidence:** settings.py provider configuration; stocks/opinion_generator.py; stocks/utils.py; news/views.py; news/services/providers.py; no provider agreements/ToS in tracked tree.
- **Impact:** Code can call market-data providers, but source does not establish account plans, display/redistribution rights, derived-data terms or commercial permissions. Public price/news access is disabled by default.
- **Recommended fix:** Obtain and archive authoritative provider terms/account confirmations, map each endpoint/output to permitted use, and keep public access disabled until approved.
- **Blocks launch:** Yes for public market-data display/redistribution.

### F-43 — No automated alerting or incident notification integration was found
- **Severity:** Medium
- **Evidence:** .github/workflows/*.yml; settings.py; dependency/configuration search in ARCHITECTURE.md §16.6.
- **Impact:** Sentry and health endpoints exist, but no PagerDuty, Slack, Prometheus, Grafana, Loki or UptimeRobot integration was found. Failed scheduled jobs or silent data staleness may not reach an operator.
- **Recommended fix:** Define actionable alerts for deployment failure, stale ingestion, provider failure, email failure, backup failure and auth/security anomalies. Test delivery.
- **Blocks launch:** No, but production operations remain weakly observable.

### F-44 — No data export endpoint was found
- **Severity:** Medium
- **Evidence:** authentication/urls.py; authentication/views.py; frontend/src/pages/Settings.jsx; model inventory.
- **Impact:** The user-facing settings/API surface does not provide a verified export of profile, preferences, watchlist, API-key metadata, audit data or other user-associated records.
- **Recommended fix:** Decide export scope and implement an authenticated, auditable export with safe serialization and expiry. Align the Privacy page with the implemented capability.
- **Blocks launch:** Yes if the product promises user data portability/export.

### F-45 — Frontend service worker file is not proven to be registered
- **Severity:** Low
- **Evidence:** frontend/public/sw.js; frontend/src/main.jsx; frontend/src/App.jsx.
- **Impact:** A service-worker file exists, but no registration call was found in the inspected frontend entrypoint. Offline/cache behaviour described elsewhere would not be established by this file alone.
- **Recommended fix:** Either register and test the service worker with explicit cache/version rules or remove stale file and any offline claims.
- **Blocks launch:** No.


### F-46 — LSTM/opinion endpoints return persisted predictions rather than generating a new opinion
- **Severity:** High
- **Evidence:** stocks/views.py:L216-L262 and L582-L704; stocks/management/commands/generate_predictions.py:L1-L120; stocks/opinion_generator.py:L903-L943; stocks/models.py:L5-L206.
- **Impact:** The LSTM prediction and stock-opinion views read existing Prediction rows. The generate_stock_opinion function exists but no active view caller was found, and no StockOpinion model write was found in the inspected runtime source. The scheduled generation command is disabled by default and the workflow does not enable its checked flag. An endpoint response can therefore be a historical stored prediction rather than a newly generated opinion.
- **Recommended fix:** Either wire a tested generation path into the endpoint with explicit data/licensing gates and persistence, or rename/document the endpoint as a stored-prediction read. Add tests proving whether a request invokes inference or reads an existing row.
- **Blocks launch:** Yes if on-demand AI opinion generation is advertised.
