import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PEPPER = process.env.PIN_PEPPER ?? "dev-amigo-de-natal-pepper";
const MAX_PIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function hashPin(pin: string): string {
  if (!isValidPin(pin)) {
    throw new Error("PIN deve conter exatamente 4 dígitos.");
  }
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(`${pin}:${PEPPER}`, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPin(pin: string, storedHash: string | null): boolean {
  if (!storedHash || !isValidPin(pin)) return false;
  const [salt, hexHash] = storedHash.split(":");
  if (!salt || !hexHash) return false;

  const expected = Buffer.from(hexHash, "hex");
  const actual = scryptSync(`${pin}:${PEPPER}`, salt, 32);
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}

export function isPinLocked(lockedUntil: Date | null): boolean {
  if (!lockedUntil) return false;
  return lockedUntil.getTime() > Date.now();
}

export function nextPinFailureState(currentAttempts: number): {
  pinAttempts: number;
  pinLockedUntil: Date | null;
} {
  const next = currentAttempts + 1;
  if (next >= MAX_PIN_ATTEMPTS) {
    return {
      pinAttempts: 0,
      pinLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000),
    };
  }
  return {
    pinAttempts: next,
    pinLockedUntil: null,
  };
}
