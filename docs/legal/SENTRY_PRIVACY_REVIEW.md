# Sentry Privacy and Security Review

**Review date:** 25 November 2026
**Scope:** TickFlow Capital Limited Sentry SaaS organisation and the isolated Stage B remediation worktree.
**Production changes:** None. Dashboard inspection was read-only; code changes remain uncommitted and undeployed.

## 1. Organisation and projects observed

- Organisation: TickFlow Capital Limited
- Sentry organisation region shown in the dashboard: EU
- Plan shown: Developer
- Projects:
  - `tickflow-sentiment-backend` (Django/Python)
  - `tickflow-sentiment-frontend` (React/JavaScript)
- Both project Allowed Domains fields were set to `*`.
- No source repositories were connected to the projects.
- The organisation has one active team (`#tickflowcap`) with one member and a second empty team (`#digital-dynamo-kenya`).
- The account holder was shown as organisation Owner.

Do not treat the Sentry EU region as meaning all Sentry data stays in the EU. Sentry says its EU data centre is in Frankfurt, Germany, with backups within the EU, and notes that some data may be stored outside the selected region in the US. The exact out-of-region data categories must be checked in Sentry's data-location documentation.

## 2. Organisation security settings observed

The following were disabled in the organisation Security & Privacy settings:

- Require Two-Factor Authentication
- Enhanced Privacy
- Require Data Scrubber
- Require Using Default Scrubbers
- Prevent Storing of IP Addresses

The following were also observed:

- Store Minidumps as Attachments: disabled
- Allow Join Requests: disabled
- Allow Shared Issues: disabled
- Global Sensitive Fields: `email`, `username`, `persona`, `investment_goal`, `risk_tolerance`, `experience_level`
- Global Advanced Data Scrubbing rule: replace email addresses in `$message` with `[[email]]`
- Global Safe Fields: empty

The email rule is limited to the message source. It does not establish that email addresses are scrubbed from every event field, context, breadcrumb, exception, or attachment. Sentry's documentation explains that additional sensitive fields and advanced rules apply to specific event sources, and that SDK-side scrubbing is required when data must not leave the application.

## 3. Project-level settings observed

For both projects:

- Allowed Domains: `*`
- Verify TLS/SSL: enabled
- Spike Protection: enabled
- Release Auto-Creation: enabled
- Auto Resolve: disabled
- Store Minidumps as Attachments: inherited as disabled
- Project Data Scrubber: disabled
- Project Default Scrubbers: disabled
- Project IP Storage Prevention: disabled

Backend project had SCM Source Context enabled; frontend had it disabled. Neither project had a repository connected.

The frontend project's wildcard domain allowlist should be restricted to the production application hostname after confirming every legitimate browser origin. Backend project domain restrictions should be reviewed separately because the browser Allowed Domains control is primarily relevant to browser SDK event submission.

## 4. Retention and data location

The dashboard did not expose an explicit event-retention value. Sentry's current help documentation states that the Developer plan retains event data for 30 days. Sentry audit-log retention is separate and is documented as indefinite. Confirm the current subscription page before copying these values into a final legal notice.

The organisation is shown in the EU region. Sentry documents Frankfurt, Germany as the EU event-data location, with backups within the EU. Sentry also states that some data may be stored outside the selected region in the US; the exact categories must be checked in its data-location documentation. This is a cross-border processor disclosure item for the Kenya privacy review.

References:
- https://www.sentry.help/en/articles/13964378-sentry-s-eu-region-faq
- https://www.sentry.help/en/articles/13965013-where-are-your-data-servers-located
- https://www.sentry.help/en/articles/13964940-how-long-are-my-organization-s-audit-logs-stored
- https://www.sentry.help/en/articles/13964336-why-does-the-event-count-in-my-issue-not-match-up-with-the-count-in-the-all-events-tab-of-the-issue
- https://www.sentry.help/en/articles/13964268-what-are-sentry-s-data-scrubbing-options
- https://sentry.io/changelog/default-event-pii-fields-scrubbed/

## 5. SDK source review

### Backend

