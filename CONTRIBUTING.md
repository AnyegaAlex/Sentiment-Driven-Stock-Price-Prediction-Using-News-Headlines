# Contributing to Tickflow Intelligence

Thank you for considering a contribution to Tickflow Intelligence. Bug reports, documentation improvements, tests, and code contributions are welcome.

Before contributing, please read the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

1. Check the [open issues](https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/issues) to see whether the work is already being discussed.
2. For a significant change, open an issue first so the proposed approach can be discussed before implementation.
3. Do not include credentials, API keys, private user data, production database contents, or generated secrets in commits or issue reports.

## Repository layout

```text
.
├── frontend/                                      # React and Vite application
├── sentiment_driven_stock_price_prediction_engine/ # Django REST API and backend tests
├── docs/                                          # Project documentation
├── .github/                                       # Issue templates, PR template, workflows
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
└── README.md
```

## Set up a development environment

## 2. Find or propose an issue

- Git
- Python 3.12 or a version supported by the backend dependencies
- Node.js 20 or later and npm
- PostgreSQL for a local database
- Redis only if you are working on functionality that uses it

### 1. Fork and clone

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/Tickflow-Capital-Intelligence.git
cd Tickflow-Capital-Intelligence
```

Keep the upstream repository available as `upstream` if you plan to sync your fork:

```bash
git remote add upstream https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence.git
```

### 2. Set up the backend

The Django project and its `manage.py` file are inside `sentiment_driven_stock_price_prediction_engine/`.

```bash
cd sentiment_driven_stock_price_prediction_engine
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
# .venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-test.txt  # needed for the backend test suite
cp .env.example .env
```

Edit `.env` with local development values. Do not commit this file or use production credentials. Configure a reachable PostgreSQL database and any external API credentials required by the feature you are testing.

Apply migrations and start Django:

```bash
python manage.py migrate
python manage.py runserver
```

The API will normally be available at `http://127.0.0.1:8000/`.

### 3. Set up the frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm install
```

Create or update `.env.development` with the local API configuration required by the frontend. Do not commit local environment files or secrets.

Start the Vite development server:

```bash
npm run dev
```

The frontend will normally be available at `http://localhost:5173/`.

## Make a change

Create a focused branch from the repository's default branch (`master`):

```bash
git checkout master
git pull upstream master
git checkout -b feature/short-description
```

Use `fix/short-description` for bug fixes and `docs/short-description` for documentation-only changes.

Keep changes focused. Avoid unrelated formatting, generated files, dependency upgrades, or changes to model behaviour in a contribution that does not require them.

## Coding guidelines

- Follow the existing conventions and architecture in the affected area.
- Python: follow PEP 8 and the project's existing Django patterns.
- JavaScript and React: follow the existing component patterns and ESLint configuration.
- Keep API contracts and authentication behaviour backward-compatible unless a breaking change is explicitly proposed and documented.
- Handle errors in a way that gives users a clear, actionable message without exposing secrets or internal details.
- Add or update tests for changed behaviour.
- Update relevant documentation when setup, configuration, API behaviour, or user workflows change.
- Do not commit `.env` files, credentials, local databases, build output, coverage output, or personal data.

## Run tests and checks

Run the checks relevant to the files you changed before opening a pull request.

### Backend

From the backend directory:

```bash
cd sentiment_driven_stock_price_prediction_engine
pytest
```

If a change affects Django behaviour that is not covered by the pytest suite, also run the relevant Django tests:

```bash
python manage.py test
```

### Frontend

From the frontend directory:

```bash
cd frontend
npm test -- --run
npm run build
npm run lint
```

The lint command checks the frontend project and may report pre-existing issues outside the files changed by your contribution. Report those separately rather than suppressing unrelated rules.

### Documentation

Check that Markdown code fences are balanced, local links point to existing files, and command examples use the repository's current paths and scripts.

## Commit messages

Use clear, descriptive commit messages. Conventional Commit prefixes are encouraged:

```text
feat(frontend): add watchlist filters
fix(api): handle expired API keys
docs: clarify local setup
 test(frontend): cover consent preferences
refactor(auth): simplify token refresh handling
chore(deps): update development tooling
```

Do not include a leading space in the commit type. Keep each commit focused on one logical change.

## Open a pull request

1. Run the relevant tests and checks.
2. Review your diff and remove unrelated or generated files.
3. Push your branch to your fork:

   ```bash
   git push -u origin feature/short-description
   ```

4. Open a pull request against `master` in the [Tickflow Capital Intelligence repository](https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/pulls).
5. Complete the pull request template in `.github/PULL_REQUEST_TEMPLATE.md`.

A useful pull request description explains:

- What changed and why.
- How the change was tested, including commands and results.
- Any configuration or migration steps required.
- Screenshots or recordings for visible frontend changes.
- Related issue numbers and known limitations.

Keep pull requests reviewable. One logical change per pull request is preferred. Maintainers may request revisions before merging.

## Reporting bugs and requesting features

- [Report a bug](https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/issues/new?template=bug_report.md)
- [Request a feature](https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/issues/new?template=feature_request.md)
- [Browse existing issues](https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/issues)

For security-sensitive reports, do not publish exploit details, credentials, or private data in a public issue. Use the repository's private security reporting channel where available.

## Questions

For project questions, open a GitHub issue with enough detail to reproduce the problem or understand the proposal. Please do not post API keys, passwords, tokens, or private user information.

Thank you for helping improve Tickflow Intelligence.
