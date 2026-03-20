type TraceSpan = {
  name: string;
  requestId: string;
  route: string;
  startMs: number;
  endMs: number;
  status: number;
  attributes?: Record<string, unknown>;
};

export async function sendTrace(span: TraceSpan): Promise<void> {
  const endpoint = process.env.OTEL_HTTP_ENDPOINT;
  if (!endpoint) {
    return;
  }

  await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      traceId: span.requestId,
      spanName: span.name,
      route: span.route,
      startMs: span.startMs,
      endMs: span.endMs,
      durationMs: span.endMs - span.startMs,
      status: span.status,
      attributes: span.attributes ?? {},
    }),
  });
}
