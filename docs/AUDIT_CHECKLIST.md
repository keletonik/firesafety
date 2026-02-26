# Audit Checklist (Release Gate)

## Data Correctness

- [x] Totals match: analytics engine sums match underlying transaction amounts
- [x] Integer-cent accumulation prevents floating-point drift across large datasets
- [x] Date parsing handles ISO (YYYY-MM-DD), DD/MM/YYYY, MM/DD/YYYY formats
- [x] Calendar validation rejects invalid dates (Feb 30, month 13, day 32, etc.)
- [x] UTC date parsing prevents timezone/DST issues in day calculations
- [x] Negative amounts = expenses, positive amounts = income (convention consistent)
- [x] Zero-amount transactions excluded from income/expense classification
- [x] Debit/credit dual-column format correctly normalised (credit - debit)
- [x] Null debit/credit distinguished from zero (uses `?? 0` not `|| 0`)
- [x] Currency symbols and commas stripped from amount parsing
- [x] Parenthesised amounts treated as negative
- [x] Scientific notation and Infinity rejected in amount parsing
- [x] Category percentages sum to ~100% (within rounding)
- [x] Merchant breakdown totals match category totals
- [x] Ambiguous dates default to DD/MM/YYYY (AU convention) with warning

## CSV Import Robustness

- [x] Empty CSV handled gracefully (returns warning, no crash)
- [x] Headers-only CSV handled (0 transactions, no crash)
- [x] Missing columns detected with actionable error message
- [x] Rows with missing data skipped with warning count
- [x] Various date formats parsed correctly
- [x] Auto-detect: date, description, amount, debit, credit column variants
- [x] Multiple imports accumulate (append, not replace)
- [x] File size limit enforced (10MB max, both client and server)
- [x] BOM-prefixed CSV files handled correctly
- [x] CSV injection sanitised (formula prefixes stripped from descriptions)
- [x] Source name sanitised (non-alphanumeric characters replaced)
- [x] Corrupted JSON storage files handled gracefully (safe fallback)

## Duplicate Detection

- [x] Duplicate transactions detected on import (date + description + amount key)
- [x] Duplicate transactions skipped without error
- [x] Unique transactions from same batch still imported

## Categorisation

- [x] 18 default rules cover common merchant categories
- [x] Rules applied by priority (lower number wins)
- [x] Deterministic tie-breaking (priority then rule ID)
- [x] Disabled rules are skipped
- [x] Empty patterns rejected
- [x] Case-insensitive matching (input lowercased, not regex flag)
- [x] Uber Eats matches Food Delivery (priority 12) before Transport (priority 20)
- [x] Unknown descriptions default to "Uncategorised"
- [x] Rules stored and loadable from persistent storage
- [x] ReDoS protection: nested quantifiers rejected in user-supplied patterns
- [x] Regex compilation cached per batch (not per transaction)
- [x] Invalid description input returns "Uncategorised" without crash

## Recurring Detection

- [x] Requires 3+ transactions from same merchant
- [x] Weekly cadence detected (5-9 day intervals)
- [x] Fortnightly cadence detected (12-17 day intervals)
- [x] Monthly cadence detected (25-38 day intervals)
- [x] Quarterly cadence detected (80-100 day intervals)
- [x] Annual cadence detected (340-400 day intervals)
- [x] Only expense transactions analysed
- [x] Consistent amount variance check (coefficient of variation < 0.3)
- [x] Bessel's correction used for sample standard deviation
- [x] Merchant keys trimmed to avoid whitespace-only groups
- [x] Integer cents for amount averaging (no float drift)
- [x] Results sorted by cadence then amount

## Analytics

- [x] Cashflow: income, expense, net, avg daily spend all computed
- [x] Integer-cent accumulation in all aggregation functions
- [x] netTotal computed from already-rounded components
- [x] Category breakdown: sorted by total descending, includes count and percentage
- [x] Merchant breakdown: sorted by total descending, includes count
- [x] Daily spend: aggregated by date, sorted ascending
- [x] Monthly trends: aggregated by YYYY-MM, sorted ascending
- [x] Anomaly detection: 2-sigma threshold, minimum 3 transactions per category
- [x] Anomaly detection: O(n) precomputed stats (not O(n*m))
- [x] Anomaly output deduplicated by transaction ID
- [x] Bessel's correction for sample standard deviation
- [x] round2() uses toFixed(2) with -0 coercion

## UX

- [x] Upload page: drag-and-drop + click-to-browse
- [x] Upload errors are readable and actionable
- [x] Empty state shows clear call-to-action
- [x] Dashboard works with 0 rows (shows empty state)
- [x] Transactions page has search + category filter
- [x] Transactions page has pagination (50 per page)
- [x] Analytics page has tabbed navigation (categories/merchants/trends)
- [x] Recurring page shows estimated monthly + annual totals
- [x] Recurring page supports all 5 cadences (weekly/fortnightly/monthly/quarterly/annual)
- [x] Export buttons in header (CSV + JSON)
- [x] Clear all data with confirmation dialog
- [x] Error boundary catches and displays rendering failures gracefully

## Security & Privacy

- [x] No secrets in code
- [x] No bank login / API integration
- [x] Account number redaction utility (last 4 digits shown)
- [x] Email address sanitisation (replaced with [email])
- [x] Privacy module integrated into import pipeline
- [x] CSV injection prevention: formula prefixes neutralised on both import and export
- [x] ReDoS protection: regex patterns validated before compilation
- [x] DELETE endpoint requires X-Confirm-Delete header (CSRF mitigation)
- [x] Amount parsing rejects non-numeric values (no Infinity, NaN, scientific notation)
- [x] No logging of raw statement rows
- [x] Data stored locally (JSON files in .data/ directory)
- [x] .gitignore excludes .data/ directory

## Testing

- [x] 72 unit tests across 6 test suites
- [x] All tests passing (0 failures)
- [x] Importer tests: 17 tests (basic CSV, debit/credit, dates, currency, injection, validation, BOM, size limit)
- [x] Categoriser tests: 17 tests (13 merchant categories, edge cases, batch processing)
- [x] Analytics tests: 17 tests (cashflow, zero-amount, float drift, categories, merchants, daily, monthly, anomalies)
- [x] Recurring tests: 9 tests (monthly, weekly, fortnightly, quarterly, mixed cadences, edge cases)
- [x] Privacy tests: 5 tests (redaction, email sanitisation, pass-through)
- [x] Export tests: 7 tests (CSV format, JSON format, escaping, formula injection)

## Build

- [x] `next build` compiles successfully with 0 errors
- [x] TypeScript strict mode enabled (target: es2017)
- [x] No ESLint warnings or errors
- [x] All static pages prerendered
- [x] All dynamic API routes functional

## "No Missing Features"

- [x] Every MVP requirement checked off in TRACEABILITY_MATRIX.md
- [x] All 20 requirements have code owners and verification
- [x] Expert audit completed with 50+ findings across 4 severity levels
- [x] All CRITICAL, HIGH, and MEDIUM findings resolved and verified
