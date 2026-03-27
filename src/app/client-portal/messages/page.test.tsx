import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MessagesPage from "./page";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: (props: React.ComponentProps<"div">) => <div {...props} />,
    p: (props: React.ComponentProps<"p">) => <p {...props} />,
    span: (props: React.ComponentProps<"span">) => <span {...props} />,
  },
}));

type MockApiResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function jsonResponse(payload: unknown, status = 200): MockApiResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

describe("Client Portal Messages Optimistic Flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("appends temp message and reconciles on success", async () => {
    let serverMessages: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/api/client-portal/documents")) {
        return jsonResponse({ data: [], error: null });
      }
      if (url.includes("/api/client-portal/messages") && method === "GET") {
        return jsonResponse({ data: { messages: serverMessages, unreadCount: 0 }, error: null });
      }
      if (url.includes("/api/client-portal/messages") && method === "POST") {
        const message = {
          id: "msg-1",
          author: "client",
          body: "Need update on timeline",
          createdAt: "2026-03-27T12:00:00.000Z",
          readByClient: true,
        };
        serverMessages = [message];
        return jsonResponse({
          data: {
            message,
          },
          error: null,
        });
      }
      if (url.includes("/api/client-portal/messages/read")) {
        return jsonResponse({ data: { updated: 0 }, error: null });
      }

      return jsonResponse({ data: null, error: { message: "Unhandled request" } }, 500);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<MessagesPage />);

    const textarea = await screen.findByRole("textbox");
    fireEvent.input(textarea, { target: { value: "Need update on timeline" } });
    const form = screen.getByRole("button", { name: "Send message" }).closest("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client-portal/messages",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("sending...")).not.toBeInTheDocument();
      expect(screen.getByText("Need update on timeline")).toBeInTheDocument();
    });
  });

  it("appends temp message and rolls into failed state on error", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/api/client-portal/documents")) {
        return jsonResponse({ data: [], error: null });
      }
      if (url.includes("/api/client-portal/messages") && method === "GET") {
        return jsonResponse({ data: { messages: [], unreadCount: 0 }, error: null });
      }
      if (url.includes("/api/client-portal/messages") && method === "POST") {
        return jsonResponse({ data: null, error: { message: "Server unavailable" } }, 500);
      }
      if (url.includes("/api/client-portal/messages/read")) {
        return jsonResponse({ data: { updated: 0 }, error: null });
      }

      return jsonResponse({ data: null, error: { message: "Unhandled request" } }, 500);
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<MessagesPage />);

    const textarea = await screen.findByRole("textbox");
    fireEvent.input(textarea, { target: { value: "Need update on timeline" } });
    const form = screen.getByRole("button", { name: "Send message" }).closest("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText("failed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });
  });
});
