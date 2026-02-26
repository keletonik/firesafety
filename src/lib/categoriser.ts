import type { Transaction, CategoryRule } from "./types";

export const DEFAULT_RULES: CategoryRule[] = [
  {
    id: "rule-01",
    pattern: "\\b(woolworths|coles|aldi|iga|costco|grocery|supermarket)\\b",
    category: "Groceries",
    priority: 10,
    enabled: true,
  },
  {
    id: "rule-02",
    pattern: "\\b(uber(?!\\s+eats)|ola|didi|taxi|lyft|rideshare|cabcharge)\\b",
    category: "Transport",
    priority: 20,
    enabled: true,
  },
  {
    id: "rule-03",
    pattern: "\\b(netflix|spotify|youtube premium|disney|hulu|apple music|amazon prime|stan|binge|paramount)\\b",
    category: "Subscriptions",
    priority: 15,
    enabled: true,
  },
  {
    id: "rule-04",
    pattern: "\\b(rent|landlord|lease|property|strata)\\b",
    category: "Housing",
    priority: 5,
    enabled: true,
  },
  {
    id: "rule-05",
    pattern: "\\b(insurance|nrma|aami|allianz|suncorp)\\b",
    category: "Insurance",
    priority: 28,
    enabled: true,
  },
  {
    id: "rule-06",
    pattern: "\\b(gym|fitness|anytime|f45|yoga|pilates|crossfit)\\b",
    category: "Health & Fitness",
    priority: 30,
    enabled: true,
  },
  {
    id: "rule-07",
    pattern: "\\b(cafe|coffee|restaurant|bar|pub|dining|mcdonald|kfc|burger|pizza|domino|hungry jack|subway|nando)\\b",
    category: "Eating Out",
    priority: 25,
    enabled: true,
  },
  {
    id: "rule-08",
    pattern: "\\b(uber eats|deliveroo|doordash|menulog|grubhub)\\b",
    category: "Food Delivery",
    priority: 12,
    enabled: true,
  },
  {
    id: "rule-09",
    pattern: "\\b(salary|wages|payroll|employer)\\b",
    category: "Income",
    priority: 5,
    enabled: true,
  },
  {
    id: "rule-10",
    pattern: "\\b(electricity|water|energy|agl|origin energy|utility)\\b",
    category: "Utilities",
    priority: 20,
    enabled: true,
  },
  {
    id: "rule-11",
    pattern: "\\b(telstra|optus|vodafone|phone|mobile|internet|broadband|nbn)\\b",
    category: "Phone & Internet",
    priority: 22,
    enabled: true,
  },
  {
    id: "rule-12",
    pattern: "\\b(amazon|ebay|kmart|target|big w|jb hi.?fi|myer|david jones|online shop)\\b",
    category: "Shopping",
    priority: 35,
    enabled: true,
  },
  {
    id: "rule-13",
    pattern: "\\b(petrol|fuel|bp|caltex|shell|ampol|servo|7.eleven)\\b",
    category: "Fuel",
    priority: 18,
    enabled: true,
  },
  {
    id: "rule-14",
    pattern: "\\b(doctor|medical|pharmacy|chemist|hospital|dental|dentist|optical|health fund|medibank|bupa)\\b",
    category: "Medical",
    priority: 25,
    enabled: true,
  },
  {
    id: "rule-15",
    pattern: "\\b(transfer|tfr|internal|savings)\\b",
    category: "Transfers",
    priority: 40,
    enabled: true,
  },
  {
    id: "rule-16",
    pattern: "\\b(atm|cash withdrawal|cash advance)\\b",
    category: "Cash",
    priority: 38,
    enabled: true,
  },
  {
    id: "rule-17",
    pattern: "\\b(bank fee|interest charge|penalty|overdrawn|overdraft|late fee|account fee|monthly fee)\\b",
    category: "Fees & Charges",
    priority: 34,
    enabled: true,
  },
  {
    id: "rule-18",
    pattern: "\\b(gas\\s+bill|natural gas|gas\\s+account)\\b",
    category: "Utilities",
    priority: 19,
    enabled: true,
  },
];

interface CompiledRule {
  regex: RegExp;
  category: string;
}

/**
 * Validate a regex pattern is safe to compile and won't cause catastrophic backtracking.
 * Rejects patterns with nested quantifiers that could trigger ReDoS.
 */
function isPatternSafe(pattern: string): boolean {
  // Reject nested quantifiers: (a+)+, (a*)+, (a+)*, etc.
  if (/([+*])\)?[+*{]/.test(pattern)) return false;
  if (/\(\?[^:)]/.test(pattern)) return true; // Allow lookahead/lookbehind
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pre-compile rules once: filter, sort, validate, and compile regexes.
 * This avoids recompiling regexes per transaction.
 */
function compileRules(rules: CategoryRule[]): CompiledRule[] {
  return [...rules]
    .filter((r) => r.enabled && r.pattern && r.pattern.trim() !== "")
    .sort((a, b) => {
      const priorityDiff = a.priority - b.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return a.id.localeCompare(b.id); // Stable tie-breaking by ID
    })
    .flatMap((rule) => {
      if (!isPatternSafe(rule.pattern)) return [];
      try {
        // Do NOT use "i" flag — we lowercase the input instead (faster)
        return [{ regex: new RegExp(rule.pattern), category: rule.category }];
      } catch {
        return [];
      }
    });
}

export function categoriseTransaction(
  description: string,
  rules: CategoryRule[]
): string {
  if (!description || typeof description !== "string") {
    return "Uncategorised";
  }
  const compiled = compileRules(rules);
  return categoriseWithCompiled(description, compiled);
}

function categoriseWithCompiled(
  description: string,
  compiled: CompiledRule[]
): string {
  const lowerDesc = description.toLowerCase();
  for (const { regex, category } of compiled) {
    if (regex.test(lowerDesc)) {
      return category;
    }
  }
  return "Uncategorised";
}

export function categoriseTransactions(
  transactions: Transaction[],
  rules: CategoryRule[]
): Transaction[] {
  // Compile once for the entire batch
  const compiled = compileRules(rules);
  return transactions.map((txn) => ({
    ...txn,
    category: categoriseWithCompiled(txn.description, compiled),
  }));
}
