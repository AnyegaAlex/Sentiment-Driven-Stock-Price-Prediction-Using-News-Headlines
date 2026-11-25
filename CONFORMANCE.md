# CONFORMANCE.md

Legal and policy conformance review against source baseline 881c7c54d8756257f5220d7e74d6a1ea6ebdd72e, branch fix/frontend-domain-analytics-consent-2026-11-24.

Verdicts describe repository behaviour at the audited SHA. They are not legal opinions about enforceability. Where a legal claim is not present in the reviewed documents, the row is labelled “if stated” and must be checked against the final approved legal text. External provider terms, DPAs, case law and regulator guidance were not reviewed.

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

## Evidence references

- Terms: frontend/src/pages/Terms.jsx
- Privacy: frontend/src/pages/Privacy.jsx
- Consent UI: frontend/src/components/consent/ConsentManager.jsx
- Application analytics mounting: frontend/src/App.jsx
- Registration and account model: sentiment_driven_stock_price_prediction_engine/authentication/models.py, serializers.py, views.py, urls.py
- API key model and lifecycle: authentication/models.py, authentication/views.py, authentication/middleware.py, authentication/authentication.py
- Deletion lifecycle: authentication/views.py and authentication/urls.py
- Provider calls and licensing flags: settings.py, stocks/opinion_generator.py, stocks/utils.py, news/views.py, news/services/providers.py
- Email: authentication/utils.py and settings.py
- Logging/Sentry: authentication/middleware.py, settings.py, sentry_config.py
- Model configuration: settings.py, news/utils.py, training/train_pipeline.py
- Root licence: LICENSE
- Wiki licence and attribution: docs/wiki/13.1-License.md and docs/wiki/13.3-Data-Attribution.md
- Production observations: read-only probe record in ARCHITECTURE.md §16.5

## Interpretation limits

- CONFORMS means the reviewed code path supports the narrow claim as written. It does not certify the legality of the processing.
- CONFLICTS means code behaviour contradicts the claim or the required implementation is absent.
- UNVERIFIED means source/configuration evidence is insufficient. It is not a positive or negative legal conclusion.
- No provider Terms of Service, DPA, regulator guidance, legal endorsement, registration record or case law was used as evidence. Obtain authoritative documents and counsel review before making legal conclusions.
