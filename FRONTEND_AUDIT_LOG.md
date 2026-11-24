# TickFlow Frontend Audit Log

Date: 2026-11-23
Repository: `/Users/alex/Desktop/Sentiment-Driven-Stock-Price-Prediction-Using-News-Headlines`
Branch at start: `refactor/unified-api-and-backend-fixes`
HEAD at start: `a88e77573a56edba8ab8c233f779365ab8f20db7`

## Safe checkpoint

Before editing, captured the complete pre-existing working state at:

`.git/codex-checkpoints/2026-11-23-before-tickflow-frontend-audit`

It contains the branch, HEAD, porcelain status, separate staged and unstaged binary-capable patches, and a tar archive of untracked files. The initial index had no staged changes. No existing changes were stashed, discarded, or reset. Edits in this audit were limited to `frontend/`; backend, including the TIES-related strategy files, was left untouched.

## Completed: verified defects and fixes

| Area | Finding | Change | Verification |
|---|---|---|---|
| Home routing/navigation | The authenticated app needs Home to return to the workspace. Existing `HomeRoute` sends restored, onboarded users to `/dashboard`, unfinished accounts to `/onboarding`, and signed-out visitors to the public landing page. The authenticated header brand and breadcrumb Home link target the dashboard. | Retained the current route implementation and confirmed coverage for session restoration and all three destinations. | HomeRoute, ProtectedRoute, breadcrumb, and authenticated-navigation tests passed. |
| Session persistence | A fresh login using session-only persistence could leave an earlier persistent token in local storage, allowing a later reload to restore the old remembered session. | Clear the previous storage scope and its `authToken` before writing a newly authenticated session. | Added a regression check for removing old local-storage credentials; auth hook tests passed. |
| Sign-in validation | The submit button was disabled while fields were empty, preventing the page’s own inline validation message from appearing. | Keep the button enabled unless a sign-in request is in progress. | Login page test confirms empty fields are rejected before calling auth; login tests passed. |
| Phone sign-in layout | At a 320px viewport, “Forgot password?” wrapped beside the Password label and made the row visually uneven. | Keep the recovery link from shrinking or wrapping. | Browser screenshot at 320px confirms it stays on one line and the page has no horizontal overflow; login tests and lint pass. |
| Verification first-visit state | With no token, the instruction to enter email/code was styled red as though verification had failed; the code placeholder also clipped at 320px. | Use a neutral style for informational guidance and a concise “6-digit code” placeholder. | Browser screenshot at 320px confirms neutral guidance and compact placeholder; verification tests and lint pass. |
| Timeout and API error copy | Axios timeouts were mapped to network errors; direct Axios status strings and raw transport messages could reach users instead of actionable guidance. | Distinguish timeouts from connection failures; normalize response field errors and avoid showing raw status-line text. Account forms now use shared, status-aware messages. | Added regression cases for timeout, network, retry interval, Axios 400/409, and field details; focused API/auth suite passed. |
| Password recovery and resend copy | Empty reset submission showed duplicate/conflicting validation messages; success copy implied a message was definitely sent. Resend verification discarded the server retry interval. | Show one inline validation message, use account-neutral success copy, and pass the server-provided retry interval through the service and page. | Added recovery and resend regression tests for empty/invalid email, neutral confirmation, and retry interval. |
| Legal and brand copy | The privacy page claimed payment information was collected even though account creation does not request it; displayed brand capitalization varied. | Describe account/profile data and payment requirements based on current screens; standardize visible references to “TickFlow”. | Added legal-copy tests for the privacy statement and consistent Terms branding. |
| Verification error copy | Verification handlers formatted raw client errors in some paths, losing the client’s `error` field and returning generic copy. | Normalize the API error field first, preserve `retryAfter`, and pass normalized errors to the user-facing formatter. Invalid links now receive link-specific guidance. | Verification tests cover invalid link, invalid code, and 429 resend feedback; passed. |
| News thumbnails | Failed article images switched to `/placeholder-news.jpg`, but there is no `public/` directory or matching image asset in the frontend. | Added `NewsArticleImage`, which falls back to an in-app newspaper icon for missing or failed image URLs. | New tests cover provider image, failed image, and no-image cases; all 3 passed. |
| Onboarding flow | Three steps accepted an `isLoading` prop, but the container passed `loading`, leaving actions active during save/finalization. “Skip” also ambiguously completed all setup in some steps and skipped only the tour in another. A refresh at the tour lost the saved persona context, and an obsolete saved step could leave no step rendered. | Wired the loading prop correctly; clarified actions as “Skip setup” or “Skip tour”; restore persona context from the account; and validate saved step names, falling back to Welcome if an old step is unknown. | Added three component and three container-level regression checks; focused lint passed. |
| Test fixtures | Some page tests expected retired copy and successful sign-in fixtures omitted the verified-email flag. The login mock also omitted a newly imported error formatter export. | Updated fixtures/assertions to match current verified-user routing and current copy; retained semantic checks and did not skip or reduce coverage. | Full suite passed. |

