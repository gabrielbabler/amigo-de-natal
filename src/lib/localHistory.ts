"use client";

import type { GroupMode } from "./types";

export interface LocalGroupEntry {
  slug: string;
  name: string;
  mode: GroupMode;
  role: "admin" | "participant";
  participantName?: string;
  adminToken?: string;
  participantToken?: string;
  updatedAt: number;
}

const HISTORY_KEY = "adn_my_groups_v1";

export function readLocalGroups(): LocalGroupEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalGroupEntry[];
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => b.updatedAt - a.updatedAt)
      : [];
  } catch {
    return [];
  }
}

export function upsertLocalGroup(entry: Omit<LocalGroupEntry, "updatedAt">) {
  if (typeof window === "undefined") return;
  try {
    const list = readLocalGroups();
    const existing = list.find((item) => item.slug === entry.slug);
    const merged: LocalGroupEntry = {
      ...existing,
      ...entry,
      role:
        existing?.role === "admin" || entry.role === "admin"
          ? "admin"
          : "participant",
      adminToken: entry.adminToken ?? existing?.adminToken,
      participantToken: entry.participantToken ?? existing?.participantToken,
      updatedAt: Date.now(),
    };
    const next = [merged, ...list.filter((i) => i.slug !== entry.slug)].slice(
      0,
      20
    );
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
}

export function removeLocalGroup(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const list = readLocalGroups().filter((i) => i.slug !== slug);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }
}
