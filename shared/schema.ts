import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  resumeFile: z.instanceof(File).optional(),
  coverLetterFile: z.instanceof(File).optional(),
});

export const jobApplicationSchema = z.object({
  jobUrl: z.string().url("Invalid URL"),
  platform: z.string(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
});

export const applicationHistoryItemSchema = z.object({
  id: z.string(),
  jobUrl: z.string().url(),
  platform: z.string(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(["applied", "failed", "needs_review", "pending", "retrying"]),
  appliedAt: z.string(),
  errorMessage: z.string().optional(),
  retryCount: z.number().default(0),
  submissionConfirmed: z.boolean().default(false),
});

export const bulkApplyRequestSchema = z.object({
  jobUrls: z.array(z.string().url()).min(1).max(50),
  profile: profileSchema,
});

export const applyJobRequestSchema = z.object({
  jobUrl: z.string().url(),
  profile: profileSchema,
});

export const applyJobResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  applicationId: z.string().optional(),
  errorDetails: z.string().optional(),
  submissionConfirmed: z.boolean().default(false),
});

export const bulkApplyProgressSchema = z.object({
  totalJobs: z.number(),
  completedJobs: z.number(),
  successfulJobs: z.number(),
  failedJobs: z.number(),
  currentJobUrl: z.string().optional(),
  isComplete: z.boolean(),
});

export type Profile = z.infer<typeof profileSchema>;
export type JobApplication = z.infer<typeof jobApplicationSchema>;
export type ApplicationHistoryItem = z.infer<typeof applicationHistoryItemSchema>;
export type ApplyJobRequest = z.infer<typeof applyJobRequestSchema>;
export type ApplyJobResponse = z.infer<typeof applyJobResponseSchema>;
export type BulkApplyRequest = z.infer<typeof bulkApplyRequestSchema>;
export type BulkApplyProgress = z.infer<typeof bulkApplyProgressSchema>;

export interface ApplicationStats {
  total: number;
  successful: number;
  failed: number;
  needsReview: number;
  successRate: number;
}
