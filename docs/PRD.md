# PRD: Personal Finance Manager (Personal-only)

## Objective

Reduce discretionary spend, stabilise cashflow, and build sustainable saving habits through data-driven analysis of bank statement exports.

## Problem Statement

Most people leak money through subscriptions they forgot about, eating out habits they underestimate, and convenience spending they don't track. This app makes those leaks visible and actionable.

## Non-goals (explicit)

- No banking login / Open Banking integrations in V1
- No investment, tax, or legal advice
- No PDF parsing in V1 (CSV only)
- No multi-user / shared accounts
- No LLM integration in V1 (deterministic rule engine only)

## Inputs

- CSV exports from bank statements (standard column formats)
- Manual category overrides (V1.1)

## Outputs

- Normalised transaction database
- Cashflow metrics (income, expense, net, avg daily spend)
- Category breakdown with percentages
- Merchant breakdown ranked by spend
- Recurring payment / subscription detection
- Anomaly detection (unusual transactions)
- Monthly trend analysis
- Data export (CSV, JSON)

## MVP Features (must-have)

| # | Feature | Priority |
|---|---------|----------|
| 1 | CSV upload with auto-detect columns | P0 |
| 2 | Transaction normalisation (date, description, amount) | P0 |
| 3 | Deterministic rule-based categorisation (17 default rules) | P0 |
| 4 | Category analytics with pie chart and breakdown | P0 |
| 5 | Merchant analytics ranked by total spend | P0 |
| 6 | Recurring/subscription detection (heuristic) | P0 |
| 7 | Data export (CSV + JSON) | P0 |
| 8 | Daily cashflow area chart | P0 |
| 9 | Monthly income vs expense trends | P0 |
| 10 | Anomaly detection (statistical outliers) | P1 |
| 11 | Privacy guardrails (account number redaction) | P0 |
| 12 | Test suite with 60+ unit tests | P0 |
| 13 | Audit documentation pack | P0 |

## Acceptance Criteria

- Importing a valid CSV creates transactions with correct totals
- Category totals match the sum of underlying transactions
- Recurring detector flags obvious monthly subscriptions (3+ occurrences, ~30 day interval)
- No crashes on empty/partial/malformed CSVs
- Account numbers are redacted (last 4 digits only)
- All unit tests pass
- Build completes without errors

## Architecture

- **Frontend**: Next.js 14 with App Router, React 18, TypeScript, Tailwind CSS
- **Charts**: Recharts
- **CSV Parsing**: PapaParse
- **Storage**: JSON file-based (`.data/` directory)
- **Testing**: Jest + ts-jest

## Security & Privacy

- Personal-only: no bank logins, no API integrations
- No secrets stored in code
- Account numbers redacted to last 4 digits
- Email addresses sanitised from descriptions
- Data stays on device / server (no external transmission)
