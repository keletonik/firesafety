/**
 * Privacy utilities for the Personal Finance Manager.
 * Ensures no sensitive data leaks (account numbers, etc.)
 */

const ACCOUNT_NUMBER_PATTERNS = [
  /\b\d{8,16}\b/g,        // Generic numeric sequences 8-16 digits
  /\b\d{3,4}[-\s]\d{4}\b/g, // Formatted account numbers
];

/**
 * Redacts potential account numbers in a string,
 * showing only the last 4 digits.
 */
export function redactAccountNumbers(text: string): string {
  let result = text;
  for (const pattern of ACCOUNT_NUMBER_PATTERNS) {
    result = result.replace(pattern, (match) => {
      // Only redact if it looks like an account number (not a date, amount, etc.)
      // Skip if it contains decimals (likely an amount)
      if (match.includes(".")) return match;
      // Skip if it's 4 digits or fewer
      const digitsOnly = match.replace(/[-\s]/g, "");
      if (digitsOnly.length <= 4) return match;
      const last4 = digitsOnly.slice(-4);
      return `****${last4}`;
    });
  }
  return result;
}

/**
 * Sanitise a transaction description for display:
 * - Redact account numbers
 * - Remove email addresses
 */
export function sanitiseDescription(description: string): string {
  let result = description;
  // Remove email addresses
  result = result.replace(/[\w.-]+@[\w.-]+\.\w+/g, "[email]");
  result = redactAccountNumbers(result);
  return result;
}
