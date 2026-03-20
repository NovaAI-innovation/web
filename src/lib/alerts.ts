type AlertPayload = {
  title: string;
  severity: "critical" | "high" | "medium";
  requestId: string;
  route: string;
  message: string;
  context?: Record<string, unknown>;
};

export async function sendAlert(payload: AlertPayload): Promise<void> {
  const webhook = process.env.ONCALL_ALERT_WEBHOOK_URL;
  if (!webhook) {
    return;
  }

  await fetch(webhook, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: `[${payload.severity.toUpperCase()}] ${payload.title}`,
      details: {
        requestId: payload.requestId,
        route: payload.route,
        message: payload.message,
        ...payload.context,
      },
    }),
  });
}
