import "server-only";
import { siteUrl } from "@/lib/site";

/**
 * Tells the team that something needs a person, through OPS_ALERT_WEBHOOK_URL
 * (Slack, Discord, or any webhook that takes a `text` field). Messages say what
 * kind of attention is needed and where, never content, aliases, emails or ids.
 */
export async function alertTeam(message: string, path: "/mod" | "/launch") {
  const webhook = process.env.OPS_ALERT_WEBHOOK_URL;
  if (!webhook) return;
  const text = `Canteen: ${message} ${new URL(path, siteUrl)}`;
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        new URL(webhook).hostname.endsWith("discord.com")
          ? { content: text }
          : { text },
      ),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Webhook responded ${response.status}`);
  } catch {
    console.error("Team alert could not be delivered");
  }
}
