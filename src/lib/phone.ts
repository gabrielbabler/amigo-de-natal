/**
 * Normalizes a Brazilian WhatsApp phone number to E.164-like digits without "+" (e.g., "5511999999999").
 * Accepts inputs like "(11) 99999-9999", "+55 11 99999-9999", "11 9999-9999", etc.
 */
const VALID_BR_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Normalizes a Brazilian WhatsApp phone number to E.164-like digits without "+" (e.g., "5511987654321").
 * Accepts inputs like "(11) 98765-4321", "+55 11 98765-4321", "11 98765-4321", etc.
 */
export function normalizeBrPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let national = digits;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    national = digits.slice(2);
  }

  // Valid Brazilian national numbers have 10 (landline/old mobile) or 11 (DDD + 9 + 8 digits) digits
  if (national.length !== 10 && national.length !== 11) {
    return null;
  }

  const ddd = Number(national.slice(0, 2));
  if (!VALID_BR_DDDS.has(ddd)) {
    return null;
  }

  // 11-digit Brazilian mobile numbers always start with 9 after the DDD
  if (national.length === 11 && national[2] !== "9") {
    return null;
  }

  // Reject obvious fake repeated sequences like 11999999999 or 11000000000
  const subscriber = national.slice(2);
  if (/^(\d)\1+$/.test(subscriber) || /^9(\d)\1+$/.test(subscriber)) {
    return null;
  }

  return `55${national}`;
}

/**
 * Formats user input progressively as "(DD) 9XXXX-XXXX" while typing.
 */
export function formatBrPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatBrPhone(normalized: string): string {
  const national = normalized.startsWith("55") ? normalized.slice(2) : normalized;
  if (national.length === 11) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  }
  if (national.length === 10) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  }
  return normalized;
}

export function maskBrPhone(normalized: string): string {
  const national = normalized.startsWith("55") ? normalized.slice(2) : normalized;
  if (national.length >= 10) {
    return `(${national.slice(0, 2)}) •••••-${national.slice(-4)}`;
  }
  return "••••";
}

/**
 * Normalizes a person's name for fuzzy duplicate detection:
 * lowercase, strip accents, collapse whitespace.
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

/**
 * Returns true if two names look suspiciously similar (exact match, prefix match on first+last, or small edit distance).
 */
export function areNamesSimilar(nameA: string, nameB: string): boolean {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a || !b) return false;
  if (a === b) return true;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen >= 4 && levenshtein(a, b) <= 2) {
    return true;
  }

  return false;
}
