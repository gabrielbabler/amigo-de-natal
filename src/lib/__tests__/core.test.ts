import { describe, expect, it } from "vitest";
import { computeDrawAssignments } from "../draw";
import {
  areNamesSimilar,
  formatBrPhone,
  formatBrPhoneInput,
  getPhoneLast4,
  hashPhone,
  normalizeBrPhone,
} from "../phone";
import { hashPin, nextPinFailureState, verifyPin } from "../pin";
import {
  buildAmazonSearchUrl,
  buildMercadoLivreSearchUrl,
} from "../affiliates";

describe("computeDrawAssignments", () => {
  it("throws when fewer than 3 participants", () => {
    expect(() => computeDrawAssignments(["a", "b"], [])).toThrow();
  });

  it("produces a valid derangement with no self-draws and no reciprocal pairs for 4+ participants", () => {
    const ids = ["p1", "p2", "p3", "p4", "p5", "p6"];
    const result = computeDrawAssignments(ids, []);
    expect(result).toHaveLength(6);

    const map = new Map(result.map((r) => [r.giverId, r.receiverId]));
    expect(new Set(result.map((r) => r.receiverId)).size).toBe(6);

    for (const [giver, receiver] of map.entries()) {
      expect(giver).not.toBe(receiver);
      expect(map.get(receiver)).not.toBe(giver);
    }
  });

  it("respects exclusion rules", () => {
    const ids = ["a", "b", "c", "d"];
    const exclusions = [
      { giverId: "a", excludedReceiverId: "b" },
      { giverId: "b", excludedReceiverId: "a" },
    ];
    for (let i = 0; i < 20; i++) {
      const result = computeDrawAssignments(ids, exclusions);
      const map = new Map(result.map((r) => [r.giverId, r.receiverId]));
      expect(map.get("a")).not.toBe("b");
      expect(map.get("b")).not.toBe("a");
    }
  });
});

describe("phone & fuzzy name utilities", () => {
  it("normalizes Brazilian WhatsApp numbers and rejects invalid ones", () => {
    expect(normalizeBrPhone("(11) 98765-4321")).toBe("5511987654321");
    expect(normalizeBrPhone("+55 21 98888-7777")).toBe("5521988887777");
    expect(normalizeBrPhone("1234")).toBeNull();
    expect(normalizeBrPhone("(11) 99999-9999")).toBeNull(); // repeated digits
    expect(normalizeBrPhone("(11) 88765-43210")).toBeNull(); // 11-digit without leading 9
    expect(normalizeBrPhone("(20) 98765-4321")).toBeNull(); // invalid DDD
  });

  it("formats phone input progressively", () => {
    expect(formatBrPhoneInput("11987654321")).toBe("(11) 98765-4321");
  });

  it("formats normalized phone numbers", () => {
    expect(formatBrPhone("5511999998888")).toBe("(11) 99999-8888");
  });

  it("hashes phone numbers deterministically without storing plaintext", () => {
    const h1 = hashPhone("5511987654321");
    const h2 = hashPhone("5511987654321");
    const h3 = hashPhone("5511987654322");
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).not.toContain("987654321");
    expect(getPhoneLast4("5511987654321")).toBe("4321");
  });

  it("detects similar names ignoring accents and case", () => {
    expect(areNamesSimilar("João Silva", "joao silva")).toBe(true);
    expect(areNamesSimilar("Maria Clara", "Maria Clra")).toBe(true);
    expect(areNamesSimilar("Lucas", "Fernanda")).toBe(false);
  });
});

describe("PIN hashing & rate limit", () => {
  it("hashes and verifies 4-digit PINs securely", () => {
    const hash = hashPin("1984");
    expect(hash).not.toContain("1984");
    expect(verifyPin("1984", hash)).toBe(true);
    expect(verifyPin("0000", hash)).toBe(false);
  });

  it("locks after 5 failed attempts", () => {
    const s4 = nextPinFailureState(3);
    expect(s4.pinAttempts).toBe(4);
    expect(s4.pinLockedUntil).toBeNull();

    const s5 = nextPinFailureState(4);
    expect(s5.pinAttempts).toBe(0);
    expect(s5.pinLockedUntil).toBeInstanceOf(Date);
  });
});

describe("affiliate URL builders", () => {
  it("builds Amazon and Mercado Livre search URLs", () => {
    const amz = buildAmazonSearchUrl("cafeteira italiana");
    expect(amz).toContain("amazon.com.br/s");
    expect(amz).toContain("tag=");

    const meli = buildMercadoLivreSearchUrl("cafeteira italiana");
    expect(meli).toContain("mercadolivre.com.br/cafeteira-italiana");
  });
});
