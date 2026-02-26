# Traceability Matrix

Links every requirement to its implementation, tests, and verification status.

| Req ID | Requirement | Code Owner | Tests | Status |
|-------:|-------------|------------|-------|--------|
| R1 | CSV upload with file validation | `src/app/api/upload/route.ts`, `src/app/upload/page.tsx` | `importer.test.ts` (17 tests) | PASS |
| R2 | Normalise to standard schema (date, desc, amount, merchant, category) | `src/lib/importer.ts` | `importer.test.ts` (date parsing, amount parsing, merchant extraction, validation) | PASS |
| R3 | Auto-detect column headers (date, description, amount, debit/credit) | `src/lib/importer.ts` (`findColumn`) | `importer.test.ts` (basic CSV, debit/credit format) | PASS |
| R4 | Deterministic rule-based categorisation (18 rules) | `src/lib/categoriser.ts` | `categoriser.test.ts` (17 tests) | PASS |
| R5 | Category analytics (breakdown, percentages) | `src/lib/analytics.ts` (`computeCategoryBreakdown`) | `analytics.test.ts` (4 tests) | PASS |
| R6 | Merchant analytics (ranked by spend) | `src/lib/analytics.ts` (`computeMerchantBreakdown`) | `analytics.test.ts` (2 tests) | PASS |
| R7 | Cashflow metrics (income, expense, net, avg daily) | `src/lib/analytics.ts` (`computeCashflow`) | `analytics.test.ts` (7 tests incl. zero-amount, float drift) | PASS |
| R8 | Daily spend aggregation | `src/lib/analytics.ts` (`computeDailySpend`) | `analytics.test.ts` (2 tests) | PASS |
| R9 | Monthly trend analysis | `src/lib/analytics.ts` (`computeMonthlyTrends`) | `analytics.test.ts` (1 test) | PASS |
| R10 | Recurring/subscription detection (5 cadences) | `src/lib/recurring.ts` | `recurring.test.ts` (9 tests incl. fortnightly, quarterly) | PASS |
| R11 | Anomaly detection (statistical outliers) | `src/lib/analytics.ts` (`detectAnomalies`) | `analytics.test.ts` (2 tests) | PASS |
| R12 | Data export (CSV) with injection protection | `src/lib/export.ts`, `src/app/api/export/route.ts` | `export.test.ts` (4 tests incl. formula injection) | PASS |
| R13 | Data export (JSON) | `src/lib/export.ts`, `src/app/api/export/route.ts` | `export.test.ts` (2 tests) | PASS |
| R14 | Privacy: account number redaction | `src/lib/privacy.ts`, `src/app/api/upload/route.ts` | `privacy.test.ts` (3 tests) | PASS |
| R15 | Privacy: email sanitisation | `src/lib/privacy.ts`, `src/app/api/upload/route.ts` | `privacy.test.ts` (2 tests) | PASS |
| R16 | Dashboard UI (metrics, charts, tables) | `src/app/page.tsx`, `src/components/charts/*` | Build verification | PASS |
| R17 | Transaction listing with search/filter | `src/app/transactions/page.tsx`, `src/app/api/transactions/route.ts` | Build verification | PASS |
| R18 | Analytics page with tabs (categories, merchants, trends) | `src/app/analytics/page.tsx` | Build verification | PASS |
| R19 | Recurring payments page (5 cadences) | `src/app/recurring/page.tsx` | Build verification | PASS |
| R20 | Clear all data with CSRF-protected endpoint | `src/app/api/transactions/route.ts` (DELETE), `src/app/upload/page.tsx` | Build verification | PASS |

## Coverage Summary

- **Total requirements**: 20
- **Covered by unit tests**: 15 (R1-R15)
- **Covered by build verification**: 5 (R16-R20)
- **Test suites**: 6
- **Total unit tests**: 72
- **All tests passing**: Yes
- **Build status**: Clean (no errors, no warnings)

## Audit Findings Summary

| Severity | Found | Resolved | Remaining |
|----------|------:|--------:|----------:|
| CRITICAL | 6 | 6 | 0 |
| HIGH | 12 | 12 | 0 |
| MEDIUM | 19 | 19 | 0 |
| LOW | 13 | 8 | 5 |
| **Total** | **50** | **45** | **5** |

Remaining LOW items are informational (accessibility improvements, additional export formats, mobile responsive tweaks) and do not affect correctness or security.
