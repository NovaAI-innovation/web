"use client";

import { FormEvent, useState } from "react";
import type { ContactSubmission } from "@/lib/contact";

type FormStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; leadId: string }
  | { state: "error"; message: string };

const defaultValues: ContactSubmission = {
  name: "",
  email: "",
  phone: "",
  projectType: "other",
  message: "",
  timeline: "flexible",
  budgetBand: "25k-75k",
  source: "website-contact-form",
};

export function ContactForm() {
  const [formData, setFormData] = useState<ContactSubmission>(defaultValues);
  const [status, setStatus] = useState<FormStatus>({ state: "idle" });

  const disabled = status.state === "loading";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ state: "loading" });

    const response = await fetch("/api/contact/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(formData),
    });

    const body = (await response.json()) as {
      data: { leadId: string; emailStatus: string } | null;
      error: { message: string } | null;
    };

    if (!response.ok || !body.data) {
      setStatus({
        state: "error",
        message: body.error?.message ?? "Submission failed. Try again.",
      });
      return;
    }

    setStatus({ state: "success", leadId: body.data.leadId });
    setFormData(defaultValues);
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <label>
        Full Name
        <input
          required
          value={formData.name}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, name: event.target.value }))
          }
        />
      </label>

      <label>
        Email
        <input
          type="email"
          required
          value={formData.email}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, email: event.target.value }))
          }
        />
      </label>

      <label>
        Phone
        <input
          required
          value={formData.phone}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, phone: event.target.value }))
          }
        />
      </label>

      <label>
        Project Type
        <select
          value={formData.projectType}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              projectType: event.target.value as ContactSubmission["projectType"],
            }))
          }
        >
          <option value="kitchen">Kitchen</option>
          <option value="bathroom">Bathroom</option>
          <option value="full-home">Full Home</option>
          <option value="commercial">Commercial</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label>
        Timeline
        <select
          value={formData.timeline}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              timeline: event.target.value as ContactSubmission["timeline"],
            }))
          }
        >
          <option value="asap">ASAP</option>
          <option value="1-3-months">1-3 months</option>
          <option value="3-6-months">3-6 months</option>
          <option value="flexible">Flexible</option>
        </select>
      </label>

      <label>
        Budget
        <select
          value={formData.budgetBand}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              budgetBand: event.target.value as ContactSubmission["budgetBand"],
            }))
          }
        >
          <option value="under-25k">Under $25k</option>
          <option value="25k-75k">$25k - $75k</option>
          <option value="75k-150k">$75k - $150k</option>
          <option value="150k-plus">$150k+</option>
        </select>
      </label>

      <label>
        Project Details
        <textarea
          required
          rows={5}
          value={formData.message}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, message: event.target.value }))
          }
        />
      </label>

      <button disabled={disabled} type="submit">
        {disabled ? "Submitting..." : "Submit Request"}
      </button>

      <div aria-live="polite" className="status-message">
        {status.state === "success" ? (
          <p>Thanks. Your request was received with ID: {status.leadId}</p>
        ) : null}
        {status.state === "error" ? <p>{status.message}</p> : null}
      </div>
    </form>
  );
}