The backend Sentry initializer already sets `send_default_pii` from `SENTRY_SEND_PII`, whose Django setting defaults to false in the current worktree. The prior default had been true and could send request headers and user context.

The backend helper `set_user_context` was defined but no call sites were found in the repository search. It previously included user ID, username, email, subscription tier, and persona. In the Stage B worktree it now always clears Sentry user context, regardless of the `SENTRY_SEND_PII` setting.

The backend helper `set_request_context` was defined but no call sites were found. It previously included IP address and user-agent. In the Stage B worktree it now records method and route template only, avoiding concrete paths that may contain account identifiers or verification tokens.

The backend event scrubber recursively redacts credentials and email addresses. In the Stage B worktree its sensitive-key list also covers IP/device identifiers, and the Sentry `before_send` hook removes query strings and fragments from request URLs before the event is sent.

Backend profiling was configured at a 10% default in code, and the `SENTRY_ENABLE_PROFILING` setting was not being used to gate the SDK option. In the Stage B worktree, profiling is disabled by default and the sample rate is zero unless explicitly enabled.

### Frontend

The frontend Sentry initializer sets `sendDefaultPii: false`. Its request scrubber already removed authorization/cookie headers, request bodies, and URL query strings. The Stage B worktree adds recursive event scrubbing for email addresses, credentials, IP/device fields and sensitive context keys, removes structured user identity, and sanitizes exception context and breadcrumbs.

The frontend `setSentryUser` helper previously attached account ID and username. In the Stage B worktree it clears user context rather than transmitting those identifiers.

### Deployment caveat

These are source-code findings and worktree changes. They do not prove which environment variables or code version are currently active in Render or Vercel. Production effectiveness must be confirmed after deployment and a safe test event.

## 6. Sentry data observed in issue metadata

The dashboard showed approximately 3.6K accepted backend errors and 40 accepted frontend errors for the inspected 30-day dashboard period, plus 47 backend rate-limited events. These are dashboard counts, not a count of unique incidents.

Some unresolved issue summaries looked like development or test traffic, including localhost Vite URLs, test-like exception messages, and test/database-configuration errors. This suggests production project/environment separation and inbound filtering need review. The issue list alone does not prove these events were generated by the current production deployment.

One database connection error summary included a Neon pooler hostname in AWS US East (Ohio) rather than the Singapore region the business expects. This may be an old event or a non-production environment. Verify the active Render database host and Neon project region before making a definitive data-location statement.

## 7. Required actions before publication

### Code changes prepared in the Stage B worktree

- Keep backend `SENTRY_SEND_PII=false`.
- Remove explicit email, username, persona, IP and user-agent from application-added Sentry context.
- Redact sensitive event fields and request URLs before transmission.
- Disable backend profiling by default.
- Sanitize frontend event payloads, exception context and breadcrumbs.
- Add regression tests for both SDK paths.

### Dashboard actions still requiring approval

1. Enable organisation-level Require Data Scrubber.
2. Enable organisation-level Require Using Default Scrubbers.
3. Enable organisation-level Prevent Storing of IP Addresses.
4. Enable Enhanced Privacy to limit PII and source code in notifications; verify that alert messages still contain the operational context the team needs.
5. Add sensitive field names for account IDs, IP addresses and user-agent/device identifiers.
6. Add Advanced Data Scrubbing rules for exception values, formatted log messages and request user-agent fields. Sentry removed `Event.exceptions.value`, `Event.logentry.formatted` and `Event.request.headers.user-agent` from its default scrubber field list in April 2025, so enabling default scrubbers alone does not cover those sources.
7. Restrict the frontend project's Allowed Domains to the verified production app origin(s).
8. Enforce two-factor authentication after confirming all organisation members can comply.
9. Review Replay settings and restrict Replay access if Replay is enabled.
10. Inspect actual alert rules and decide whether production alerts are needed.

No dashboard settings were changed during this review.

### Evidence still required

