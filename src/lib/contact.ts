import { z } from "zod";

export const contactSubmissionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().min(7, "Enter a valid phone number."),
  projectType: z
    .enum(["kitchen", "bathroom", "full-home", "commercial", "other"])
    .default("other"),
  message: z.string().min(10, "Message must be at least 10 characters."),
  timeline: z
    .enum(["asap", "1-3-months", "3-6-months", "flexible"])
    .default("flexible"),
  budgetBand: z
    .enum(["under-25k", "25k-75k", "75k-150k", "150k-plus"])
    .default("25k-75k"),
  source: z.string().default("website-contact-form"),
});

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
