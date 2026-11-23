export type PaymentProduct = "CHAOS_MODE" | "VIP_CONSULTANT";

export interface CreatePixChargeInput {
  amountCents: number;
  description: string;
  externalRef: string;
  customerName?: string;
  customerPhone?: string;
  expiresInSeconds?: number;
}

export interface PixChargeResult {
  externalId: string;
  pixCode: string;
  pixQrBase64: string | null;
  expiresAt: Date;
  provider: string;
}

export interface PixStatusResult {
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED";
  paidAt?: Date;
}

export interface PaymentGateway {
  readonly providerName: string;
  createPixCharge(input: CreatePixChargeInput): Promise<PixChargeResult>;
  checkPixStatus(externalId: string): Promise<PixStatusResult>;
}