- Confirm the active production Sentry environment labels and separate development/staging from production.
- Confirm actual Render/Vercel environment variable values without exposing secrets.
- Confirm active production release/version matches the reviewed worktree after deployment.
- Verify Sentry event retention in the account subscription UI.
- Verify Sentry DPA and subprocessor terms against Kenya cross-border transfer requirements.
- Verify whether Session Replay, User Feedback, and Profiling are enabled by SDK configuration or project-level settings.
- Verify whether the Neon endpoint seen in the historical event is still in use.

## 8. Test evidence

The following targeted tests passed in the isolated worktree:

- Backend Sentry privacy and log-safety tests: 28 passed.
- Frontend Sentry privacy tests: 3 passed.
- Full frontend suite: 160 passed across 36 test files.
- Frontend production build: passed.
- Backend Python compile check: passed.

These tests validate the reviewed code paths only. They do not prove production deployment or server-side Sentry settings.

## 9. Project inventory and issue-feed reconciliation

A second read-only inventory confirmed there are exactly **two Sentry projects**:

- `tickflow-sentiment-backend` — Django, assigned to `#tickflowcap`
- `tickflow-sentiment-frontend` — React, assigned to `#tickflowcap`

The labels in issue rows such as `TICKFLOW-SENTIMENT-BACKEND-6J`, `BACKEND-3C`, and `FRONTEND-Q` are issue identifiers, not additional projects. The organisation also has an empty `#digital-dynamo-kenya` team.

The project overview showed the following for the 14-day period:

- Backend: 55 errors, 130 transactions, 95.9% crash-free sessions.
- Frontend: 3 errors, 20 transactions, 90.0% crash-free sessions.

The issue feed showed 118 unresolved issues in its 14-day view. These figures are different dashboard metrics and must not be added together or treated as unique affected users.

Both projects allow all domains (`*`). Both show release auto-creation enabled, but the latest release displayed was `1.0.0` dated July 18 (year not visible). No explicit environment configuration was visible in the project settings. The word `Unhandled` shown in issue rows is an issue status, not a Sentry environment label.

## 10. Issue triage findings

The 14-day issue follow-up identified:

- Development/test indicators: Vite `localhost:5173` dynamic-import errors; explicit `Test error` and `boom` messages; and repeated events with loopback IPs and test-user labels. These are likely development/test traffic, but the loopback address alone is not definitive proof of source.
- Database configuration: two recent `ImproperlyConfigured` issues reported a missing database engine. Their exact environment was not visible.
- Neon pooler: three `OperationalError` issue groups reported quota exhaustion and referenced the same `us-east-2` Neon pooler hostname. They were last seen one day before this review; one issue had been present for approximately three months. This conflicts with the expected Singapore Neon deployment and requires verification against the active production connection string and Neon project region.
- Other production-relevant errors: a missing Django admin staticfiles manifest entry (307 events); LSTM model loading, network and CUDA failures; and recent frontend runtime errors.

The follow-up issue feed did not expose a reliable environment field for these rows. Production/test classification is therefore based on issue content and observed request metadata, not verified Sentry environment tags.

## 11. Environment isolation changes prepared in the Stage B worktree

To stop development and test events contaminating the production projects:

- Backend Sentry is disabled when Django `DEBUG=True`, unless `SENTRY_ENABLE_IN_DEBUG=true` is explicitly set. Local capture must use a dedicated development DSN.
- Backend environment labels now honour an explicitly configured `SENTRY_ENVIRONMENT`; hosting provider names such as `render` are no longer substituted for `production`.
- Frontend Sentry is disabled in Vite development mode by default. Local capture requires `VITE_SENTRY_ENABLE_IN_DEV=true` and a dedicated development DSN.
- Frontend environment defaults to `development` under Vite and `production` in production builds.
- Backend `.env.example` now leaves the DSN blank and sets profiling off by default.
- A frontend `.env.example` documents the development opt-in.

Render's Blueprint declares `SENTRY_ENVIRONMENT=production`, `SENTRY_SEND_PII=false`, and profiling disabled. The actual deployed service values and Vercel build-time variables still need dashboard verification. No production deployment or Sentry setting change was performed.