## Review coverage

Reviewed route and navigation paths, sign-in/session restoration, onboarding actions and progress, shared error/loading states, breadcrumbs, symbol search, news cards, API transforms, and representative dashboard, settings, profile, landing, and auth flows. Browser-checked public landing at desktop and phone widths; auth screens (sign-in, signup, forgot/reset password, check-email, verification, resend, privacy, terms) at 320px. Corrected two reproducible mobile auth layout/state defects. Scanned landing/data cards for unsupported sample figures; the API demo labels its content as request patterns, not live sample responses. Authenticated workspace screens cannot be rendered without a real account, so responsive dashboard/profile/settings layouts remain unverified. This remains a risk-based review, not a visual review of every component.

## Verification results

- Focused navigation/error/search checks: 17 tests passed.
- Latest focused Login and VerifyEmail checks: 18 tests passed; targeted ESLint on the four touched source/test files passed.
- Latest complete frontend suite: 26 test files, 119 tests passed. The initial run caught an overbroad assertion in the new privacy-copy test; the assertion was narrowed to the obsolete payment-collection claim and the full suite then passed.
- Latest production build: passed; 5,310 modules transformed. Build reports outdated Browserslist data and a large main bundle.
- Targeted ESLint for the shared error/auth source and test subset: passed. Targeted onboarding and earlier auth/news checks also passed. A broader lint pass across all touched files still reports existing issues, including `activeKey` undefined in DeveloperTab and missing prop-type declarations.
- Repository-wide lint: failed with 271 errors and 20 warnings. The output includes widespread missing `react/prop-types` checks in shared UI primitives, unused imports, and Node globals in Vite/Vitest config. No rules were disabled or relaxed.
- Type check: not configured. The frontend has no TypeScript files and no `typecheck` script.
- Browser review: landing at 1280px and phone widths; sign-in, signup, recovery, verification, resend, and legal routes at 320px. No credentials were entered and no auth/API submission was made.
- Automated end-to-end journeys: unverified. The frontend has no Playwright/Cypress configuration or E2E script/dependency; available automated journey coverage is Vitest with jsdom.

## Blocked

- Full repository lint is blocked by the current broad lint backlog (271 errors). It needs a separate scoped cleanup across many shared UI and configuration files; this audit did not mass-edit unrelated files or weaken lint rules.

## Unverified

- Cross-browser behavior, visual review of every component, screen-reader announcements, and live-backend journeys remain unverified. Responsive authenticated workspace pages were not viewed because no real account was used.
- No live login credentials or real account were used; auth and API journeys were exercised with test fixtures only.
- At 320px the sign-in document width stays within the viewport. The local Vite preview shows a development-tools button that may overlap lower content; it is absent from production builds.

## Follow-up: motion, navigation, and interaction review (2026-11-24)

| Area | Finding | Change | Verification |
|---|---|---|---|
| Brand mark | The TFI mark still sat on an opaque square in the navigation, auth screens, footer, and browser icon. | Removed the tile/background from the shared mark and kept the white TFI letters plus teal trend accent. Regenerated the SVG favicon and transparent 180×180 Apple touch icon. | Checked the rendered icon; production output contains both icon files. |
| Public navigation readability | The fixed public navigation became transparent over page content, making its contrast depend on what scrolled behind it. | Kept a dark translucent surface with backdrop blur at the top and while scrolled; gave the mobile menu the same surface. | Visually reviewed desktop and 390px mobile layouts in a browser. |
| Breadcrumb interaction (superseded by the correction below) | Breadcrumb links had only a text-color change on hover. | The prior pass mistakenly added a background and lift. The correction below removes both and uses only text highlight plus underline. | See the correction and regression assertion below. |
| Reduced motion | App-level CSS animations and transitions ran without honoring the system reduced-motion setting. | Added a global prefers-reduced-motion override for animation, transition, and smooth scrolling. | Confirmed it is included in the production CSS build. |
| Mobile navigation | Verified menu open/close and route-selection interaction. | No additional behavior change was needed. | Added tests for Escape with focus restoration, clicking outside, and choosing a link. In the browser, opened the mobile menu, dismissed it with Escape, then followed Create account → Sign in → Forgot password without entering credentials or submitting a form. |

