# Slack Incoming Webhook Setup for Chimera Oncall Alerts

## Purpose
Configure a Slack webhook so `ONCALL_ALERT_WEBHOOK_URL` can send lead submissions, errors, and critical alerts to a dedicated channel.

## Step-by-Step Setup

### 1. Use the App Manifest
1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From an app manifest**
3. Select your workspace
4. Paste the content from `slack-app-manifest.json` (in `web/docs/`)
5. Click **Next** → **Create**

### 2. Enable Incoming Webhooks
1. In the app settings sidebar, click **Features** > **Incoming Webhooks**
2. Toggle **Activate Incoming Webhooks** to **On**
3. Scroll down and click **Add New Webhook to Workspace**
4. Choose the target Slack channel (recommend `#alerts` or `#oncall`)
5. Click **Allow**

### 3. Copy the Webhook URL
1. After adding, a new webhook URL will appear (starts with `https://hooks.slack.com/services/`)
2. Copy the full URL

### 4. Add to Environment
```bash
# In .env.staging or .env.local
ONCALL_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

### 5. Test the Alert
```bash
cd web
npm run dev
# Submit a contact form or manually trigger sendAlert()
```

The alert should appear in your chosen Slack channel with severity, requestId, and message.

## Troubleshooting
- "Invalid additional property": Use the cleaned manifest in `slack-app-manifest.json`
- No alerts: Check that `ONCALL_ALERT_WEBHOOK_URL` is set and not empty
- Rate limiting: Webhooks have Slack rate limits (~1 msg/sec)

Last updated: 2026-03-20
