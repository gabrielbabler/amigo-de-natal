import { AbacatePayGateway } from "./abacatepay";
import { MockPixGateway } from "./mock";
import type { PaymentGateway } from "./types";

export function getPaymentGateway(): PaymentGateway {
  const provider = process.env.PAYMENT_PROVIDER ?? "mock";

  if (provider === "abacatepay") {
    const apiKey = process.env.ABACATEPAY_API_KEY ?? "";
    return new AbacatePayGateway(apiKey);
  }

  return new MockPixGateway();
}
