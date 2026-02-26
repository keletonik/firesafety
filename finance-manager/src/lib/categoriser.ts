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
    pattern: "\\b(uber|ola|didi|taxi|lyft|rideshare|cabcharge)\\b",
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
    priority: 30,
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
    pattern: "\\b(salary|wages|pay|payroll|income|employer)\\b",
    category: "Income",
    priority: 5,
    enabled: true,
  },
  {
    id: "rule-10",
    pattern: "\\b(electricity|gas|water|energy|agl|origin energy|power|utility)\\b",
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
    pattern: "\\b(amazon|ebay|kmart|target|big w|jb hi|myer|david jones|online shop)\\b",
    category: "Shopping",
    priority: 35,
    enabled: true,
  },
  {
    id: "rule-13",
    pattern: "\\b(petrol|fuel|bp|caltex|shell|ampol|servo|7-eleven)\\b",
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
    pattern: "\\b(transfer|tfr|internal|savings|invest)\\b",
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
    pattern: "\\b(fee|interest|charge|penalty|overdrawn|overdraft|bank fee)\\b",
    category: "Fees & Charges",
    priority: 35,
    enabled: true,
  },
];

export function categoriseTransaction(
  description: string,
  rules: CategoryRule[]
): string {
  const lowerDesc = description.toLowerCase();
  const sortedRules = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    try {
      const regex = new RegExp(rule.pattern, "i");
      if (regex.test(lowerDesc)) {
        return rule.category;
      }
    } catch {
      // Skip invalid regex
      continue;
    }
  }

  return "Uncategorised";
}

export function categoriseTransactions(
  transactions: Transaction[],
  rules: CategoryRule[]
): Transaction[] {
  return transactions.map((txn) => ({
    ...txn,
    category: categoriseTransaction(txn.description, rules),
  }));
}
