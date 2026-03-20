import { Resend } from "resend";
import type { ContactSubmission } from "@/lib/contact";

type SendLeadNotificationInput = {
  leadId: string;
  lead: ContactSubmission;
  requestId: string;
};

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export async function sendLeadNotification(
  input: SendLeadNotificationInput,
): Promise<"sent" | "skipped"> {
  const client = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  const ownerEmail = process.env.OWNER_EMAIL;

  if (!client || !from || !ownerEmail) {
    return "skipped";
  }

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

  await client.emails.send({
    from,
    to: [ownerEmail],
    subject: `New Chimera Lead: ${input.lead.projectType} (${input.leadId})`,
    text: body,
  });

  return "sent";
}
