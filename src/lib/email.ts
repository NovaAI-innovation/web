/**
 * Email delivery via Agent Mail.
 *
 * All transactional emails go through this module. Configure via env vars:
 *   AGENT_MAIL_API_KEY
 *   AGENT_MAIL_FROM_EMAIL  (default: noreply@chimeraenterprise.ca)
 *   AGENT_MAIL_FROM_NAME   (default: Chimera Enterprise)
 *
 * Functions return "sent" | "skipped" (skipped when API key is absent).
 * Blocking emails (confirmation, reset, OTP) throw on delivery failure
 * so the caller can surface the error to the user.
 */
import { logEvent } from "@/lib/observability";
import type { ContactSubmission } from "@/lib/contact";

const AGENT_MAIL_BASE = "https://api.agentmail.to/v1";

// ─────────────────────────────────────────────
// Internal transport
// ─────────────────────────────────────────────

async function send(
  to: string,
  subject: string,
  text: string,
  opts: { blocking?: boolean } = {},
): Promise<"sent" | "skipped"> {
  const apiKey = process.env.AGENT_MAIL_API_KEY;
  const from = process.env.AGENT_MAIL_FROM_EMAIL ?? "noreply@chimeraenterprise.ca";
  const fromName = process.env.AGENT_MAIL_FROM_NAME ?? "Chimera Enterprise";

  if (!apiKey) {
    logEvent({
      level: "info",
      message: "Email skipped — AGENT_MAIL_API_KEY not set",
      requestId: "email",
      route: "email",
      context: { to, subject },
    });
    return "skipped";
  }

  const res = await fetch(`${AGENT_MAIL_BASE}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${from}>`,
      to,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logEvent({
      level: "error",
      message: "Agent Mail delivery failed",
      requestId: "email",
      route: "email",
      status: res.status,
      context: { to, subject, responseBody: body },
    });
    if (opts.blocking) {
      throw new Error(`Email delivery failed (${res.status})`);
    }
    return "skipped";
  }

  logEvent({
    level: "info",
    message: "Email sent",
    requestId: "email",
    route: "email",
    context: { to, subject },
  });

  return "sent";
}

// ─────────────────────────────────────────────
// Transactional email types
// ─────────────────────────────────────────────

export async function sendEmailConfirmation(input: {
  to: string;
  name: string;
  token: string;
  requestId: string;
}): Promise<"sent" | "skipped"> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${siteUrl}/api/auth/verify-email?token=${input.token}`;

  const text = [
    `Hi ${input.name},`,
    "",
    "Thanks for registering with Chimera Enterprise. Please confirm your email address by clicking the link below.",
    "",
    `Confirm your email: ${link}`,
    "",
    "This link expires in 24 hours.",
    "",
    "If you did not create an account, you can safely ignore this email.",
    "",
    "— Chimera Enterprise",
  ].join("\n");

  return send(input.to, "Confirm your Chimera Enterprise account", text, { blocking: true });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetToken: string;
  requestId: string;
  name?: string;
}): Promise<"sent" | "skipped"> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const resetUrl = `${siteUrl}/client-portal/reset-password?token=${input.resetToken}`;

  const text = [
    input.name ? `Hi ${input.name},` : "Hi,",
    "",
    "You requested a password reset for your Chimera Enterprise account.",
    "",
    `Reset your password here: ${resetUrl}`,
    "",
    "This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.",
    "",
    "— Chimera Enterprise",
  ].join("\n");

  return send(input.to, "Reset your Chimera Enterprise password", text, { blocking: true });
}

export async function send2FACode(input: {
  to: string;
  name: string;
  otp: string;
}): Promise<"sent" | "skipped"> {
  const text = [
    `Hi ${input.name},`,
    "",
    `Your Chimera Enterprise login code is: ${input.otp}`,
    "",
    "This code expires in 10 minutes and can only be used once.",
    "",
    "If you did not request this code, please change your password immediately.",
    "",
    "— Chimera Enterprise",
  ].join("\n");

  return send(input.to, "Your Chimera Enterprise login code", text, { blocking: true });
}

export async function sendSecurityAlert(input: {
  to: string;
  name: string;
  action: string;
  ipAddress?: string;
  timestamp?: string;
}): Promise<"sent" | "skipped"> {
  const ts = input.timestamp ?? new Date().toISOString();

  const text = [
    `Hi ${input.name},`,
    "",
    `Security alert: ${input.action}`,
    `Time: ${ts}`,
    input.ipAddress ? `IP address: ${input.ipAddress}` : "",
    "",
    "If this was not you, please change your password and contact support immediately.",
    "",
    "— Chimera Enterprise",
  ]
    .filter(Boolean)
    .join("\n");

  return send(input.to, `Security alert: ${input.action} — Chimera Enterprise`, text);
}

export async function sendAdminInvitation(input: {
  to: string;
  role: string;
  setupToken: string;
}): Promise<"sent" | "skipped"> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const setupUrl = `${siteUrl}/login/setup?token=${input.setupToken}`;

  const text = [
    "You have been invited to access the Chimera Enterprise platform.",
    "",
    `Your role: ${input.role}`,
    "",
    `Set up your account here: ${setupUrl}`,
    "",
    "This invitation link expires in 48 hours.",
    "",
    "— Chimera Enterprise",
  ].join("\n");

  return send(input.to, "You have been invited to Chimera Enterprise", text, { blocking: true });
}

export async function sendLeadNotification(input: {
  leadId: string;
  lead: ContactSubmission;
  requestId: string;
}): Promise<"sent" | "skipped"> {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return "skipped";

  const body = [
    `Lead ID: ${input.leadId}`,
    `Request ID: ${input.requestId}`,
    `Name: ${input.lead.name}`,
    `Email: ${input.lead.email}`,
    `Phone: ${input.lead.phone}`,
    `Project Type: ${input.lead.projectType}`,
    `Timeline: ${input.lead.timeline}`,
    `Budget: ${input.lead.budgetBand}`,
    `Source: ${input.lead.source}`,
    "",
    "Message:",
    input.lead.message,
  ].join("\n");

  return send(ownerEmail, `New Chimera Lead: ${input.lead.projectType} (${input.leadId})`, body);
}

export async function sendMailingListWelcome(input: {
  to: string;
  name: string;
}): Promise<"sent" | "skipped"> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const text = [
    `Hi ${input.name},`,
    "",
    "You have been added to the Chimera Enterprise updates list. We will occasionally share project news, design inspiration, and renovation tips.",
    "",
    "To unsubscribe at any time, visit your account settings or reply to this email.",
    "",
    `Settings: ${siteUrl}/client-portal/settings`,
    "",
    "— Chimera Enterprise",
  ].join("\n");

  return send(input.to, "Welcome to Chimera Enterprise updates", text);
}
