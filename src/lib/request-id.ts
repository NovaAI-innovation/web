export function getRequestId(headers: Headers): string {
  return (
    headers.get("x-request-id") ??
    headers.get("x-correlation-id") ??
    crypto.randomUUID()
  );
}
