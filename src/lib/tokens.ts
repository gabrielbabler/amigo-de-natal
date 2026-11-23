import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export function generateSecretToken(): string {
  return randomBytes(24).toString("hex");
}

export function generateRoomSlug(groupName: string): string {
  const base = groupName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  const suffix = randomBytes(3).toString("hex");
  return base ? `${base}-${suffix}` : `natal-${suffix}`;
}

export function adminCookieName(slug: string): string {
  return `adn_admin_${slug}`;
}

export function participantCookieName(slug: string): string {
  return `adn_part_${slug}`;
}

export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

export async function getAdminTokenFromCookie(
  slug: string
): Promise<string | undefined> {
  const store = await cookies();
  return store.get(adminCookieName(slug))?.value;
}

export async function getParticipantTokenFromCookie(
  slug: string
): Promise<string | undefined> {
  const store = await cookies();
  return store.get(participantCookieName(slug))?.value;
}
