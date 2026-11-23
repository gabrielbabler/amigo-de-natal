import QRCode from "qrcode";
import type {
  CreatePixChargeInput,
  PaymentGateway,
  PixChargeResult,
  PixStatusResult,
} from "./types";

const ABACATEPAY_API_BASE = "https://api.abacatepay.com/v1";

export class AbacatePayGateway implements PaymentGateway {
  readonly providerName = "abacatepay";
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("ABACATEPAY_API_KEY não configurada.");
    }
    this.apiKey = apiKey;
  }

  async createPixCharge(input: CreatePixChargeInput): Promise<PixChargeResult> {
    const expiresIn = input.expiresInSeconds ?? 1800; // 30 min
    const response = await fetch(`${ABACATEPAY_API_BASE}/pixQrCode/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amountCents,
        expiresIn,
        description: input.description.slice(0, 140),
        metadata: {
          externalRef: input.externalRef,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AbacatePay erro (${response.status}): ${errorText}`);
    }

    const json = (await response.json()) as {
      data?: {
        id: string;
        brCode: string;
        brCodeBase64?: string;
        expiresAt?: string;
      };
      error?: string;
    };

    if (!json.data?.id || !json.data.brCode) {
      throw new Error(
        `Resposta inválida do AbacatePay: ${json.error ?? "sem brCode"}`
      );
    }

    const pixQrBase64 =
      json.data.brCodeBase64 ??
      (await QRCode.toDataURL(json.data.brCode, { width: 320, margin: 2 }));

    return {
      externalId: json.data.id,
      pixCode: json.data.brCode,
      pixQrBase64,
      expiresAt: json.data.expiresAt
        ? new Date(json.data.expiresAt)
        : new Date(Date.now() + expiresIn * 1000),
      provider: this.providerName,
    };
  }

  async checkPixStatus(externalId: string): Promise<PixStatusResult> {
    const response = await fetch(
      `${ABACATEPAY_API_BASE}/pixQrCode/check?id=${encodeURIComponent(externalId)}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      return { status: "PENDING" };
    }

    const json = (await response.json()) as {
      data?: { status?: string };
    };

    const status = json.data?.status?.toUpperCase();
    if (status === "PAID") {
      return { status: "PAID", paidAt: new Date() };
    }
    if (status === "EXPIRED") {
      return { status: "EXPIRED" };
    }
    if (status === "CANCELLED" || status === "FAILED") {
      return { status: "FAILED" };
    }
    return { status: "PENDING" };
  }
}
