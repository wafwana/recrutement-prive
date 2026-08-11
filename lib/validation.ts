import { z } from "zod";

export const applicationStatusSchema = z.enum([
  "SUBMITTED",
  "REVIEWING",
  "INTERVIEW",
  "SHORTLISTED",
  "REJECTED",
  "HIRED",
]);

export const jobStatusSchema = z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "ARCHIVED"]);

export const candidateProfileSchema = z.object({
  headline: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  cvUrl: z.string().trim().url().or(z.literal("")).optional(),
  preferences: z.union([z.array(z.string().trim().min(1).max(80)), z.string().trim().max(1000)]).optional(),
});

export type ApplicationStatusValue = z.infer<typeof applicationStatusSchema>;
export type JobStatusValue = z.infer<typeof jobStatusSchema>;
