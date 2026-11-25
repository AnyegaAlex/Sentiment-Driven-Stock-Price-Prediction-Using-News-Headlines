# ARCHITECTURE.md

Authoritative source-based architecture audit for intelligence.tickflowcapital.com.

## 1. Audit Metadata

| Field | Recorded value |
|---|---|
| Audit date | 2026-11-25 |
| Auditor | ChatGPT GPT-6, source-based automated review. This is not an independent penetration test or legal opinion. |
| Application repository | AnyegaAlex/Tickflow-Capital-Intelligence |
| Audited commit | 881c7c54d8756257f5220d7e74d6a1ea6ebdd72e |
| Audited branch | fix/frontend-domain-analytics-consent-2026-11-24 |
| origin/master at audit | fb4741da (short SHA) |
| Branch divergence | 7 commits ahead, 2 behind origin/master |
| Tracked files | 491 |
| Files read or machine-scanned | 352 unique tracked files: 152 backend Python files, 181 frontend JS/TS files, 19 configuration, workflow and legal files |
| Files skipped | 139 tracked files, primarily non-request-path documentation, static assets, vendored JupyterLab files and binary data/model artifacts. Reasons and counts are in §16. |
| Production revision | UNVERIFIED. The live health response does not expose a Git SHA or deployment revision. |

The start-of-audit working tree was not clean. The recorded git status --porcelain output was:

- D plan.md
- M sentiment_driven_stock_price_prediction_engine/authentication/utils.py
- M sentiment_driven_stock_price_prediction_engine/render.yaml
- M sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/settings.py
- M sentiment_driven_stock_price_prediction_engine/tests/authentication/test_email_utils.py

To prevent those local edits from contaminating source conclusions, source inspection and tests were performed against a clean archive of the audited SHA. The five pre-existing working-tree entries were not modified. The audit created documentation files only; it did not change application code, deploy, commit or push.

Live HTTP probes are reported separately from SHA-grounded source facts. They establish observed production behaviour but cannot be attributed to the audited SHA because the deployed SHA is not exposed. Live probes were read-only GET, HEAD and OPTIONS requests. No production login, write, email send, provider transaction or database mutation was attempted.

## 2. System Summary

At the audited SHA, the product consists of a React single-page application built with Vite and routed with React Router, a Django 5.1/DRF API served through Gunicorn, a PostgreSQL connection configured through DATABASE_URL, an optional Redis cache with a LocMemCache fallback, and GitHub Actions workflows used as schedulers and deployment automation. The application has authentication, news, stocks and health Django apps. Market-data calls are made server-side through Finnhub, Alpha Vantage, RapidAPI, Twelve Data and Yahoo Finance code paths; news sentiment uses a locally loaded Hugging Face model; email code attempts SendGrid and falls back to Django email configured for Brevo SMTP or the console backend. Sentry, Google Analytics and Vercel Analytics integrations are present. LSTM model code exists, but the scheduled generation command is flag-gated; the LSTM prediction endpoint reads persisted Prediction rows rather than invoking inference. The stock-opinion generation function has no active view caller in the inspected source. The source does not contain an active Celery worker, task queue, payment processor, LLM integration, OAuth provider, webhook receiver, legal-acceptance gate or user BYOK implementation. In the live probe, the frontend was served by Vercel and the API response passed through Cloudflare to a Render/Gunicorn origin; PostgreSQL was healthy, Redis was reported as not configured, and public price/news endpoints were blocked by licensing flags. The live deployment SHA and database vendor remain unverified. [settings.py:L83-L124, L149-L196, L248-L275, L282-L314, L322-L357, L367-L399, L493-L554; project urls.py:L1-L80; Render and live-probe outputs in §16]

## 3. Component Inventory

