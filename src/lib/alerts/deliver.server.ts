// Alert delivery. Server-only.
//
// Channels that work today: webhook (HMAC-signed) and Slack (incoming
// webhook URL). Email needs a verified sending domain on this deployment and
// SMS needs a sending number — until those exist the dispatcher records an
// honest "skipped" delivery with the reason instead of pretending to send.

import { createHmac } from "node:crypto";

export type ChannelKind = "email" | "webhook" | "slack" | "sms";

export interface AlertChannelRow {
  id: string;
  user_id: string;
  kind: ChannelKind;
  target: string;
  label: string;
  secret: string | null;
  verified: boolean;
  paused: boolean;
  digest: string;
}

export interface AlertPayload {
  event: string;
  mint: string;
  severity?: string | null;
  signature?: string | null;
  occurredAt: string;
  amountSol?: number | null;
  url: string;
  summary: string;
}

export interface DeliveryResult {
  status: "sent" | "failed" | "skipped";
  httpStatus?: number;
  error?: string;
}

/** Channels whose transport is not provisioned on this deployment. */
export function channelUnavailableReason(kind: ChannelKind): string | null {
  if (kind === "email") {
    return process.env["RESEND_API_KEY"]
      ? null
      : "Email delivery needs a verified sending domain on this deployment.";
  }
  if (kind === "sms") return "Text delivery needs a sending number — not configured yet.";
  return null;
}

function signBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

async function postJson(
  url: string,
  body: string,
  headers: Record<string, string>,
): Promise<DeliveryResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
    });
    if (!res.ok) {
      return { status: "failed", httpStatus: res.status, error: `HTTP ${res.status}` };
    }
    return { status: "sent", httpStatus: res.status };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "network error" };
  }
}

export async function deliverAlert(
  channel: AlertChannelRow,
  payload: AlertPayload,
): Promise<DeliveryResult> {
  const unavailable = channelUnavailableReason(channel.kind);
  if (unavailable) return { status: "skipped", error: unavailable };

  if (channel.kind === "webhook") {
    const body = JSON.stringify({ type: "spx402.alert", data: payload });
    const headers: Record<string, string> = { "X-SPX402-Event": payload.event };
    if (channel.secret) headers["X-SPX402-Signature"] = `sha256=${signBody(body, channel.secret)}`;
    return postJson(channel.target, body, headers);
  }

  if (channel.kind === "slack") {
    const text = `*${payload.event}* — ${payload.summary}\n<${payload.url}|Open dossier>`;
    return postJson(channel.target, JSON.stringify({ text }), {});
  }

  if (channel.kind === "email") {
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) return { status: "skipped", error: "Email sending is not configured." };
    const from = process.env["ALERTS_FROM_EMAIL"] ?? "alerts@spx402.com";
    return postJson(
      "https://api.resend.com/emails",
      JSON.stringify({
        from,
        to: [channel.target],
        subject: `SPX402 — ${payload.event}`,
        text: `${payload.summary}\n\n${payload.url}`,
      }),
      { Authorization: `Bearer ${apiKey}` },
    );
  }

  return { status: "skipped", error: "Unsupported channel" };
}

/** Maps an indexed event type onto the subscription toggle that governs it. */
export const EVENT_TO_FLAG: Record<string, string> = {
  ESCROW_CREATED: "event_escrow_created",
  ESCROW_RELEASED: "event_escrow_released",
  ESCROW_CANCELED: "event_escrow_canceled",
  BOND_DEPOSITED: "event_bond_deposited",
  BOND_SLASHED: "event_bond_slashed",
  RECEIPT_CREATED: "event_receipt_created",
  DEPOSIT: "event_deposit",
  DEPOSIT_RECEIVED: "event_deposit",
  BUYBACK_EXECUTED: "event_buyback",
  BURN_CONFIRMED: "event_burn",
  FAILED_WINDOW: "event_failed_window",
  CONFIG_CHANGED: "event_config_change",
  SCORE_DROP: "event_score_drop",
};

export function summarize(
  eventType: string,
  mint: string,
  amountSol: number | null | undefined,
): string {
  const label = eventType.replace(/_/g, " ").toLowerCase();
  const amount = amountSol ? ` (${amountSol} SOL)` : "";
  return `${label}${amount} on ${mint.slice(0, 6)}…${mint.slice(-4)}`;
}
