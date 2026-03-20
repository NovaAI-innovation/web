"use client";

import { useEffect } from "react";

type ErrorPayload = {
  type: "error" | "unhandledrejection";
  message: string;
  stack?: string;
  pathname: string;
  userAgent: string;
};

function submitClientError(payload: ErrorPayload): void {
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/monitoring/error", blob);
    return;
  }

  void fetch("/api/monitoring/error", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
}

export default function ClientErrorMonitor() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      submitClientError({
        type: "error",
        message: event.message ?? "Unknown client error",
        stack: event.error?.stack,
        pathname: window.location.pathname,
        userAgent: navigator.userAgent,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        typeof event.reason === "string"
          ? event.reason
          : event.reason instanceof Error
            ? event.reason.message
            : "Unhandled rejection";

      submitClientError({
        type: "unhandledrejection",
        message: reason,
        stack: event.reason instanceof Error ? event.reason.stack : undefined,
        pathname: window.location.pathname,
        userAgent: navigator.userAgent,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