| Component | Tier | Responsibility | Source path | Ownership |
|---|---|---|---|---|
| React SPA | Client | Browser application and page composition | frontend/src/App.jsx, frontend/src/main.jsx | TickFlow-owned code |
| React Router | Client | Public, authentication and protected route dispatch | frontend/src/App.jsx:L220-L366 | Third-party library, configured by TickFlow |
| AuthSessionProvider | Client | Browser session and user state | frontend/src/context/AuthSessionProvider.jsx | TickFlow-owned code |
| DashboardProvider | Client | Dashboard and selected-symbol state | frontend/src/context/DashboardContext.jsx | TickFlow-owned code |
| OnboardingProvider | Client | Onboarding state | frontend/src/context/OnboardingContext.jsx | TickFlow-owned code |
| API client | Client | API base URL, request headers, refresh interceptor and error handling | frontend/src/services/client.js | TickFlow-owned code using Axios |
| Route guards | Client | Login, verification and tier checks | frontend/src/components/auth/ProtectedRoute.jsx; HomeRoute.jsx | TickFlow-owned code |
| Consent manager | Client | Browser consent preference and Google Analytics activation | frontend/src/components/consent/ConsentManager.jsx | TickFlow-owned code |
| Vercel Analytics | Client/telemetry | Browser analytics component | frontend/src/App.jsx:L373-L395 | Third-party |
| Google Analytics 4 | Client/telemetry | Browser analytics loaded after consent | frontend/src/components/consent/ConsentManager.jsx | Third-party |
| Vercel hosting/CDN | Edge/client hosting | Serves the production SPA | frontend/vercel.json; live HEAD response | Third-party; project settings not inspected |
| Cloudflare | API edge | Observed proxy in front of API origin | Live API HEAD response; no Cloudflare configuration in repository | Third-party; zone configuration unverified |
| Render | Application hosting | Hosts the Django/Gunicorn API | sentiment_driven_stock_price_prediction_engine/render.yaml; Dockerfile; entrypoint.sh | Third-party; live service settings unverified |
| Gunicorn / WSGI | Application server | Starts the Django WSGI application | sentiment_driven_stock_price_prediction_engine/entrypoint.sh:L59-L69; project wsgi.py | Open-source runtime configured by TickFlow |
| Django / DRF | Application framework | URL routing, middleware, views, serializers, authentication and throttling | settings.py; project urls.py; app modules | Third-party framework, configured by TickFlow |
| authentication app | Domain | Users, preferences, API keys, audit records, authentication views | authentication/models.py; serializers.py; views.py; urls.py | TickFlow-owned code |
| stocks app | Domain | Stock analysis, indicators, predictions and opinion-related code | stocks/models.py; views.py; serializers.py; opinion_generator.py | TickFlow-owned code |
| news app | Domain | News records, symbol search and sentiment ingestion | news/models.py; views.py; services/providers.py; services/ingestion.py | TickFlow-owned code |
| health app | Operations | Health and readiness endpoints | health/views.py; health/urls.py | TickFlow-owned code |
| ml_pipeline directory | Domain/ML | Present in source tree but not installed as a Django app | sentiment_driven_stock_price_prediction_engine/ml_pipeline | TickFlow-owned but not active through INSTALLED_APPS |
| PostgreSQL | Data | Persistent relational data | settings.py:L149-L196; live health response | Database vendor unverified |
| Redis | Cache/session support | Optional shared cache | settings.py:L367-L399 | Third-party; live health says not configured |
| LocMemCache | Cache | Process-local fallback when REDIS_URL is absent | settings.py:L393-L399 | Django framework |
| Django cached_db sessions | Session store | Session data in database with cache layer | settings.py:L365 | Django framework |
| Hugging Face Hub / Transformers | Model dependency | Downloads model/tokenizer artifacts for local sentiment inference | news/utils.py; settings.py:L521-L536 | Third-party |
| Market-data providers | External data | Quote, candle, news and symbol-search inputs | stocks/opinion_generator.py; stocks/utils.py; news/views.py; news/services/providers.py | Third-party |
| SendGrid | Email | Primary email API attempt | authentication/utils.py:L221-L285 | Third-party |
| Brevo SMTP | Email | Django SMTP fallback | settings.py:L293-L314 | Third-party |
| Sentry | Observability | Backend and frontend exception reporting | settings.py:L491-L516; sentry_config.py; frontend/src/sentry.js | Third-party |
| GitHub Actions | Scheduler/deployment | Scheduled commands and deployment workflows | .github/workflows/*.yml | Third-party automation |
| AWS S3 | Backup target | Referenced only by an unintegrated backup script | scripts/backup_db.py | Third-party; no working production backup path verified |

The installed Django applications are django.contrib.admin, auth, contenttypes, sessions, messages, staticfiles, rest_framework, corsheaders, django_redis, drf_spectacular, rest_framework_simplejwt, rest_framework_simplejwt.token_blacklist, authentication, news, stocks and health. The ml_pipeline directory is not in INSTALLED_APPS. No custom permission module, signal module, or active task module was found; the two app tasks.py files are empty. [settings.py:L83-L106; application tree scan in §16]

The React routes defined in App.jsx are /signup, /login, /check-email, /verify-email, /reset-password, /forgot-password, /resend-verification, /privacy, /terms, /unauthorized, /onboarding, /, /dashboard, /dashboard/:symbol, /news-analysis, /prediction-history, /profile, /settings, /advanced-analytics, /admin and *. There is no /cancel-deletion route. [frontend/src/App.jsx:L220-L366]

## 4. Trust Boundaries

1. **Browser to Vercel SPA.** Browser requests cross HTTPS to Vercel-hosted static assets. Vercel project settings, access controls and deployment protection were not inspected. The live response identifies Vercel as the frontend server. [frontend/vercel.json; live HEAD output in §16]
2. **Browser to API edge.** Browser requests cross HTTPS to the API hostname. Live response headers identify Cloudflare in front of a Render/Gunicorn origin. Cloudflare WAF, bot controls, rate limits, caching rules and TLS settings are UNVERIFIED. [live HEAD output in §16]
3. **Cloudflare to Render origin.** This is a managed proxy boundary. Django trusts X-Forwarded-Proto for secure request handling and has SECURE_SSL_REDIRECT enabled outside DEBUG. The actual proxy-hop chain and forwarded-header policy are not inspectable from this repository. [settings.py:L66-L78, L242-L246]
4. **CORS boundary.** Django allows an explicit origin list and disallows wildcard origins. Credentials are allowed by the API CORS configuration. A live preflight from the production frontend received an allow-origin response; an unlisted origin did not. CORS is a browser control, not API authentication. [settings.py:L318-L357; live OPTIONS output in §16]
5. **Django middleware boundary.** The request passes through the ordered middleware stack shown in §11 and diagram 11. The custom APIKeyMiddleware is positioned after Django authentication/session middleware and before DRF view dispatch. [settings.py:L108-L124]
6. **DRF authentication and authorisation boundary.** JWTAuthentication and APIKeyAuthentication are the configured default authentication classes. The global permission default is AllowAny; individual views override it. The custom APIKeyMiddleware adds a separate path-based API-key requirement. No legal acceptance check is present. [settings.py:L248-L275; authentication/middleware.py; authentication/authentication.py]
7. **Application to database.** Django reads DATABASE_URL and requires SSL for PostgreSQL URLs. The live health endpoint reports the database as healthy, but does not identify the vendor. Render YAML comments mention Neon; that comment is not proof of the live provider. [settings.py:L149-L196; render.yaml; live health output in §16]
8. **Application to cache.** REDIS_URL selects django-redis; absent REDIS_URL selects process-local LocMemCache. Live health reports memory cache and Redis not configured. API-key lookup, rate limiting, verification codes, cooldowns and other state use Django cache APIs. [settings.py:L367-L399; authentication/middleware.py; authentication/utils.py; live health output in §16]
9. **Application to market-data providers.** Provider credentials are loaded from server environment settings. Finnhub and Alpha Vantage keys are placed in query parameters in relevant calls; RapidAPI uses a request header; Twelve Data uses a provider request parameter. Requests leave the application boundary over HTTPS. Provider account rights and redistribution permissions are UNVERIFIED. [settings.py:L538-L556; stocks/opinion_generator.py; news/views.py; news/services/providers.py]
10. **Application to email providers.** Email recipients and message bodies leave the application through SendGrid or Brevo SMTP. If Brevo credentials are absent, Django uses the console backend. Email calls occur synchronously in request-triggered flows; there is no outbox or worker queue. [authentication/utils.py:L221-L285; settings.py:L293-L314]
11. **Application to Hugging Face Hub.** Model and tokenizer artifacts are downloaded from the Hub and inference runs locally through Transformers. No active request-path call to a hosted LLM inference API was found. [news/utils.py:L80-L130; settings.py:L521-L536]
12. **Application to Sentry.** Exceptions and selected request context can cross to Sentry when a DSN is configured. The backend before_send scrubber is limited; it does not establish that every sensitive header or body is removed. [settings.py:L491-L516; sentry_config.py]
13. **Browser to analytics services.** Google Analytics activation is consent-controlled in ConsentManager. The Vercel Analytics component is mounted unconditionally by App.jsx, so it is not gated by that consent manager. [frontend/src/App.jsx:L373-L395; frontend/src/components/consent/ConsentManager.jsx]
14. **GitHub Actions to hosting providers.** Workflow secrets are consumed by deployment workflows to call Render/Vercel and related services. Secret values were not read or printed. GitHub organization/repository secret controls are outside repository evidence. [.github/workflows/deploy.yml]
15. **Backup script to S3.** A script references AWS credentials and an S3 bucket, but it is not a discoverable management command, is not scheduled, and has implementation defects. No operational S3 backup boundary was verified. [scripts/backup_db.py]
16. **Legal/consent boundary.** Terms and Privacy pages are client routes. No acceptance record, accepted-document version/hash, server-side legal middleware, age field or legal 403 gate was found. The legal boundary is therefore not enforced by the application. [frontend/src/pages/Terms.jsx; frontend/src/pages/Privacy.jsx; authentication/models.py; authentication/serializers.py; authentication/views.py]

## 5. Data Flows

### 5.1 Registration, verification, login and JWT

**Sequence diagram:** docs/diagrams/05-auth-jwt-sequence.mermaid

- Entry: the React signup page calls the API client and POSTs to /api/v1/auth/register/.
- Transformation: RegisterSerializer validates and creates the user; registration also creates related preference/audit data.
- External call: email is rendered and sent synchronously through send_email_sync. The configured primary SendGrid client call passes a timeout keyword that is incompatible with the installed SendGrid SDK path; fallback behaviour is described in §8 and §14.
- Persistence: user and related records are stored in PostgreSQL. Email verification code digests and resend state are stored in Django cache with explicit TTLs.
- Verification: POST /api/v1/auth/verify-email/ validates the code/token, updates the verified state and issues JWT credentials.
- Login: POST /api/v1/auth/login/ authenticates a verified user and returns access/refresh tokens.
- Authenticated request: browser sends Authorization: Bearer with the access token.
- Refresh: the backend rotates refresh tokens and blacklists the old token. The frontend interceptor stores the returned access token but does not persist the rotated refresh token, so a later refresh can submit the already-blacklisted token.
- Logout: frontend code calls /api/v1/auth/logout/, but no matching backend URL/view is registered. The browser clears local state; server-side refresh-token revocation is not implemented by that route.
- Legal gate: no acceptance gate is applied at registration or login. [authentication/urls.py; authentication/views.py; authentication/serializers.py; authentication/utils.py:L173-L190, L303-L307; settings.py:L282-L290; frontend/src/services/client.js; frontend/src/hooks/useAuthState.js]

### 5.2 API-key creation, use and revocation

**Sequence diagram:** docs/diagrams/06-auth-apikey-sequence.mermaid

- Entry: authenticated user POSTs to /api/v1/auth/api-keys/.
- Transformation: application generates a random key, stores a SHA-256 digest in UserAPIKey.key_hash and returns the raw key once.
- Persistence: key hash, name, active state and optional expiry are stored in the database. The legacy User.api_key field is a separate plaintext field and is not the same key store.
- Request: client supplies X-API-Key. APIKeyMiddleware hashes the supplied value, looks up key_hash and caches the key record ID for five minutes.
- DRF authentication: APIKeyAuthentication first checks the lookup cache. Its direct database fallback filters on hashed_key, while the model field is key_hash. That mismatch can fail on a cache miss.
- Authorisation: no API-key scope/permission field is defined; an accepted key is treated as an authenticated user for IsAuthenticated endpoints.
- Revocation: DELETE /api/v1/auth/api-keys/{id}/ marks the key inactive.
- Legal gate: none. [authentication/models.py:L124-L185, L422-L515; authentication/middleware.py:L145-L210; authentication/authentication.py:L149-L195; authentication/views.py; authentication/urls.py]

### 5.3 Legal acceptance and consent

**Sequence diagram:** docs/diagrams/07-legal-acceptance-sequence.mermaid

- Entry: browser can navigate to /terms and /privacy; signup and settings surfaces link to these pages.
- Transformation: the client stores an analytics consent choice locally for browser behaviour.
- Persistence: no LegalAcceptance or ConsentRecord model was found. The server does not receive a document version/hash acceptance record.
- Existing users: no middleware or permission gate checks acceptance before protected API use.
- API keys: creation does not require terms acceptance.
- Rollback/re-acceptance: no server-side acceptance version migration or rollback path exists.
- Age gate: no date-of-birth/age field or server validation was found.
- Result: the legal documents are display surfaces, not an enforceable server-side acceptance workflow. [frontend/src/pages/Terms.jsx; frontend/src/pages/Privacy.jsx; frontend/src/components/consent/ConsentManager.jsx; authentication/models.py; authentication/serializers.py; authentication/views.py]

### 5.4 Market-data and stock-analysis flow

**Sequence diagram:** docs/diagrams/08-data-flow-market-data.mermaid

- Entry: browser requests /api/v1/stock-analysis/ or /api/v1/technical-indicators/ with a symbol.
- Gate: PRICE_DATA_PUBLIC_ACCESS defaults false. The live API returned a successful stock-analysis envelope with market-data fields disabled/null and returned HTTP 503 for technical indicators.
- Provider calls when enabled: technical analysis code can call Finnhub, Twelve Data, Alpha Vantage and Yahoo Finance/RapidAPI. Keys are server-side environment settings; symbols and provider parameters are sent to the provider.
- Transformation: provider responses are parsed into quote/candle/technical data and cached. No synthetic market-price series is created when the required price data is unavailable.
- Persistence: stock and prediction records are read from PostgreSQL; cache entries are written to Django cache.
- Response: stock-analysis returns an envelope even when data is disabled. The source sets lastUpdated from the current request time rather than the market-data timestamp, so it is not a data-freshness measurement.
- Redistribution: NEWS_PUBLIC_ACCESS and PRICE_DATA_PUBLIC_ACCESS default false. Provider contracts and redistribution rights were not reviewed; no right to redistribute is asserted here. [settings.py:L538-L556; stocks/views.py:L354-L465; stocks/opinion_generator.py; stocks/utils.py; live probes in §16]

### 5.5 News ingestion and read flow

**Sequence diagram:** docs/diagrams/08-data-flow-market-data.mermaid

- Scheduled entry: GitHub Actions invokes the fetch_news management command.
- Gate: fetch_news checks NEWS_INGESTION_ENABLED, which defaults false. The inspected data-pipeline workflow does not set that variable.
- Provider calls: news provider clients make HTTP requests to configured providers; provider results are normalised.
- Sentiment: Transformers loads the configured ProsusAI/finbert model for local sentiment inference.
- Persistence: ProcessedNews rows are written to PostgreSQL.
- Read path: GET /api/v1/news/get-news/ reads stored rows; it does not force a provider refresh. The refresh query parameter is deprecated/ignored.
- Public access: NEWS_PUBLIC_ACCESS defaults false; live news read returned HTTP 503.
- No user-facing promise of live provider refresh or scheduled news delivery is supported by this code path. [news/management/commands/fetch_news.py; news/services/providers.py; news/services/ingestion.py; news/views.py; news/utils.py; settings.py:L521-L547; .github/workflows/data_pipeline.yml]

### 5.6 Email flow

**Sequence diagram:** docs/diagrams/09-data-flow-email.mermaid

- Entry: registration, verification, resend, password-reset and account-deletion views call the email helper.
- Transformation: template/content is assembled with the recipient and verification/reset/deletion link.
- Primary transport: SendGridAPIClient is constructed with timeout=10. The installed SendGrid SDK constructor does not accept this keyword, and the corresponding test fails with TypeError.
- Fallback: Django SMTP is configured for Brevo with a 10-second timeout if BREVO_SMTP_KEY is set. If it is absent, settings switches to the console email backend.
- Persistence: no durable email outbox or delivery record is used.
- Response: the request flow receives the helper result; console backend output is not proof of delivery to a recipient.
- Logging: recipient email addresses and provider exception text are logged.
- Retries: the helper retries the SendGrid attempt, then uses synchronous SMTP fallback. No durable retry queue, bounce handler or provider webhook was found. [authentication/utils.py:L219-L285; settings.py:L293-L314; render.yaml; tests/authentication/test_email_utils.py]

### 5.7 Observability flow

**Sequence diagram:** docs/diagrams/10-data-flow-observability.mermaid

- Request entry: RequestLoggingMiddleware captures request/response timing, request ID, client address, user identity and user-agent context.
- Log sink: configured root and application loggers use console handlers. A file handler is declared but is not attached to the root logger.
- Hosting sink: console output is available through the Render service log stream; retention and access policy are not visible in this repository.
- Exception flow: Sentry is initialised only when SENTRY_DSN is set.
- Scrubbing: backend before_send scrubs selected query parameters such as api_key/token. It does not prove all headers, bodies, provider URLs or exception text are scrubbed.
- Frontend Sentry: frontend SDK has a separate scrubber and sendDefaultPii=false.
- Analytics: Google Analytics is inserted after consent; Vercel Analytics is mounted unconditionally.
- Alerting: no PagerDuty, Slack, Prometheus, Grafana, Loki or UptimeRobot integration was found in tracked source/configuration. [authentication/middleware.py:L306-L430; settings.py:L436-L516; sentry_config.py; frontend/src/App.jsx:L373-L395; frontend/src/components/consent/ConsentManager.jsx]

### 5.8 Scheduled work and asynchronous execution

**Diagrams:** docs/diagrams/03-deployment.mermaid and docs/diagrams/14-failure-modes.mermaid

- GitHub Actions is the scheduler in tracked configuration.
- The data pipeline workflow invokes fetch_news, but does not set NEWS_INGESTION_ENABLED. The command therefore follows its disabled-by-default path unless another environment mechanism enables it.
- The prediction workflow sets/uses a pipeline-level flag, while generate_predictions checks PREDICTION_GENERATION_ENABLED. The latter defaults false and is not set by the inspected workflow.
- The database-maintenance workflow invokes prune_news. Other management commands such as cleanup_audit_logs, cleanup_sessions, cleanup_api_keys, delete_unverified_users, send_weekly_digest, update_prediction_accuracy and refresh_stock_cache are not scheduled by the inspected workflows.
- No active Celery package, worker, broker, queue, dead-letter queue, task retry framework or signal-driven task dispatcher was found. celery_app.py imports Celery, but Celery is not in the tracked requirements and the module is not imported by the Django project. The app tasks.py files are empty.
- There is no evidence of a production background worker. [requirements.txt; settings.py:L83-L104; celery_app.py; news/tasks.py; stocks/tasks.py; .github/workflows/data_pipeline.yml; .github/workflows/prediction_pipeline.yml; .github/workflows/db_maintenance.yml]

### 5.9 Account deletion

- Entry: authenticated user POSTs to the delete-account endpoint.
- Transformation: view sets the account inactive and records a scheduled deletion date, then blacklists outstanding tokens and sends a confirmation email.
- Cancellation: CancelDeletionView requires IsAuthenticated, while the account has already been marked inactive. No public token-based cancellation route or frontend /cancel-deletion route exists.
- Final deletion: no scheduled worker/management command was found that deletes accounts when the scheduled date arrives.
- Persistence: the account can become inactive immediately and remain stored indefinitely unless manually deleted. The advertised 30-day grace period is not implemented end to end. [authentication/views.py:L1260-L1405; authentication/urls.py; frontend/src/App.jsx:L220-L366]

### 5.10 Backup flow

- A scripts/backup_db.py file defines a Django BaseCommand class but is not under an installed app's management/commands directory and has no direct script entry point.
- The script constructs a pg_dump command against localhost rather than the configured database host, writes a filename ending in .sql.gz without compressing the output, and relies on pg_dump being installed.
- The Dockerfile does not install postgresql-client.
- The script references S3 upload, but no workflow invokes it, no production backup bucket/credentials were confirmed, and S3 upload errors are logged without establishing a successful backup.
- No restore command or restore test was found. [scripts/backup_db.py:L1-L115; Dockerfile:L1-L110; .github/workflows/db_maintenance.yml]

### 5.11 LSTM prediction and stock-opinion path

**Sequence diagram:** docs/diagrams/08-data-flow-market-data.mermaid

- The /api/v1/lstm-predict/ view reads the latest persisted Prediction record for the requested symbol. It does not run LSTM inference in the HTTP request path.
- The /api/v1/stock-opinion/ view also reads a persisted Prediction record. Its route/schema wording suggests opinion generation, but the view does not call the opinion-generation engine.
- The generate_predictions management command is the source path that can invoke LSTMPredictor and persist Prediction rows. It checks PREDICTION_GENERATION_ENABLED, which defaults false and is not set by the inspected scheduled workflow.
- A generate_stock_opinion function exists in stocks/opinion_generator.py and calls the analysis engine, but no active view caller was found. No write to StockOpinion.objects was found in the inspected runtime source.
- StockOpinion is therefore a defined model without a verified active write path. No LLM provider is used in this path; the engine is local Python/model code.
- Result: an endpoint response may represent a previously stored prediction, not a newly generated forecast or opinion. [stocks/views.py:L216-L262, L582-L704; stocks/management/commands/generate_predictions.py:L1-L120; stocks/opinion_generator.py:L903-L943; stocks/models.py:L5-L206; .github/workflows/prediction_pipeline.yml]

## 6. Secrets & Key Handling

No secret values are reproduced in this document. Environment variable names are identifiers, not values.

| Secret or credential | Where loaded | Runtime storage/use | Logged? | Reaches client? | Rotation path |
|---|---|---|---|---|---|
| SECRET_KEY | Backend process environment | Django signing and JWT signing key | No intentional logging found | No | Manual environment update; invalidates signatures/tokens depending on token lifecycle. No automated rotation procedure found. |
| DATABASE_URL | Backend process environment | Parsed into Django database connection | No intentional logging found; connection exceptions need review | No | Rotate at database provider and update Render environment; provider is unverified. |
| REDIS_URL | Backend process environment | Django cache connection | No | No | Manual service credential update; live Redis is not configured. |
| FINNHUB_API_KEY | Backend environment | Finnhub request parameters | Provider URL may include query credential; error logging risk depends on exception | No | Rotate in provider account and backend environment. |
| ALPHA_VANTAGE_KEY | Backend environment | Alpha Vantage request parameters | Provider URL may include query credential | No | Rotate in provider account and backend environment. |
| RAPIDAPI_KEY | Backend environment | RapidAPI request header | No direct key logging found | No | Rotate in RapidAPI account and backend environment. |
| TWELVEDATA_API_KEY | Backend environment | Twelve Data request parameters | Provider URL may include query credential | No | Rotate in provider account and backend environment. |
| SENDGRID_API_KEY | Backend environment | SendGrid API client | Error text may be logged; key value not intentionally logged | No | Rotate in SendGrid and backend environment. |
| BREVO_SMTP_KEY | Backend environment | SMTP password for Brevo | No intentional logging found | No | Rotate in Brevo and backend environment. |
| SENTRY_DSN | Backend environment | Sentry SDK | DSN is configuration, not treated as a password | Frontend VITE_SENTRY_DSN is intentionally public if set | Rotate/project reset in Sentry if required. |
| VITE_DEMO_PASSWORD | Vercel/build environment if configured | Compiled into frontend bundle because Vite exposes VITE_ variables | Public bundle; not a server secret | Yes, if set | Remove demo login or use a restricted public demo account; rotate any associated credential. Current Vercel value is UNVERIFIED. |
| VITE_PUBLIC_API_KEY | Vercel/build environment if configured | Compiled into frontend bundle and sent by the client API helper | Public bundle | Yes, by design if set | Treat as public, rate-limit/scope it or remove it. It is not a provider BYOK key. |
| VITE_API_KEY | Local frontend environment file | No source reference found | No | No, not used by current source | No rotation path required unless another uninspected deployment consumer uses it. |
| VITE_GA_MEASUREMENT_ID | Frontend build environment | Browser analytics identifier | Public identifier | Yes | Change in GA property and frontend build. |
| VITE_API_BASE_URL | Frontend build environment | API destination | Public URL | Yes | Change Vercel environment/build. |
| VERCEL_TOKEN | GitHub Actions secret | Vercel deployment CLI/API | Secret value not printed | No | Rotate in Vercel and GitHub repository secrets. |
| RENDER_API_KEY / service ID | GitHub Actions secrets | Render deployment API | Secret value not printed | No | Rotate in Render and GitHub secrets. |
| SENTRY_AUTH_TOKEN | GitHub Actions secret | Release/source-map workflow if configured | Secret value not printed | No | Rotate in Sentry and GitHub secrets. |
| AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / BACKUP_S3_BUCKET | Referenced by backup script; no production manifest wiring verified | Intended S3 backup upload | Not proven | No | Rotate in AWS and configure only after a working backup/restore process exists. |
| CRON_SECRET | Render manifest/environment if set | No active authenticated cron endpoint found; legacy cron route returns 410 | Not proven | No | UNVERIFIED/unused in current runtime. |
| STATIC_API_KEY | Backend setting | No active authentication path using this setting found | Not proven | No | Unused setting; do not treat as the API-key lifecycle. |
| HF_TOKEN | Local/backend environment may be read implicitly by Hugging Face libraries; no explicit runtime reference found | Model download authentication if required | Not proven | No | UNVERIFIED; no configured production rotation path found. |
| User API key | Created by API | Raw key returned once; SHA-256 hash stored in UserAPIKey.key_hash | Prefix/metadata may be logged; full key not intentionally logged | Raw value reaches client once | Revoke by DELETE endpoint and create a new key. |
| Legacy User.api_key | Model save path | Plaintext field stored in user database row | No active log use found | Not included in normal profile serializer | No active rotation/revocation lifecycle found; remove after migration. |
| JWT access/refresh | API login/verify response | Browser storage and Authorization header; refresh token also represented in SimpleJWT outstanding-token tables | Request logger does not intentionally log Authorization header; Sentry scrubbing must be checked | Yes, bearer tokens are sent to API | Refresh rotation configured; logout endpoint absent; client does not persist rotated refresh token. |
| Email verification code | Generated in backend | HMAC digest stored in cache for 600 seconds | Code is included in email; digest stored in cache | Sent to user email | One-time use/TTL; resend path generates a new code. |

Evidence: settings.py:L45-L78, L149-L196, L293-L314, L493-L557; authentication/models.py:L124-L185, L422-L515; authentication/utils.py:L173-L190, L303-L307; frontend/src/services/client.js; .github/workflows/deploy.yml; scripts/backup_db.py.

The platform's Developer Settings API keys are TickFlow-issued access credentials. No user-provider credential model, encrypted BYOK vault, provider-key onboarding flow or provider-key proxy contract was found. The API key feature must not be described as provider BYOK. [authentication/models.py:L422-L515; authentication/views.py; frontend/src/components/settings/DeveloperTab.jsx]

## 7. Auth & Authorisation

### JWT path

- Token issuer: custom login and email-verification views return SimpleJWT credentials.
- Algorithm: HS256 signed with Django SECRET_KEY.
- Access lifetime: 60 minutes.
- Refresh lifetime: 7 days.
- Refresh rotation: enabled.
- Blacklist after rotation: enabled.
- Client storage: browser storage managed by frontend auth state.
- Client refresh: interceptor stores access token but does not persist the rotated refresh token.
- Logout: frontend calls /auth/logout/; no matching backend route is registered.
- Password reset/change: no complete server-side logout-all-sessions endpoint was found.
[settings.py:L282-L290; authentication/views.py; authentication/urls.py; frontend/src/services/client.js; frontend/src/hooks/useAuthState.js]

### API-key path

- API keys are random TickFlow-issued credentials.
- UserAPIKey stores SHA-256 key_hash, active status, name and optional expiry.
- Creation returns the raw value once.
- APIKeyMiddleware hashes the supplied key and queries key_hash.
- APIKeyAuthentication's direct lookup fallback uses hashed_key, which does not match the model field.
- Maximum active key count is enforced in the API-key creation path.
- No scopes or per-endpoint capabilities exist.
- Revocation marks the record inactive.
- The separate legacy User.api_key field stores a plaintext value and is not the UserAPIKey model.
[authentication/models.py:L124-L185, L422-L515; authentication/middleware.py:L145-L210; authentication/authentication.py:L149-L195; authentication/views.py]

### Default DRF configuration

- Default permission: AllowAny.
- Default authentication: JWTAuthentication, APIKeyAuthentication.
- Default throttles: AnonRateThrottle, UserRateThrottle and APIKeyRateThrottle.
- Configured limits: anonymous 100/hour, authenticated user 1000/hour, API key 200/minute.
- Custom APIKeyMiddleware adds an earlier path-based requirement for paths not in its public allowlist.
- No custom legal acceptance permission or middleware is configured.
[settings.py:L248-L275; authentication/middleware.py:L28-L72]

### Endpoint permission matrix

The table distinguishes the view's DRF permission from the additional APIKeyMiddleware path gate. Where the view is AllowAny but the middleware path is not public, the middleware can still reject an unauthenticated request before DRF.

| Endpoint group | View permission/authentication | APIKeyMiddleware path gate | Observed or effective source behaviour |
|---|---|---|---|
| POST /api/v1/auth/register/ | AllowAny | Public | Registration does not require a JWT/API key; no legal acceptance record. |
| POST /api/v1/auth/login/ | AllowAny | Public | Login does not require a JWT/API key. |
| POST /api/v1/auth/verify-email/ | AllowAny | Public | Verification does not require a JWT/API key. |
| POST /api/v1/auth/resend-verification/ | AllowAny | Public | Resend does not require a JWT/API key. |
| POST /api/v1/auth/password-reset/ and confirm | AllowAny | Public | Password-reset request/confirmation. |
| POST /api/v1/auth/refresh/ | AllowAny | Public | Refresh token endpoint. |
| GET/PATCH /api/v1/auth/profile/ | IsAuthenticated | Protected | JWT or accepted API key. |
| GET/PATCH /api/v1/auth/preferences/ | IsAuthenticated | Protected | JWT or accepted API key. |
| Watchlist, activity, usage and API-key CRUD | IsAuthenticated | Protected | JWT or accepted API key; API keys have no scopes. |
| POST /api/v1/auth/delete-account/ and cancel | IsAuthenticated | Protected | Cancellation is inaccessible after immediate account deactivation unless another authentication path exists; none was found. |
| GET /api/v1/stock-analysis/ | AllowAny | Public | Price-data gate applies; live response returned disabled data. |
| GET /api/v1/technical-indicators/ | AllowAny | Public | PRICE_DATA_PUBLIC_ACCESS gate; live response returned 503. |
| GET /api/v1/symbols/ | AllowAny | Public | Public symbol route. |
| GET /api/v1/subscribe/ or POST /api/v1/subscribe/ | AllowAny | Public | Stores an email subscription; no unsubscribe endpoint found. |
| GET /api/v1/lstm-predict/ and sentiment analysis | AllowAny | Public | Data/model availability gates apply. |
| GET /api/v1/health/ and /api/v1/health/readiness/ | AllowAny | Public | Health and readiness routes. |
| GET /api/v1/news/get-news/, symbol-search and analyzed | View defaults to AllowAny | Not in APIKeyMiddleware public list | Source middleware requires API key/JWT before the view; live unauthenticated responses do not match this source expectation. |
| GET /api/v1/performance/, /stock-opinion/ | View defaults to AllowAny | Not in APIKeyMiddleware public list | Source middleware requires API key/JWT before the view. |
| GET /api/v1/predictions/, prediction-history, drift and SHAP | IsAuthenticated | Protected | JWT or accepted API key. |
| GET /api/docs/ and /api/schema/ | Public | Public | Schema/docs routes. |
| /admin/ | Django admin session authentication | Path gate must be checked against deployed configuration | No custom admin.py was found in local apps. |
| Legacy cron resolve route | View returns 410 and is AllowAny | Not in public allowlist | Middleware may reject before the 410 response. |

Evidence: project urls.py; authentication/urls.py; stocks/urls.py; news/urls.py; health/urls.py; authentication/middleware.py:L28-L72; settings.py:L248-L275. The full route list and live probe results are in §16.

## 8. External Dependencies

| Provider | Purpose | Authentication | Failure mode | Timeout/retry in code | Data sent | Terms/redistribution posture |
|---|---|---|---|---|---|---|
| Cloudflare | Observed API edge/proxy | Managed zone configuration | Edge/origin errors, blocked requests, cache/rule behaviour | Managed; not inspectable | Client IP, headers, URL, request payload | UNVERIFIED; DPA/zone settings not in repository |
| Vercel | Frontend hosting/CDN and Vercel Analytics | Deployment token in GitHub Actions; browser analytics SDK | Static site/deploy unavailable; telemetry can be blocked | Managed | Static requests and browser telemetry | UNVERIFIED |
| Render | Django API hosting | Render API key for deploy; service environment | Service unavailable, cold start, origin errors | Managed; Gunicorn timeout 300 seconds | API request/response traffic | UNVERIFIED |
| PostgreSQL service | Persistent database | DATABASE_URL credentials; SSL required for PostgreSQL | Connection failure and query errors; readiness reports DB state | connect_timeout=10; CONN_MAX_AGE=0; no DB failover shown | User, auth, news, prediction, audit and application records | Vendor identity UNVERIFIED. Render manifest comment mentions Neon only. |
| Redis | Optional cache | REDIS_URL | Cache failure; settings uses LocMemCache only when REDIS_URL is absent, not as a live Redis outage fallback | Redis connect timeout 10s and socket timeout 5s | Cache entries, throttles, verification and lookup state | UNVERIFIED; live health reports Redis not configured |
| Finnhub | Quotes, candles, news/symbol search | FINNHUB_API_KEY, commonly query parameter | HTTP/provider error; some code paths fall through to another provider | Quote call timeout 5s; candle call timeout 10s; other client paths use configured request timeout | Symbol/ticker and provider parameters; API key may be in URL | UNVERIFIED; no provider contract/ToS evidence reviewed |
| Alpha Vantage | Quote/technical/news/symbol search fallback | ALPHA_VANTAGE_KEY query parameter | HTTP/provider error, quota/plan response | Symbol-search call timeout 5s; other paths use configured request timeout | Symbol and API key in query | UNVERIFIED |
| RapidAPI / Yahoo Finance API | Yahoo quote/candle/news/search path | RAPIDAPI_KEY request header and RAPIDAPI_HOST | HTTP/provider error; fallback chain | Configured request timeout and retry logic in TechnicalAnalyzer; exact per-path source references are in stocks/opinion_generator.py | Symbol/query and request metadata | UNVERIFIED |
| Twelve Data | Price/candle/technical data | TWELVEDATA_API_KEY request parameter | HTTP/provider error; fallback to another data source where configured | Configured request timeout in TechnicalAnalyzer | Symbol, interval and API key parameter | UNVERIFIED |
| Yahoo Finance / yfinance | Historical prices and reference series | No API credential in code path | Library/provider errors and rate limiting | Retry decorator retries rate-limit exceptions up to 3 times; no explicit network timeout in the shown Ticker.history path | Ticker symbol | UNVERIFIED |
| Hugging Face Hub | Download sentiment model/tokenizer | Public model identifier; optional HF_TOKEN may be read by library | Download/model load error; inference unavailable | Model loader retry settings; no hosted inference timeout | Model download requests; article text is processed locally by Transformers | Model and dataset license/redistribution rights UNVERIFIED |
| SendGrid | Primary transactional email API | SENDGRID_API_KEY | Constructor TypeError with installed SDK due timeout kwarg, then fallback | Helper retries SendGrid attempt; invalid timeout kwarg prevents normal client construction | Recipient address, message and verification/reset/deletion URL | UNVERIFIED |
| Brevo SMTP | Email fallback | BREVO_SMTP_KEY plus configured SMTP login | SMTP connection/auth failure; console fallback when key absent | EMAIL_TIMEOUT=10 seconds; synchronous call | Recipient address, message and verification/reset/deletion URL | UNVERIFIED |
| Sentry | Backend/frontend error tracking | SENTRY_DSN; SENTRY_AUTH_TOKEN used by release workflow if configured | No capture if DSN absent; event dropped if provider unavailable | SDK defaults; no app-level retry policy found | Exceptions, stack traces, request context and potentially identifiers | UNVERIFIED |
| Google Analytics 4 | Browser analytics | Public measurement ID | Browser script blocked or consent not granted | Browser SDK default | Page/event telemetry after consent | UNVERIFIED |
| Vercel Analytics | Browser analytics | Vercel component | Telemetry blocked or provider unavailable | Browser SDK default | Browser telemetry; component mounted unconditionally | UNVERIFIED |
| GitHub Actions | Scheduled jobs and deployment | GitHub repository secrets | Workflow/job failure; no app-level dead-letter or rollback | Workflow-defined; job timeout not consistently declared | Commit/deploy metadata and secrets used by jobs | UNVERIFIED |
| AWS S3 | Intended backup upload only | AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY and bucket | Upload errors logged; script is not scheduled or operationally verified | SDK defaults; no explicit retry/timeout configuration found | Database dump if backup script were made runnable | UNVERIFIED |

The live health endpoint reports Finnhub, Alpha Vantage and RapidAPI credentials as configured. That is a configuration-presence check, not proof that provider requests succeed or that the provider permits redistribution. The live health endpoint reports Redis as not configured. [health/views.py; live health output in §16]

No runtime payment processor, LLM API, OAuth identity provider, webhook integration or user-provider BYOK service was found in tracked source. This is an absence finding, not a statement about services outside this repository.

## 9. Data Model

**ER diagram:** docs/diagrams/04-data-model.mermaid

| Model/entity | Ownership and key relationships | Stored data | PII classification | Retention evidence |
|---|---|---|---|---|
| authentication.User | TickFlow-owned custom AUTH_USER_MODEL | Username, email, password hash, active/verified state, deletion schedule and legacy api_key field | Direct identifiers and authentication data | Deletion request deactivates account; no final-deletion worker found. |
| authentication.UserPreferences | One-to-one with User | Investment goal, risk tolerance, experience level, preferences and watchlist | Personal profile/preferences; investment-related preference data | No separate retention job found; expected cascade with user deletion. |
| authentication.UserAPIKey | Foreign key to User | Name, SHA-256 key_hash, active state, optional expires_at, last-used metadata | Authentication credential hash | Expiry cleanup command exists but is not scheduled. |
| authentication.AuditLog | Nullable foreign key to User | Action, IP address, user agent/metadata and timestamp | Personal data and security telemetry | cleanup_audit_logs defaults to 90 days; no scheduled invocation found. |
| authentication.SymbolUsage | Foreign key to User | Symbol usage counters and timestamps | User behaviour/profile data | No retention job found. |
| news.ProcessedNews | Standalone news record; symbol is stored as a value, not a confirmed FK to StockSymbol | Symbol, title/headline, URL/source, published time, sentiment and payload fields | Usually third-party content; can include author/source metadata | prune_news defaults to 14 days and is invoked by db_maintenance workflow. |
| news.SymbolSearchCache | Standalone cache record | Search query, cached results and expiry | Search behaviour; query may be user-supplied | Expiry field exists; no dedicated cleanup job found. |
| news.StockSymbol | Standalone symbol/reference record | Symbol metadata and tracking state | No direct PII | No retention job found. |
| stocks.Prediction | Optional foreign key to User; symbol stored as value | Symbol, direction, confidence, model/source and outcome fields | May be linked to a user; financial inference data | prune_predictions command exists; workflow behaviour is conditional. |
| stocks.StockOpinion | Standalone opinion record | Symbol, opinion/action, horizon and explanatory fields | No direct PII found | No writer in the active request path found; no retention job found. |
| stocks.ModelPerformanceSnapshot | Aggregate performance record | Model/source/symbol/date and performance counters | Aggregate data; no direct PII found | update_prediction_accuracy command exists but is not scheduled. |
| stocks.Subscription | Standalone email subscription | Email and subscription state/time | Direct email identifier | No unsubscribe endpoint or retention job found. |
| django_session | Django built-in session table | Session key, session data, expiry | Session/authentication data | cleanup_sessions command exists but is not scheduled. |
| OutstandingToken | SimpleJWT blacklist app, FK to User | Outstanding refresh token data | Authentication credential | cleanup_sessions command exists but is not scheduled. |
| BlacklistedToken | One-to-one to OutstandingToken | Blacklist timestamp/reference | Authentication metadata | cleanup_sessions command exists but is not scheduled. |

Application model evidence: authentication.User and legacy fields are in authentication/models.py:L124-L293; UserPreferences in L294-L417; UserAPIKey in L422-L511; AuditLog in L516-L557; SymbolUsage in L564-L619. News models are in news/models.py:L14-L189. StockOpinion, Prediction, ModelPerformanceSnapshot and Subscription are in stocks/models.py:L5-L273. The custom user table is authentication_user. Framework tables also include auth_group, auth_permission, django_content_type, django_admin_log, django_session, token_blacklist_outstandingtoken and token_blacklist_blacklistedtoken. No ConsentRecord, LegalAcceptance, ProviderCredential, Payment, EmailOutbox, PipelineRun, Backup, DataExport, Webhook, file-upload or job/dead-letter model was found in the installed domain apps. [settings.py:L83-L106; authentication/models.py; news/models.py; stocks/models.py]

The database provider is not confirmed. The source uses DATABASE_URL and requires SSL for PostgreSQL. The live health check reports a connected database but does not identify its vendor. The Render manifest's Neon comment is not proof of vendor identity. [settings.py:L149-L196; render.yaml; live health output in §16]

## 10. Deployment Topology

### Environment table

| Environment | Frontend | Backend | Database/cache | Secrets | Verification |
|---|---|---|---|---|---|
| Local development | Vite development server | Django development server | SQLite fallback if DATABASE_URL absent; LocMemCache if REDIS_URL absent | Local ignored environment files; values not read | Local test/build commands executed against clean SHA archive |
| Staging | No distinct Vercel staging frontend configuration verified | Workflow contains staging branch/service path | External database/cache values supplied outside repository | GitHub Actions/Render environment | Actual staging service and environment UNVERIFIED |
| Production | intelligence.tickflowcapital.com served by Vercel | API hostname sentiment-driven-stock-price-prediction.onrender.com, observed through Cloudflare to Render/Gunicorn | PostgreSQL healthy; live health reports memory cache and Redis not configured | Render/Vercel/GitHub secrets not inspected | Live GET/HEAD/OPTIONS probes; deployed SHA UNVERIFIED |

### Build and deployment chain

- GitHub Actions deploy workflow responds to configured branch events for master and staging.
- Backend deploy uses Render deployment credentials/service identifiers from GitHub secrets.
- Frontend deploy uses Vercel configuration/CLI.
- Backend image is built from the tracked Dockerfile and starts through entrypoint.sh.
- entrypoint waits for the database, attempts migrations, collects static files and starts Gunicorn.
- The entrypoint suppresses a second migration failure and proceeds to Gunicorn, so a failed migration does not guarantee a failed deployment.
- No CI test, lint, dependency-audit or post-deploy smoke-test gate was found in the deployment workflow.
- No automatic rollback mechanism was found in the workflow.
- Render YAML names the service trading-algo and specifies Singapore, while the live API hostname is sentiment-driven-stock-price-prediction.onrender.com. This is configuration drift until the dashboard/service identity is verified.
- Render YAML declares a Redis resource path, but live health reports Redis not configured.
- Render YAML declares SENDGRID_API_KEY but not BREVO_SMTP_KEY, while Brevo SMTP is the Django fallback.
- No production backup target or restore process was verified.
- No Docker Compose file or build.sh was found.

Evidence: .github/workflows/deploy.yml; sentiment_driven_stock_price_prediction_engine/render.yaml; Dockerfile; entrypoint.sh:L30-L69; frontend/vercel.json; live probe outputs in §16.

**Deployment diagram:** docs/diagrams/03-deployment.mermaid

## 11. Observability

| Area | Implemented behaviour | Limits / evidence |
|---|---|---|
| Request logging | RequestLoggingMiddleware records request/response timing, request ID, method/path/status, client address and user context | IP, user ID/username, user-agent and API-key metadata can be personal/security data. [authentication/middleware.py:L306-L430] |
| Application logs | Root and app loggers use console handlers | A file handler is declared but not attached to the root handler. [settings.py:L436-L484] |
| Render log sink | Console output is available through the hosting service | Production retention, export and access policy are UNVERIFIED. |
| Sentry | Optional backend SDK initialised when SENTRY_DSN is set; frontend SDK also present | Backend PII default false in settings; .env.example sets SENTRY_SEND_PII to true. Backend scrubber does not prove complete header/body scrubbing. [settings.py:L491-L516; sentry_config.py; .env.example] |
| Google Analytics | Consent-controlled script activation | Consent choice is client-side; no server-side consent record. [ConsentManager.jsx] |
| Vercel Analytics | Component mounted in App regardless of consent state | Conflicts with an opt-in-only analytics statement in Privacy page. [App.jsx:L373-L395; Privacy.jsx] |
| Health/readiness | Health and readiness endpoints check database/cache/provider configuration | Provider configured does not mean provider reachable. Health does not expose deployed commit SHA. [health/views.py; live health output in §16] |
| Rate-limit headers | Middleware adds X-RateLimit headers | Anonymous and authenticated-user cache keys do not match DRF's standard throttle key formats; remaining/reset values can be inaccurate. [authentication/middleware.py:L235-L299; authentication/throttles.py:L25-L113] |
| Alerting | None found in tracked code/configuration | No PagerDuty, Slack, Prometheus, Grafana, Loki or UptimeRobot configuration found. |
| Log retention | cleanup_audit_logs command exists | It is not scheduled by the inspected workflows. Render log retention is external and UNVERIFIED. |

The backend Sentry scrubber removes selected query parameters, including api_key and token, but the repository does not establish that all Authorization headers, cookies, request bodies, email addresses, provider URL credentials or exception text are scrubbed before transmission. Email helpers log recipient email addresses and provider exception text. [sentry_config.py; authentication/utils.py:L221-L285; authentication/middleware.py:L306-L430]

## 12. Open-Source Boundary

- The public repository contains application source, frontend source, backend source, deployment configuration, workflows, model artifacts and a dataset.
- The root LICENSE is MIT and names Anyega Alex Kamau with a 2026 copyright notice. [LICENSE:L1-L20]
- docs/wiki/13.1-License.md names Tickflow Capital Ltd and Anyega Alex Kamau and describes additional restrictions/patent language not present in the root MIT text. The two statements conflict. [docs/wiki/13.1-License.md; LICENSE]
- No separate NOTICE file, BYOK addendum, risk-disclosure file, or per-model/per-dataset license file was found in the tracked tree.
- Model artifacts stock_prediction_model.pth and stock_prediction_model.joblib and data/ibm_cleaned.parquet are committed. Their provenance, source terms and redistribution rights are not established by the repository evidence inspected.
- A vendored JupyterLab Plotly extension exists under share/jupyter/labextensions/jupyterlab-plotly. Its own package metadata is separate from the root license; full third-party notice compliance was not audited.
- No dual-license declaration was found.
- No private application repository or private-source dependency was identified from the tracked repository remotes inspected. This does not prove that no private repository exists elsewhere.
- No hardcoded provider secret value was identified by the tracked-source pattern scan. Local ignored .env values were not read.
- VITE_ variables referenced by frontend source are compile-time client values. VITE_DEMO_PASSWORD, if configured, is exposed in the browser bundle. VITE_PUBLIC_API_KEY, if configured, is a public client credential and must not be treated as a secret.
- The legacy User.api_key field stores a plaintext key in the database model; it is distinct from the hashed UserAPIKey store.
- The repository does not establish proprietary ownership of the hosted service, brand, customer data, market-data outputs or provider agreements. Those are external/legal questions and remain UNVERIFIED.

**Boundary diagram:** docs/diagrams/13-open-source-boundary.mermaid

## 13. Conformance Table

The same table is maintained as a standalone diffable artifact in CONFORMANCE.md. Verdicts describe repository behaviour at the audited SHA. They are not legal opinions about enforceability.

| Legal claim or surface | Source document | Code evidence | Verdict | Severity |
|---|---|---|---|---|
| Terms acceptance is captured and enforced at registration/use | frontend/src/pages/Terms.jsx | No acceptance fields/model/middleware in authentication models, serializers or views | CONFLICTS | High |
| Users must be 18 or older | Terms page | No date-of-birth field or age validation found in User model, registration serializer or views | CONFLICTS | High |
| Google Analytics runs only after opt-in | Privacy page | ConsentManager conditionally inserts GA script | CONFORMS | Low |
| All analytics are opt-in | Privacy page | Vercel Analytics is mounted unconditionally in App.jsx | CONFLICTS | High |
| Consent is stored as a durable user record | Privacy page | Consent preference is client-side; no ConsentRecord model or server endpoint | UNVERIFIED | Medium |
| Account deletion completes after a 30-day grace period and can be cancelled | Privacy/Terms pages | Account is deactivated immediately; cancel endpoint requires authentication; no frontend cancel route or scheduled final-delete worker | CONFLICTS | Critical |
| Audit logs are deleted after 90 days | Privacy page, if stated | cleanup_audit_logs command has a 90-day default but is not scheduled | UNVERIFIED | Medium |
| Backups are created and retained | Privacy/operations text, if stated | backup_db.py is not a discoverable command, is not scheduled and has pg_dump/filename issues | CONFLICTS | Critical |
| Cloudflare is excluded from the app-processor list because it is classified as a network-layer provider | Privacy page | Privacy page explicitly excludes Cloudflare on that rationale; live headers show API traffic passes through Cloudflare; contract/role evidence is unavailable | UNVERIFIED | Medium |
| Neon is the production database provider | Privacy/processor text | Render comment mentions Neon; live health confirms only PostgreSQL connectivity, not vendor | UNVERIFIED | Medium |
| SendGrid/Brevo is the production email processor | Privacy page | Code supports SendGrid/Brevo/console; SendGrid call has invalid timeout kwarg; actual production environment unknown | UNVERIFIED | High |
| Market-data provider terms permit public display/redistribution | Data Attribution / Terms | Price/news public flags default false; no provider contracts/ToS included | UNVERIFIED | Critical |
| User personal data is never sent to market-data providers | Privacy page, if stated | Code sends user-selected symbol/search values to external provider endpoints; no general PII filtering proof | UNVERIFIED | High |
| No personal data is logged | Privacy page, if stated | Request logging records IP/user context; email helper logs recipient addresses | CONFLICTS | High |
| Model attribution identifies the deployed sentiment model | Data Attribution page | Effective FINBERT_CONFIG is ProsusAI/finbert; Data Attribution names a DistilBERT model | CONFLICTS | Medium |
| Dataset/model artifacts may be redistributed under stated license | License/Data Attribution | Dataset and weights are committed; separate artifact license evidence absent | UNVERIFIED | High |
| Root code is MIT licensed | Root LICENSE | Root LICENSE contains MIT text | CONFORMS | Low |
| Wiki license statement has same holder/terms as root license | docs/wiki/13.1-License.md | Wiki names additional holder/restrictions/patent language absent from root license | CONFLICTS | High |
| API keys are provider BYOK credentials | BYOK addendum, if any | UserAPIKey is a TickFlow-issued platform API key; no provider credential vault/proxy found | CONFLICTS | High |
| Risk disclosure is published and versioned | Risk disclosure document | No RISK-DISCLOSURE file/page or legal acceptance record found | UNVERIFIED | High |
| NOTICE and legal JSON documents are present | NOTICE/legal JSON | No tracked NOTICE or legal JSON document found | UNVERIFIED | Medium |
| Users can unsubscribe from subscription emails | Privacy/Terms pages, if stated | Subscription stores an email; no unsubscribe endpoint found | CONFLICTS | Medium |
| No payment data is processed by this repository | Privacy/Terms pages | No payment processor, billing model or payment route found in tracked source | CONFORMS | Low |
| No LLM provider receives user data | Privacy page, if stated | No active LLM provider integration/call path found; Hugging Face model inference is local | CONFORMS | Low |
| Provider/data processor terms and DPAs have been verified | Privacy page | No provider agreements or DPA evidence in repository | UNVERIFIED | High |

## 14. Findings

The full flat register is in FINDINGS.md. Highest-priority findings:

| ID | Severity | Finding | Blocks launch |
|---|---|---|---|
| F-01 | Critical | Production dependency audit reports 23 production dependency vulnerabilities, including one critical and thirteen high. | Yes, pending remediation or documented reachability exception |
| F-02 | Critical | Backup implementation is not operationally runnable or scheduled; no restore evidence exists. | Yes for production data |
| F-03 | Critical | Account deletion/grace-period implementation deactivates immediately, cannot be cancelled through the available flow and has no final deletion worker. | Yes for privacy/legal readiness |
| F-04 | High | Legal acceptance and age gate are absent from server-side registration and request paths. | Yes for legal launch |
| F-05 | High | Vercel Analytics is mounted without consent gating. | Yes where opt-in consent is promised/required |
| F-06 | High | JWT refresh rotation invalidates the old refresh token, but frontend does not store the replacement. | Yes for reliable session renewal |
| F-07 | High | Frontend calls a logout endpoint that the backend does not register. | Yes for server-side session revocation |
| F-08 | High | APIKeyAuthentication queries a non-existent hashed_key model field on its direct lookup path. | Yes for reliable API-key authentication |
| F-09 | High | API keys have no scopes and inherit the authenticated user's broad endpoint access. | Yes before external API-key release |
| F-10 | High | SendGrid client construction passes an unsupported timeout keyword; fallback can be console-only. | Yes for transactional email |
| F-11 | High | Scheduled ingestion and prediction workflows do not set the feature flags checked by their commands. | Yes for advertised automated data/model features |
| F-12 | High | LSTM training samples rows randomly before next-row target construction and does not evaluate the held-out test dataframe. | Yes for performance claims/model release |
| F-13 | High | Live unauthenticated API behaviour does not match the audited source middleware path gate; deployed SHA is not exposed. | Yes until production auth boundary is reconciled |
| F-14 | High | Entrypoint continues to Gunicorn after a second migration failure. | Yes for safe deployment |
| F-15 | High | Stock-analysis lastUpdated is request time, not data timestamp; live response exposes disabled/null data with a current timestamp. | Yes if UI represents it as market-data freshness |
| F-16 | Medium | Redis is not configured in live health; LocMemCache is process-local for throttles and verification state. | No for single instance; yes before horizontal scaling |
| F-17 | Medium | Rate-limit headers read incorrect anonymous/user throttle cache keys. | No |
| F-18 | Medium | Request/email logs contain identifiers and recipient addresses; backend Sentry scrubbing is incomplete. | Yes if privacy promise says no personal data in logs/events |
| F-19 | Medium | DeveloperTab references undefined activeKey; frontend lint reports 248 errors. | Yes for affected Developer Settings path |
| F-20 | Medium | Backend test suite has 35 failures. | Yes until failures are triaged |
| F-21 | Medium | OpenAPI generation emits schema warnings and duplicate/ambiguous operation metadata. | No, but blocks reliable generated API reference |
| F-22 | Medium | Model attribution and legal licence statements conflict with repository evidence. | Yes for public legal/attribution claims |
| F-23 | Medium | Privacy page excludes Cloudflare from the app-processor list on a network-layer rationale; the contractual processing role is unverified. | Yes if the processor list is intended to be exhaustive |
| F-24 | Medium | Subscription endpoint stores email only; no unsubscribe or delivery workflow is implemented. | Yes if subscription/notifications are marketed |
| F-25 | Medium | Cleanup commands for audit logs, sessions, API keys and unverified users are not scheduled. | Yes for retention promises |
| F-26 | Medium | Render manifest and live runtime differ: service name, Redis state and email environment configuration. | No, but requires deployment reconciliation |
| F-27 | Medium | No Content-Security-Policy configuration was found in tracked Django settings or frontend hosting config. | No, but security hardening gap |
| F-28 | Medium | refresh_stock_cache checks a stock-analysis cache key but writes a technical-cache key. | No |
| F-29 | Medium | No active Celery worker/task queue exists; celery_app.py is dormant and dependency is absent. | No for current site; yes for any claimed async job capability |
| F-30 | Medium | BYOK, risk-disclosure, NOTICE and legal JSON artefacts are absent. | Yes where those capabilities/documents are claimed |

## 15. Known Unknowns

The following cannot be verified from the audited commit or read-only live probes:

- Exact production Git SHA, deployment branch, build ID and release mapping.
- Vercel project settings, build environment, environment variable values, deployment protection and analytics settings.
- Render dashboard settings, actual service identity, plan, region, instance count, environment variables and deployment revision.
- Cloudflare zone, WAF, bot controls, firewall rules, cache rules, TLS mode, origin certificate, logs and data-processing agreement.
- Production PostgreSQL vendor, region, branch, access controls, backup schedule, backup target, retention and restore-test evidence.
- Production Redis service credentials, topology and availability; live health reports it as not configured.
- Whether production Vercel environment defines VITE_DEMO_PASSWORD or VITE_PUBLIC_API_KEY.
- Actual SendGrid/Brevo credentials, delivery status, bounce handling, sender verification and provider plan.
- Market-data provider account plans, quotas, data rights, display/redistribution rights, derived-data terms and contractual restrictions.
- Hugging Face model license and dataset license/consent/provenance.
- Sentry project settings, event retention, access controls, alert rules and actual production event payloads.
- Google Analytics property configuration and consent settings.
- Vercel Analytics data-processing/consent configuration.
- Production log retention and access policy.
- Actual user count, traffic, article count, prediction count, model performance, uptime and SLA.
- Whether the backup script is run manually outside tracked workflows. No successful backup or restore evidence was supplied.
- Whether any private repository, proprietary codebase, private model or separate data agreement exists outside the inspected checkout.
- Company registration details, registered office, legal ownership, governing-law decisions, regulator status and counsel approval.
- Whether a third-party processor agreement exists for Cloudflare, Vercel, Render, database, Sentry, Google Analytics, email or market-data providers.
- Whether any external webhook, payment, LLM, OAuth or BYOK service exists outside this repository.

No external provider ToS, DPA, case law, regulator guidance or legal endorsement is asserted in this document. Those items require authoritative source documents and, where appropriate, counsel review.

## 16. Appendix

### 16.1 Repository and environment enumeration

Tracked top-level directories:

- .github
- docs
- frontend
- sentiment_driven_stock_price_prediction_engine
- share

Package manifests:

- frontend/package.json
- sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/package.json
- share/jupyter/labextensions/jupyterlab-plotly/package.json

Requirements files:

- sentiment_driven_stock_price_prediction_engine/requirements.txt
- sentiment_driven_stock_price_prediction_engine/requirements-test.txt

Environment examples:

- sentiment_driven_stock_price_prediction_engine/.env.example
- No tracked frontend .env.example found.

Settings files:

- sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/settings.py

Docker/deployment files:

- sentiment_driven_stock_price_prediction_engine/Dockerfile
- sentiment_driven_stock_price_prediction_engine/render.yaml
- frontend/vercel.json
- .github/workflows/deploy.yml
- .github/workflows/data_pipeline.yml
- .github/workflows/prediction_pipeline.yml
- .github/workflows/db_maintenance.yml
- No Docker Compose file, Procfile or build.sh found.

Django app inventory from INSTALLED_APPS:

- Built-in: django.contrib.admin, auth, contenttypes, sessions, messages, staticfiles.
- Third-party: rest_framework, corsheaders, django_redis, drf_spectacular, rest_framework_simplejwt, rest_framework_simplejwt.token_blacklist.
- Local: authentication, news, stocks, health.
- ml_pipeline exists in the source tree but is not installed.
- celery is not installed in requirements and celery_app.py is not imported by project startup.

React route inventory is listed in §3. Route definitions were read from frontend/src/App.jsx:L220-L366.

### 16.2 File inventory read

The full 352-path read/scan inventory is generated below from the audited Git tree. The inventory includes all backend Python files, all frontend JS/TS source files, and the explicitly inspected configuration, workflow and legal files. It is generated from the audited SHA tree, not from the dirty working tree.

### Backend Python files (152)
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/admin.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/apps.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/authentication.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/decorators.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/error_codes.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/management/commands/cleanup_api_keys.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/management/commands/cleanup_audit_logs.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/management/commands/cleanup_sessions.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/management/commands/delete_unverified_users.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/management/commands/generate_apikey.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/middleware.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0001_initial.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0002_auditlog_alter_apikey_options_alter_user_options_and_more.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0003_userpreferences.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0004_userpreferences_language_userpreferences_timezone.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0005_userapikey.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0006_symbolusage.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0007_delete_apikey_alter_symbolusage_options_and_more.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0008_user_analyses_count_user_news_read_count_and_more.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0009_user_prediction_accuracy.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0010_user_bio_user_nickname.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0011_alter_userpreferences_theme.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/0012_userpreferences_weekly_digest.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/migrations/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/models.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/serializers.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/tests.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/throttles.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/urls.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/utils.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/authentication/views.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/data_cleaning/clean_ibm_csv.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/data_cleaning/confirm_fields.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/gunicorn.conf.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/health/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/health/admin.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/health/apps.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/health/migrations/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/health/models.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/health/tests.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/health/urls.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/health/views.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/manage.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/ml_pipeline/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/ml_pipeline/admin.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/ml_pipeline/apps.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/ml_pipeline/migrations/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/ml_pipeline/models.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/ml_pipeline/tests.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/ml_pipeline/views.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/admin.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/apps.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/management/commands/clean_duplicates.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/management/commands/fetch_news.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/management/commands/prune_news.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/migrations/0001_initial.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/migrations/0002_alter_processednews_source_name_and_more.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/migrations/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/models.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/serializers.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/services/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/services/ingestion.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/services/provider_manager.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/services/providers.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/tasks.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/urls.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/utils.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/news/views.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/scripts/backup_db.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/scripts/check_records.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/scripts/convert_csv_to_parquet.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/admin.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/asgi.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/celery_app.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/logging_config.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/sentry_config.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/settings.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/urls.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/sentiment_driven_stock_price_prediction_engine/wsgi.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/admin.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/api/predictors.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/apps.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/cache_utils.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/lstm_predictor.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/management/commands/generate_predictions.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/management/commands/prune_predictions.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/management/commands/refresh_stock_cache.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/management/commands/resolve_predictions.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/management/commands/send_weekly_digest.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/management/commands/update_prediction_accuracy.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/management/commands/wait_for_db.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/migrations/0001_initial.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/migrations/0002_subscription.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/migrations/0003_alter_prediction_options_prediction_source_and_more.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/migrations/0004_modelperformancesnapshot_prediction_actual_direction_and_more.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/migrations/0005_prediction_user_and_more.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/migrations/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/models.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/opinion_generator.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/serializers.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/tasks.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/tests.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/urls.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/utils.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/stocks/views.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/authentication/test_api_keys.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/authentication/test_auth_views.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/authentication/test_authentication.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/authentication/test_email_utils.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/authentication/test_middleware.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/authentication/test_serializers.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/authentication/test_views.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/conftest.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/factories.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/integration/__init__.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/integration/test_journeys.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/news/test_ingestion.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/news/test_news_views.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/news/test_utils.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/stocks/test_lstm_predictor.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/stocks/test_opinion_generator.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/stocks/test_stock_views.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/stocks/test_stocks_utils.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/stocks/test_stocks_views.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_admin.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_async.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_authentication.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_caching.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_chaos.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_config.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_external.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_health.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_management.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_middleware.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_migrations.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_models.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_observability.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_p0_integrity.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_permissions.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_queries.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_sample.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_serializers.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_signals.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_templates.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_urls.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/tests/test_versioning.py
- /tmp/tickflow-audit-clean-881c7c54/sentiment_driven_stock_price_prediction_engine/training/train_pipeline.py

### Frontend JS/TS files (181)
- frontend/src/App.jsx
- frontend/src/components/Breadcrumbs.jsx
- frontend/src/components/Breadcrumbs.test.jsx
- frontend/src/components/DriftAlert.jsx
- frontend/src/components/ErrorBoundary.jsx
- frontend/src/components/ErrorBoundary.test.jsx
- frontend/src/components/FilterBar.jsx
- frontend/src/components/Footer.jsx
- frontend/src/components/Header.jsx
- frontend/src/components/Header/BrandNameCard.jsx
- frontend/src/components/Header/NavigationCards.jsx
- frontend/src/components/Header/SymbolSearchCard.jsx
- frontend/src/components/Header/SymbolSearchCard.test.jsx
- frontend/src/components/Header/UserMenu.jsx
- frontend/src/components/InvestmentPreferences.jsx
- frontend/src/components/KeyPhraseChip.jsx
- frontend/src/components/KeyPhraseChip.test.jsx
- frontend/src/components/Layouts/AuthLayout.jsx
- frontend/src/components/Layouts/LandingLayout.jsx
- frontend/src/components/Layouts/PublicLayout.jsx
- frontend/src/components/NewsArticleImage.jsx
- frontend/src/components/NewsArticleImage.test.jsx
- frontend/src/components/NewsCard.jsx
- frontend/src/components/NewsItem.jsx
- frontend/src/components/NewsList.jsx
- frontend/src/components/NewsSkeleton.jsx
- frontend/src/components/NotFound.jsx
- frontend/src/components/NotFound.test.jsx
- frontend/src/components/PerformanceChart.jsx
- frontend/src/components/PredictionForm.jsx
- frontend/src/components/PredictionModal.jsx
- frontend/src/components/PredictionSummaryCards.jsx
- frontend/src/components/PredictionTable.jsx
- frontend/src/components/SHAPExplanation.jsx
- frontend/src/components/SearchSkeleton.jsx
- frontend/src/components/auth/AuthenticatedNavigation.test.jsx
- frontend/src/components/auth/HomeRoute.jsx
- frontend/src/components/auth/HomeRoute.test.jsx
- frontend/src/components/auth/LoginForm.jsx
- frontend/src/components/auth/ProtectedRoute.jsx
- frontend/src/components/auth/ProtectedRoute.test.jsx
- frontend/src/components/auth/SignupForm.jsx
- frontend/src/components/cards/SentimentAnalysisCard.jsx
- frontend/src/components/cards/StockOpinionCard.jsx
- frontend/src/components/cards/TechnicalIndicatorsCard.jsx
- frontend/src/components/cards/shared/utils.jsx
- frontend/src/components/charts/PredictionHistoryList.jsx
- frontend/src/components/consent/ConsentManager.jsx
- frontend/src/components/consent/ConsentManager.test.jsx
- frontend/src/components/forms/PredictionForm.jsx
- frontend/src/components/landing/APIDemo.jsx
- frontend/src/components/landing/CTASection.jsx
- frontend/src/components/landing/Documentation.jsx
- frontend/src/components/landing/Hero.jsx
- frontend/src/components/landing/HowItWorks.jsx
- frontend/src/components/landing/Infrastructure.jsx
- frontend/src/components/landing/Metrics.jsx
- frontend/src/components/landing/OpenSource.jsx
- frontend/src/components/landing/TechnicalBreakdown.jsx
- frontend/src/components/modals/ChangePasswordModal.jsx
- frontend/src/components/modals/EditProfileModal.jsx
- frontend/src/components/onboarding/CompletionStep.jsx
- frontend/src/components/onboarding/InvestmentProfileStep.jsx
- frontend/src/components/onboarding/OnboardingContainer.jsx
- frontend/src/components/onboarding/OnboardingContainer.test.jsx
- frontend/src/components/onboarding/OnboardingLoadingStates.test.jsx
- frontend/src/components/onboarding/PersonaSelection.jsx
- frontend/src/components/onboarding/ProfileStep.jsx
- frontend/src/components/onboarding/ProgressBar.jsx
- frontend/src/components/onboarding/Step1_Profile.jsx
- frontend/src/components/onboarding/Step2_Preferences.jsx
- frontend/src/components/onboarding/Step3_Watchlist.jsx
- frontend/src/components/onboarding/Step4_Complete.jsx
- frontend/src/components/onboarding/Tooltip.jsx
- frontend/src/components/onboarding/WelcomeStep.jsx
- frontend/src/components/onboarding/index.jsx
- frontend/src/components/settings/AccountTab.jsx
- frontend/src/components/settings/DeveloperTab.jsx
- frontend/src/components/settings/GeneralTab.jsx
- frontend/src/components/settings/InvestmentProfileTab.jsx
- frontend/src/components/settings/NotificationsTab.jsx
- frontend/src/components/settings/SecurityTab.jsx
- frontend/src/components/shared/Footer.jsx
- frontend/src/components/shared/LoadingSpinner.jsx
- frontend/src/components/shared/Navbar.jsx
- frontend/src/components/shared/Navbar.test.jsx
- frontend/src/components/ui/accordion.jsx
- frontend/src/components/ui/alert.jsx
- frontend/src/components/ui/avatar.jsx
- frontend/src/components/ui/badge.jsx
- frontend/src/components/ui/button.jsx
- frontend/src/components/ui/calendar.jsx
- frontend/src/components/ui/card.jsx
- frontend/src/components/ui/checkbox.jsx
- frontend/src/components/ui/dialog.jsx
- frontend/src/components/ui/dropdown-menu.jsx
- frontend/src/components/ui/input.jsx
- frontend/src/components/ui/label.jsx
- frontend/src/components/ui/popover.jsx
- frontend/src/components/ui/progress.jsx
- frontend/src/components/ui/scroll-area.jsx
- frontend/src/components/ui/select.jsx
- frontend/src/components/ui/separator.jsx
- frontend/src/components/ui/skeleton.jsx
- frontend/src/components/ui/switch.jsx
- frontend/src/components/ui/table.jsx
- frontend/src/components/ui/tabs.jsx
- frontend/src/components/ui/toast.jsx
- frontend/src/components/ui/toaster.jsx
- frontend/src/components/ui/toggle-group.jsx
- frontend/src/components/ui/toggle.jsx
- frontend/src/components/ui/tooltip.jsx
- frontend/src/context/AuthSessionProvider.jsx
- frontend/src/context/DashboardContext.jsx
- frontend/src/context/OnboardingContext.jsx
- frontend/src/context/PersistGate.jsx
- frontend/src/hooks/queries/useNewsQuery.js
- frontend/src/hooks/queries/usePredictionHistoryQuery.js
- frontend/src/hooks/queries/useSearchSymbolsQuery.js
- frontend/src/hooks/queries/useSentimentAnalysisQuery.js
- frontend/src/hooks/queries/useStockOpinionQuery.js
- frontend/src/hooks/queries/useSymbolsQuery.js
- frontend/src/hooks/queries/useTechnicalIndicatorsQuery.js
- frontend/src/hooks/use-toast.js
- frontend/src/hooks/useAuth.js
- frontend/src/hooks/useAuthState.js
- frontend/src/hooks/useDashboard.js
- frontend/src/hooks/useLocalStorage.js
- frontend/src/hooks/useOnboarding.js
- frontend/src/hooks/usePersistentState.js
- frontend/src/hooks/useStorage.js
- frontend/src/lib/queryKeys.js
- frontend/src/lib/utils.js
- frontend/src/lib/utils.test.js
- frontend/src/main.jsx
- frontend/src/pages/CheckEmail.jsx
- frontend/src/pages/Dashboard.jsx
- frontend/src/pages/Dashboard.test.jsx
- frontend/src/pages/ForgotPassword.jsx
- frontend/src/pages/ForgotPassword.test.jsx
- frontend/src/pages/LandingPage.jsx
- frontend/src/pages/LegalCopy.test.jsx
- frontend/src/pages/Login.jsx
- frontend/src/pages/NewsAnalysis.jsx
- frontend/src/pages/NotFound.jsx
- frontend/src/pages/Onboarding.jsx
- frontend/src/pages/PredictionHistory.jsx
- frontend/src/pages/Privacy.jsx
- frontend/src/pages/Profile.jsx
- frontend/src/pages/ResendVerification.jsx
- frontend/src/pages/ResendVerification.test.jsx
- frontend/src/pages/ResetPassword.jsx
- frontend/src/pages/ResetPassword.test.jsx
- frontend/src/pages/Settings.jsx
- frontend/src/pages/Settings.test.jsx
- frontend/src/pages/Signup.jsx
- frontend/src/pages/Terms.jsx
- frontend/src/pages/Unauthorized.jsx
- frontend/src/pages/VerifyEmail.jsx
- frontend/src/pwa.test.js
- frontend/src/sentry.js
- frontend/src/services/__tests__/Login.test.jsx
- frontend/src/services/__tests__/VerifyEmail.test.jsx
- frontend/src/services/__tests__/authService.test.js
- frontend/src/services/__tests__/client.test.js
- frontend/src/services/__tests__/news.test.js
- frontend/src/services/__tests__/stocks.test.js
- frontend/src/services/__tests__/useAuth.test.jsx
- frontend/src/services/__tests__/useAuthMachine.test.jsx
- frontend/src/services/authService.js
- frontend/src/services/client.js
- frontend/src/services/news.js
- frontend/src/services/stocks.js
- frontend/src/test/setup.js
- frontend/src/utils/analytics.js
- frontend/src/utils/apiTransformer.js
- frontend/src/utils/apiTransformer.test.js
- frontend/src/utils/constants.js
- frontend/src/utils/errorHandler.js
- frontend/src/utils/errorHandler.test.js
- frontend/src/utils/helpers.js

### Configuration, workflow and legal files (19)
- .github/workflows/data_pipeline.yml
- .github/workflows/db_maintenance.yml
- .github/workflows/deploy.yml
- .github/workflows/prediction_pipeline.yml
- DISCLAIMER.md
- LICENSE
- docs/wiki/13.1-License.md
- docs/wiki/13.2-Disclaimer.md
- docs/wiki/13.3-Data-Attribution.md
- frontend/package-lock.json
- frontend/package.json
- frontend/vercel.json
- frontend/vite.config.js
- sentiment_driven_stock_price_prediction_engine/.env.example
- sentiment_driven_stock_price_prediction_engine/Dockerfile
- sentiment_driven_stock_price_prediction_engine/entrypoint.sh
- sentiment_driven_stock_price_prediction_engine/render.yaml
- sentiment_driven_stock_price_prediction_engine/requirements-test.txt
- sentiment_driven_stock_price_prediction_engine/requirements.txt

### 16.3 Files skipped and reasons

139 tracked files were not individually opened:

- 79 Markdown files: general wiki/how-to pages and repository documentation outside the legal surfaces required for this audit. The legal attribution, disclaimer, Terms and Privacy surfaces used in this document were read.
- 8 JavaScript files, 8 text files, 7 HTML files and 7 JSON files: generated/vendored or unrelated support assets; package manifests relevant to runtime were enumerated separately.
- 6 SVG, 5 PNG and 2 JPG assets; CSS and webmanifest files: static visual assets, not request-path business logic.
- 1 PTH model, 1 JOBLIB model and 1 PARQUET dataset: binary artifacts were not deserialised or statistically validated. Their tracked paths were inventoried.
- 7 files under the vendored JupyterLab Plotly extension and its supporting package assets: not part of the application request path.
- Remaining root documentation/configuration files such as README, CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, DEPLOYMENT, FRONTEND_AUDIT_LOG, .gitignore and plan.md were not used as evidence for runtime claims.
- The separate local 62-page GitHub wiki repository is not part of this application Git SHA and was not included in this audit.
- Local ignored .env files and their values were not read.
- The local untracked stock-prediction-analytics directory is outside the audited commit and was not included.

### 16.4 Commands run and outputs

| Command or probe | Result |
|---|---|
| git rev-parse HEAD | 881c7c54d8756257f5220d7e74d6a1ea6ebdd72e |
| git branch --show-current | fix/frontend-domain-analytics-consent-2026-11-24 |
| git status --porcelain at start | One deleted plan.md and four modified backend files listed in §1 |
| git rev-parse origin/master | fb4741da (short SHA) |
| git rev-list --left-right --count HEAD...origin/master | 7 2 |
| git ls-tree -r --name-only SHA | 491 tracked files |
| Clean source snapshot | Created from git archive of the audited SHA; no working-tree edits included |
| Backend Python scan | 152 files opened/scanned |
| Frontend JS/TS scan | 181 files opened/scanned |
| Additional config/legal/workflow scan | 19 files opened/scanned |
| Unique read/scanned files | 352 |
| Skipped tracked files | 139 |
| python manage.py check | System check identified no issues |
| python manage.py makemigrations --check --dry-run | No changes detected |
| python manage.py check --deploy | 24 drf-spectacular schema warnings plus one warning caused by the deliberately supplied local audit-only SECRET_KEY; no production secret was used |
| pytest -q --tb=no --disable-warnings | 35 failed, 725 passed, 12 skipped, 21 xfailed; coverage 83.28%; 871 warnings |
| npm ci | Completed; 41 dependency vulnerabilities reported by npm audit (1 critical, 20 high, 15 moderate, 5 low) |
| npm test -- --run | 142 tests passed |
| npm run build | Passed |
| npm run lint | 248 errors and 20 warnings; includes no-undef for activeKey in DeveloperTab |
| npm audit --omit=dev | 23 production dependency vulnerabilities: 1 critical, 13 high, 9 moderate |
| pip install --dry-run -r requirements.txt | Requirements parsed successfully |
| pip check | Local virtual environment reports an extraneous sendgrid-django package conflict with installed SendGrid; sendgrid-django is not declared in the tracked requirements. Treat as environment contamination, not a proven production dependency conflict. |
| Docker image build | Not run; no Docker build result is claimed |
| pip-audit | Not run |
| Production POST/login/email/provider writes | Not attempted |

### 16.5 Live read-only probes

Probe date: 2026-11-25. Hostnames were queried without credentials.

| Request | Observed result |
|---|---|
| GET /api/v1/health/ | HTTP 200; database healthy; cache reported as memory; Redis not configured; Finnhub, Alpha Vantage and RapidAPI reported configured; app version 1.0.0; Django 5.1.5 |
| GET /api/v1/health/readiness/ | HTTP 200; ready |
| GET /api/v1/readiness/ | HTTP 404; this root-level path is not in the audited URL configuration |
| GET /api/v1/stock-analysis/?symbol=AAPL | HTTP 200; response contains disabled/null market-data fields; lastUpdated is present |
| GET /api/v1/technical-indicators/?symbol=AAPL | HTTP 503; public price-data access disabled |
| GET /api/v1/news/get-news/?symbol=AAPL | HTTP 503; public news access disabled |
| GET /api/v1/news/symbol-search/?q=AA | HTTP 200 |
| GET /api/v1/performance/ | HTTP 503 |
| HEAD https://intelligence.tickflowcapital.com | Server header identifies Vercel |
| HEAD https://sentiment-driven-stock-price-prediction.onrender.com | Server header identifies Cloudflare; origin header identifies Gunicorn/Render |
| OPTIONS from production frontend origin | CORS allow-origin returned; credentials allowed |
| OPTIONS from unlisted origin | No Access-Control-Allow-Origin returned |

The audited source places APIKeyMiddleware in MIDDLEWARE and does not list /api/v1/news/ or /api/v1/performance/ in its public path allowlist. The live unauthenticated responses for those paths do not match the expected source middleware short-circuit. A proxy-injected credential, different deployed source, runtime configuration difference or other edge behaviour cannot be excluded. The live deployed SHA and Cloudflare request transformations are unknown; this discrepancy is F-13.

### 16.6 Search evidence for absences

The following searches were run against the audited source tree. “None found” means no matching tracked implementation/configuration was found; it does not prove absence from external services.

- Celery/task queue: search requirements, settings, project startup, celery_app.py, tasks.py and workflows for celery, worker, broker, task queue and dead-letter. Celery app module exists but dependency/import is absent; app tasks.py files are empty.
- Signals: enumerate app Python files for signals.py and signal receiver registration. None found.
- Custom permissions: enumerate app Python files for permissions.py and permission classes. No custom permission module found; views use DRF defaults and per-view declarations.
- Legal acceptance: search models, serializers, views, middleware, frontend routes and legal pages for acceptance/version/hash/terms/privacy. No server-side acceptance record or gate found.
- BYOK: search models, settings, serializers, views, frontend settings and environment names for provider credential storage/proxying. No provider BYOK implementation found.
- Payments: search dependencies, models, URLs, views and frontend source for Stripe, Paddle, PayPal, billing and payment integrations. None found.
- LLM APIs: search dependencies and outbound HTTP calls for OpenAI, Anthropic and LLM provider clients. None found. Hugging Face Transformers performs local model inference.
- Webhooks: search URL patterns and views for webhook endpoints. None found.
- Object storage: search runtime app paths for S3/boto3/storage backends. Only the defective, unintegrated backup script references boto3/S3.
- Backup scheduling: search all GitHub workflows and deployment manifests for backup_db, pg_dump and backup schedule. No scheduled backup invocation found.
- Restore: search tracked scripts and management commands for database restore operations. None found.
- CSP: search Django settings, middleware and frontend hosting configuration for Content-Security-Policy and CSP middleware. None found.
- Alerting: search workflows, settings and dependencies for PagerDuty, Slack, Prometheus, Grafana, Loki and UptimeRobot. None found.
- Legal artefacts: tracked path search for RISK-DISCLOSURE, BYOK-ADDENDUM, NOTICE and legal JSON documents. None found.
- Provider terms/DPAs: search tracked tree for provider ToS, DPA, data redistribution contracts and account plan evidence. None found.
- Production SHA: inspect health/readiness response and response headers. No commit SHA or deployment revision exposed.
