# Contributing to Tickflow Capital Intelligence

Thank you for considering a contribution. Bug reports, focused improvements, documentation corrections and tests are welcome.

## 1. Before contributing: intellectual property

Tickflow Capital Limited intends to maintain this repository as a company-owned open-source project.

**Do not submit a contribution for merging until the Company has provided and approved its Contributor Intellectual Property Assignment and the contributor has signed it.** Any statutory recordal required by Kenyan law must also be completed before the contribution is represented as company-owned.

The current repository licence is MIT and currently names an individual copyright holder. The transfer of existing project rights to the Company is being documented separately. Do not change the LICENSE notice or claim that company ownership is complete until the assignment and KECOBO recordal are complete.

The Company intends to continue distributing accepted project code under the MIT License. Existing valid MIT licences granted to the public will be respected. The MIT licence does not grant rights to Tickflow Capital trademarks, third-party market data, provider SDKs or materials excluded from that licence.

The contributor assignment template is in docs/legal/CONTRIBUTOR_IP_ASSIGNMENT_TEMPLATE.md. It is a draft and must be approved by Kenyan counsel before use.

## 2. Find or propose an issue

- Review existing issues: https://github.com/AnyegaAlex/Tickflow-Capital-Intelligence/issues
- Use labels such as good-first-issue, help-wanted, bug or enhancement where appropriate.
- For substantial changes, open an issue first so maintainers can agree on scope.
- Do not post secrets, customer data, personal data or confidential information in a public issue.

## 3. Development setup

### Backend

~~~bash
cd sentiment_driven_stock_price_prediction_engine
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
~~~

Use a local development environment file. Never copy production credentials into a local file committed to Git.

### Frontend

~~~bash
cd frontend
npm install
npm run dev
~~~

### Docker

~~~bash
docker-compose up --build
docker-compose exec web python manage.py migrate
~~~

## 4. Branching and coding standards

Create a focused branch:

~~~bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
~~~

- Python: follow PEP 8 and the project's existing conventions.
- JavaScript/React: follow the configured ESLint rules and existing component patterns.
- Keep changes focused and avoid unrelated formatting churn.
- Do not log passwords, API keys, tokens, email verification codes or unnecessary personal data.
- Use structured logging and avoid interpolating untrusted or sensitive values into log messages.
- Document new environment variables in the relevant example/configuration file without including real values.
- Do not add third-party code, fonts, images, datasets or models without recording provenance and licence compatibility.
- Disclose generated code, external assistance, employer/client ownership or other restrictions that could affect the rights being assigned.

## 5. Commit messages

Use Conventional Commits:

~~~text
<type>(<scope>): <description>
~~~

Common types:

- feat: new feature
- fix: bug fix
- docs: documentation
- style: formatting only
- refactor: code restructuring
- test: tests
- chore: maintenance

Example:

~~~text
feat(api): add stock comparison endpoint
~~~

## 6. Tests and validation

Run the relevant tests before opening a pull request.

### Backend

~~~bash
cd sentiment_driven_stock_price_prediction_engine
python -m pytest
python manage.py check
python manage.py makemigrations --check --dry-run
~~~

### Frontend

~~~bash
cd frontend
npm test -- --run
npm run build
npm run lint
~~~

Add tests for behavior changes. A pull request should not claim a check passed unless it was actually run.

## 7. Pull request requirements

- Keep one logical change per pull request.
- Explain the problem, implementation and any operational impact.
- Include tests for changed behavior.
- Update documentation and example environment variables where needed.
- Link related issues.
- Identify database migrations and any deployment steps.
- Disclose third-party dependencies and licence implications.
- Obtain maintainer review and address requested changes.
- Do not merge until the required contributor IP agreement is signed and recorded.

## 8. Useful commands

~~~bash
# Backend
python manage.py runserver
python manage.py shell
python manage.py migrate
python -m pytest

# Frontend
npm run dev
npm run build
npm run lint
npm test -- --run

# Docker
docker-compose up --build
docker-compose exec web python manage.py migrate
~~~

## 9. Getting help and recognition

Use GitHub issues for bugs and feature requests. For sensitive security or ownership matters, contact the maintainers privately rather than publishing details.

Contributors may be recognised in the README, changelog and GitHub contributors list, subject to their preferences and the project's attribution obligations.