### Follow-up verification

- Focused breadcrumb and mobile navigation checks: 2 files, 5 tests passed.
- Complete frontend suite: 27 files, 122 tests passed.
- Targeted ESLint for the updated navigation/brand files and tests: passed.
- Production build: passed; 5,311 modules transformed; favicon and Apple touch icon copied to dist/.
- Browser smoke review: public landing page at desktop and 390×844 mobile sizes; menu and public auth route navigation worked. No authentication, password reset, external API request, or live account action was submitted.
- Full browser journeys through authenticated workspace pages remain unverified because no test account or browser E2E framework is configured. Repository-wide git diff --check reports whitespace in pre-existing unrelated files; none were changed as part of this follow-up.


## Follow-up: installable PWA and site interaction polish (2026-11-24)

| Area | Finding | Change | Verification |
|---|---|---|---|
| PWA install assets | The frontend had no install manifest or offline entry point. | Added an installable standalone manifest, separate opaque 192px/512px app tiles, Apple touch icon, and an offline page. Kept the website brand mark/favicon transparent. | PWA asset tests validate manifest metadata and PNG dimensions. Production build succeeded and the browser confirmed the manifest and Apple icon links. |
| Offline cache safety | Offline support could accidentally make API or account state stale. | Added a same-origin GET-only service worker. It serves navigation from network with cached app/offline fallback, caches static assets, and explicitly skips API/auth paths and external requests. | Static service-worker policy and syntax tests passed. Runtime registration/control could not be confirmed in the embedded browser because its page evaluator does not expose `navigator`; marked unverified. |
| Breadcrumb hover | The previous hover treatment used a background, contrary to the requested visual. | Replaced it with a cyan text highlight and underline only, with no hover background or lift; retained focus and 44px target styling. | Breadcrumb regression test asserts underline and absence of hover background. |
| Motion preferences | Framer Motion and confetti were outside the existing reduced-motion CSS override. | Added user-preference handling to Motion and suppressed onboarding confetti for reduced-motion users. | Onboarding tests pass with the reduced-motion hook represented in its mock; global CSS override remains in the production bundle. |
| Click and hover feedback | Some controls looked interactive when sorting was disabled; clickable rows had weak feedback and bubbled nested actions. | Sort headers now indicate interaction only when sortable. Prediction rows expose keyboard activation, labels, hover/active feedback, and avoid triggering from nested controls. Investment cards and key-phrase buttons have clearer hover/hit-target feedback. | Focused interaction suite passed. |

### Follow-up verification

- Focused tests: 5 files, 13 tests passed.
- Complete frontend Vitest suite: 29 files, 127 tests passed.
- Targeted ESLint across touched files: passed after adding the missing prediction-table prop declarations and removing unused imports.
- Production build: passed; 5,311 modules transformed. Build still reports stale Browserslist data and a large output chunk.
- Browser preview: public landing rendered, manifest and Apple icon links present, and Sign in navigated to the expected form. No credentials were entered or submitted.
- Authenticated, live-data, real offline-disconnect, cross-browser, and screen-reader journeys remain unverified. The embedded browser does not expose service-worker runtime APIs, and the frontend has no configured browser E2E runner/test account.



## Follow-up: public navigation background match (2026-11-24)

- Updated the desktop header and mobile navigation panel to use the site's solid black page background. Kept the scrolled-state divider for separation and preserved existing text contrast and hover/focus states.
- Navbar interaction suite: 1 file, 3 tests passed.


## Follow-up: authenticated header transparency and responsive layout (2026-11-24)

- The screenshot showed the authenticated workspace header using an opaque gray fill over a black page. Changed it to a transparent background with no default divider.
- Kept the brand/account row and placed navigation plus stock search below it until the `lg` breakpoint, avoiding the previous cramped single row on tablets. Reduced the brand title size and hid its subtitle on narrow screens.
- ESLint passed for `Header.jsx` and `BrandNameCard.jsx`; production build passed.
- Visual browser verification of this authenticated header was unavailable without a signed-in browser session; verified the generated build instead.
