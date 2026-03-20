import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/contact/submit/route";

const validPayload = {
  name: "Taylor Jordan",
  email: "taylor@example.com",
  phone: "7809348696",
  projectType: "bathroom",
  message: "Need an estimate for a bathroom renovation in the next quarter.",
  timeline: "3-6-months",
  budgetBand: "25k-75k",
  source: "website-contact-form",
};

describe("POST /api/contact/submit", () => {
  beforeEach(() => {
    process.env.LEADS_DATA_FILE_NAME = `test-leads-${crypto.randomUUID()}.json`;
  });

  it("returns 201 and leadId for valid payload", async () => {
    const request = new Request("http://localhost/api/contact/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "test-ip",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      data: { leadId: string } | null;
      error: unknown;
    };

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data?.leadId).toBeTruthy();
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns 422 for invalid payload", async () => {
    const request = new Request("http://localhost/api/contact/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "test-ip-2",
      },
      body: JSON.stringify({ email: "bad" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(422);
  });
});
