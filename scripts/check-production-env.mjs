const required = [
  "NEXT_PUBLIC_SITE_URL",
  "OWNER_EMAIL",
  "NEXT_PUBLIC_PHONE",
  "NEXT_PUBLIC_EMAIL",
  "LEADS_DATA_FILE_NAME",
];

const optionalIntegrations = [
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "ONCALL_ALERT_WEBHOOK_URL",
  "OTEL_HTTP_ENDPOINT",
];

let hasFailure = false;

for (const key of required) {
  if (!process.env[key]) {
    hasFailure = true;
    console.error(`Missing required env var: ${key}`);
  }
}

for (const key of optionalIntegrations) {
  if (!process.env[key]) {
    console.warn(`Optional integration not configured: ${key}`);
  }
}

if (hasFailure) {
  process.exit(1);
}

console.log("Production env check passed.");
