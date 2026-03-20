import { describe, expect, it } from "vitest";
import { contactSubmissionSchema } from "@/lib/contact";

describe("contactSubmissionSchema", () => {
  it("accepts valid contact payload", () => {
    const parsed = contactSubmissionSchema.safeParse({
      name: "Alex Mason",
      email: "alex@example.com",
      phone: "780-934-8696",
      projectType: "kitchen",
      message: "I need a full kitchen renovation this spring.",
      timeline: "1-3-months",
      budgetBand: "25k-75k",
      source: "website-contact-form",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid payload", () => {
    const parsed = contactSubmissionSchema.safeParse({
      name: "A",
      email: "not-an-email",
      phone: "1",
      projectType: "bad-type",
      message: "short",
      timeline: "now",
      budgetBand: "tiny",
    });

    expect(parsed.success).toBe(false);
  });
});
