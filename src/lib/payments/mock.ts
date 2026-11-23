import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import type {
  CreatePixChargeInput,
  PaymentGateway,
  PixChargeResult,
  PixStatusResult,
} from "./types";

export class MockPixGateway implements PaymentGateway {
  readonly providerName = "mock";

  async createPixCharge(input: CreatePixChargeInput): Promise<PixChargeResult> {
    const externalId = `mock_pix_${randomUUID()}`;
    const pixCode = `00020126580014BR.GOV.BCB.PIX0136${externalId}5204000053039865405${(
      input.amountCents / 100
    ).toFixed(2)}5802BR5914AMIGODENATAL6009SAOPAULO62070503***6304ABCD`;
    const pixQrBase64 = await QRCode.toDataURL(pixCode, {
      width: 320,
      margin: 2,
    });

    return {
      externalId,
      pixCode,
      pixQrBase64,
      expiresAt: new Date(
        Date.now() + (input.expiresInSeconds ?? 1800) * 1000
      ),
      provider: this.providerName,
    };
  }

  async checkPixStatus(): Promise<PixStatusResult> {
    return { status: "PENDING" };
  }
}
