import { sendNotification, setVapidDetails } from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject =
  process.env.VAPID_SUBJECT ?? "mailto:contato@gbabler.com";

if (publicKey && privateKey) {
  setVapidDetails(subject, publicKey, privateKey);
}

export async function sendDrawPushNotifications(
  subscriptions: Array<Record<string, unknown> | null>,
  groupName: string,
  roomUrl: string
): Promise<void> {
  if (!publicKey || !privateKey) return;

  const payload = JSON.stringify({
    title: `🎄 Sorteio realizado: ${groupName}!`,
    body: "Toque aqui para descobrir quem você tirou no Amigo de Natal.",
    url: roomUrl,
  });

  await Promise.allSettled(
    subscriptions
      .filter((sub): sub is Record<string, unknown> => Boolean(sub))
      .map((sub) => sendNotification(sub as never, payload))
  );
}
