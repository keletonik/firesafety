# Audit Checklist (Release Gate)

## Data Correctness

- [x] Totals match: analytics engine sums match underlying transaction amounts
- [x] Date parsing handles ISO (YYYY-MM-DD), DD/MM/YYYY, MM/DD/YYYY formats
- [x] Negative amounts = expenses, positive amounts = income (convention consistent)
- [x] Debit/credit dual-column format correctly normalised (credit - debit)
- [x] Currency symbols and commas stripped from amount parsing
- [x] Parenthesised amounts treated as negative
- [x] Category percentages sum to ~100% (within rounding)
- [x] Merchant breakdown totals match category totals

## CSV Import Robustness

- [x] Empty CSV handled gracefully (returns warning, no crash)
- [x] Headers-only CSV handled (0 transactions, no crash)
- [x] Missing columns detected with actionable error message
- [x] Rows with missing data skipped with warning count
- [x] Various date formats parsed correctly
- [x] Auto-detect: date, description, amount, debit, credit column variants
- [x] Multiple imports accumulate (append, not replace)

## Categorisation

- [x] 17 default rules cover common merchant categories
- [x] Rules applied by priority (lower number wins)
- [x] Disabled rules are skipped
- [x] Case-insensitive matching
- [x] Uber Eats matches Food Delivery (priority 12) before Transport (priority 20)
- [x] Unknown descriptions default to "Uncategorised"
- [x] Rules stored and loadable from persistent storage

## Recurring Detection

- [x] Requires 3+ transactions from same merchant
- [x] Weekly cadence detected (5-9 day intervals)
- [x] Monthly cadence detected (25-38 day intervals)
- [x] Annual cadence detected (340-400 day intervals)
- [x] Only expense transactions analysed
- [x] Consistent amount variance check (coefficient of variation < 0.3)
- [x] Results sorted by cadence then amount

## Analytics

- [x] Cashflow: income, expense, net, avg daily spend all computed
- [x] Category breakdown: sorted by total descending, includes count and percentage
- [x] Merchant breakdown: sorted by total descending, includes count
- [x] Daily spend: aggregated by date, sorted ascending
- [x] Monthly trends: aggregated by YYYY-MM, sorted ascending
- [x] Anomaly detection: 2-sigma threshold, minimum 3 transactions per category

## UX

- [x] Upload page: drag-and-drop + click-to-browse
- [x] Upload errors are readable and actionable
- [x] Empty state shows clear call-to-action
- [x] Dashboard works with 0 rows (shows empty state)
- [x] Transactions page has search + category filter
- [x] Transactions page has pagination (50 per page)
- [x] Analytics page has tabbed navigation (categories/merchants/trends)
- [x] Recurring page shows estimated monthly + annual totals
- [x] Export buttons in header (CSV + JSON)
- [x] Clear all data with confirmation dialog

## Security & Privacy (personal-only)

- [x] No secrets in code
- [x] No bank login / API integration
- [x] Account number redaction utility (last 4 digits)
- [x] Email address sanitisation
- [x] No logging of raw statement rows
- [x] Data stored locally (JSON files in .data/ directory)
- [x] .gitignore excludes .data/ directory

## Testing

- [x] 61 unit tests across 6 test suites
- [x] All tests passing (0 failures)
- [x] Importer tests: 10 tests (basic CSV, debit/credit, empty, date formats, currency, etc.)
- [x] Categoriser tests: 16 tests (12 merchant categories, edge cases, batch processing)
- [x] Analytics tests: 15 tests (cashflow, categories, merchants, daily, monthly, anomalies)
- [x] Recurring tests: 7 tests (monthly, weekly, mixed cadences, edge cases)
- [x] Privacy tests: 4 tests (redaction, email sanitisation)
- [x] Export tests: 5 tests (CSV format, JSON format, escaping)

## Build

- [x] `next build` completes without errors
- [x] TypeScript strict mode enabled
- [x] No ESLint warnings/errors

## "No Missing Features"

- [x] Every MVP requirement checked off in TRACEABILITY_MATRIX.md
- [x] All 20 requirements have code owners and verification
