import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { pgTable, serial, varchar, text, timestamp, boolean, integer, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  resumeFile: z.instanceof(File).optional(),
  coverLetterFile: z.instanceof(File).optional(),
});

// Enhanced profile for comprehensive job applications
export const comprehensiveProfileSchema = z.object({
  // Basic Info
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"), 
  phone: z.string().min(1, "Phone number is required"),
  
  // Address & Location
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  
  // Work Authorization
  workAuthorization: z.enum(["citizen", "permanent_resident", "visa_required", "other"]).optional(),
  visaStatus: z.string().optional(),
  
  // Salary & Availability
  desiredSalary: z.string().optional(),
  salaryNegotiable: z.boolean().optional(),
  startDate: z.string().optional(),
  
  // Education
  education: z.array(z.object({
    degree: z.string(),
    major: z.string(),
    school: z.string(),
    graduationYear: z.string(),
    gpa: z.string().optional(),
  })).optional(),
  
  // Work Experience
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean().optional(),
    description: z.string(),
  })).optional(),
  
  // Diversity & Inclusion (Optional)
  ethnicity: z.string().optional(),
  gender: z.string().optional(),
  veteranStatus: z.boolean().optional(),
  disabilityStatus: z.boolean().optional(),
  
  // Custom Responses
  customResponses: z.record(z.string()).optional(),
  
  // Files
  resumeFileName: z.string().optional(),
  coverLetterFileName: z.string().optional(),
});

// Application Session for Email Approval Workflow
export const applicationSessionSchema = z.object({
  id: z.string(),
  jobUrl: z.string().url(),
  profile: comprehensiveProfileSchema,
  platform: z.string(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(["pending_review", "approved", "submitted", "failed"]),
  filledFormData: z.record(z.any()).optional(),
  reviewEmailSent: z.boolean().default(false),
  approvalToken: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
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
export type ComprehensiveProfile = z.infer<typeof comprehensiveProfileSchema>;
export type ApplicationSession = z.infer<typeof applicationSessionSchema>;
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

// Database Tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }).notNull(),
  resumeFileName: varchar('resume_file_name', { length: 255 }),
  coverLetterFileName: varchar('cover_letter_file_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const jobApplications = pgTable('job_applications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  jobUrl: text('job_url').notNull(),
  platform: varchar('platform', { length: 100 }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }),
  company: varchar('company', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0).notNull(),
  submissionConfirmed: boolean('submission_confirmed').default(false).notNull(),
  applicationData: json('application_data'), // Store form data and metadata
});

export const applicationSessions = pgTable('application_sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  jobUrl: text('job_url').notNull(),
  platform: varchar('platform', { length: 100 }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }),
  company: varchar('company', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('pending_review'),
  profileData: json('profile_data').notNull(), // Comprehensive profile
  filledFormData: json('filled_form_data'), // Form data extracted from job site
  reviewEmailSent: boolean('review_email_sent').default(false).notNull(),
  approvalToken: varchar('approval_token', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobApplications: many(jobApplications),
  applicationSessions: many(applicationSessions),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  user: one(users, {
    fields: [jobApplications.userId],
    references: [users.id],
  }),
}));

export const applicationSessionsRelations = relations(applicationSessions, ({ one }) => ({
  user: one(users, {
    fields: [applicationSessions.userId],
    references: [users.id],
  }),
}));

// Database Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type JobApplicationRecord = typeof jobApplications.$inferSelect;
export type InsertJobApplication = typeof jobApplications.$inferInsert;
export type ApplicationSessionRecord = typeof applicationSessions.$inferSelect;
export type InsertApplicationSession = typeof applicationSessions.$inferInsert;

// Insert Schemas for Validation  
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({ id: true, appliedAt: true });

export type InsertUserType = z.infer<typeof insertUserSchema>;
export type InsertJobApplicationType = z.infer<typeof insertJobApplicationSchema>;
