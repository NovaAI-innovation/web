type LogEvent = {
  level: "info" | "error";
  message: string;
  requestId: string;
  route: string;
  status?: number;
  durationMs?: number;
  errorCode?: string;
  context?: Record<string, unknown>;
};

export function logEvent(event: LogEvent): void {
  const payload = {
    timestamp: new Date().toISOString(),
    ...event,
  };
  const line = JSON.stringify(payload);
  if (event.level === "error") {
    console.error(line);
    return;
  }
  console.info(line);
}
