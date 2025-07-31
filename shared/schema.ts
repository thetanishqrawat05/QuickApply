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
  // Basic Info (Required)
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"), 
  phone: z.string().min(1, "Phone number is required"),
  
  // Address & Location (Required for most applications)
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().default("United States"),
  
  // Additional Contact Info
  linkedinProfile: z.string().optional(),
  website: z.string().optional(),
  portfolioUrl: z.string().optional(),
  
  // Work Authorization (Critical for many positions)
  workAuthorization: z.enum(["us_citizen", "permanent_resident", "h1b", "opt", "cpt", "ead", "tn", "other"]).default("us_citizen"),
  requiresSponsorship: z.boolean().default(false),
  visaStatus: z.string().optional(),
  
  // Salary & Availability
  desiredSalary: z.string().optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  salaryNegotiable: z.boolean().default(true),
  availableStartDate: z.string().optional(),
  noticePeriod: z.string().optional(),
  
  // Education (Required for most positions)
  highestDegree: z.enum(["high_school", "associates", "bachelors", "masters", "phd", "other"]).optional(),
  university: z.string().optional(),
  major: z.string().optional(),
  graduationYear: z.string().optional(),
  gpa: z.string().optional(),
  
  // Professional Experience
  yearsOfExperience: z.string().optional(),
  currentTitle: z.string().optional(),
  currentCompany: z.string().optional(),
  previousTitle: z.string().optional(),
  previousCompany: z.string().optional(),
  
  // Skills & Certifications
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  
  // Background Check & Legal
  criminalBackground: z.boolean().optional(),
  drugTest: z.boolean().optional(),
  backgroundCheckConsent: z.boolean().default(true),
  
  // Diversity & Inclusion (Optional but often asked)
  race: z.enum(["prefer_not_to_say", "white", "black", "hispanic", "asian", "native_american", "pacific_islander", "two_or_more", "other"]).optional(),
  gender: z.enum(["prefer_not_to_say", "male", "female", "non_binary", "other"]).optional(),
  veteranStatus: z.enum(["not_veteran", "veteran", "disabled_veteran", "prefer_not_to_say"]).optional(),
  disabilityStatus: z.enum(["no", "yes", "prefer_not_to_say"]).optional(),
  
  // Employment Preferences
  jobType: z.enum(["full_time", "part_time", "contract", "internship", "temporary"]).optional(),
  workLocation: z.enum(["remote", "onsite", "hybrid"]).optional(),
  willingToRelocate: z.boolean().optional(),
  willingToTravel: z.boolean().optional(),
  
  // References
  hasReferences: z.boolean().optional(),
  referenceContactInfo: z.string().optional(),
  
  // Custom Question Responses (for company-specific questions)
  whyInterested: z.string().optional(),
  strengthsWeaknesses: z.string().optional(),
  careerGoals: z.string().optional(),
  additionalInfo: z.string().optional(),
  customResponses: z.record(z.string()).optional(),
  
  // Login credentials for auto-login (encrypted)
  loginEmail: z.string().email().optional(),
  loginPassword: z.string().optional(),
  preferredLoginMethod: z.enum(["email", "google", "linkedin", "manual"]).default("manual"),
  
  // Notification preferences
  whatsappNumber: z.string().optional(),
  enableWhatsappNotifications: z.boolean().default(false),
  enableEmailNotifications: z.boolean().default(true),
  
  // AI & Automation preferences
  enableAICoverLetter: z.boolean().default(true),
  coverLetterTemplate: z.string().optional(),
  
  // Files (Required)
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
  
  // Personal Information
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  zipCode: varchar('zip_code', { length: 20 }),
  country: varchar('country', { length: 50 }).default('United States'),
  
  // Professional Links
  linkedinProfile: text('linkedin_profile'),
  website: text('website'),
  portfolioUrl: text('portfolio_url'),
  
  // Work Authorization
  workAuthorization: varchar('work_authorization', { length: 30 }).default('us_citizen'),
  requiresSponsorship: boolean('requires_sponsorship').default(false),
  visaStatus: varchar('visa_status', { length: 50 }),
  
  // Salary & Availability
  desiredSalary: varchar('desired_salary', { length: 50 }),
  salaryMin: varchar('salary_min', { length: 50 }),
  salaryMax: varchar('salary_max', { length: 50 }),
  salaryNegotiable: boolean('salary_negotiable').default(true),
  availableStartDate: varchar('available_start_date', { length: 50 }),
  noticePeriod: varchar('notice_period', { length: 50 }),
  
  // Education
  highestDegree: varchar('highest_degree', { length: 30 }),
  university: varchar('university', { length: 200 }),
  major: varchar('major', { length: 100 }),
  graduationYear: varchar('graduation_year', { length: 10 }),
  gpa: varchar('gpa', { length: 10 }),
  
  // Professional Experience
  yearsOfExperience: varchar('years_of_experience', { length: 20 }),
  currentTitle: varchar('current_title', { length: 100 }),
  currentCompany: varchar('current_company', { length: 100 }),
  previousTitle: varchar('previous_title', { length: 100 }),
  previousCompany: varchar('previous_company', { length: 100 }),
  
  // Skills & Certifications (JSON arrays)
  skills: json('skills').$type<string[]>(),
  certifications: json('certifications').$type<string[]>(),
  languages: json('languages').$type<string[]>(),
  
  // Background Check & Legal
  criminalBackground: boolean('criminal_background'),
  drugTest: boolean('drug_test'),
  backgroundCheckConsent: boolean('background_check_consent').default(true),
  
  // Diversity & Inclusion
  race: varchar('race', { length: 30 }),
  gender: varchar('gender', { length: 20 }),
  veteranStatus: varchar('veteran_status', { length: 30 }),
  disabilityStatus: varchar('disability_status', { length: 20 }),
  
  // Employment Preferences
  jobType: varchar('job_type', { length: 20 }),
  workLocation: varchar('work_location', { length: 20 }),
  willingToRelocate: boolean('willing_to_relocate'),
  willingToTravel: boolean('willing_to_travel'),
  
  // References
  hasReferences: boolean('has_references'),
  referenceContactInfo: text('reference_contact_info'),
  
  // Custom Responses
  whyInterested: text('why_interested'),
  strengthsWeaknesses: text('strengths_weaknesses'),
  careerGoals: text('career_goals'),
  additionalInfo: text('additional_info'),
  customResponses: json('custom_responses').$type<Record<string, string>>(),
  
  // Notification preferences
  whatsappNumber: varchar('whatsapp_number', { length: 20 }),
  enableWhatsappNotifications: boolean('enable_whatsapp_notifications').default(false),
  enableEmailNotifications: boolean('enable_email_notifications').default(true),
  
  // AI & Automation preferences
  enableAICoverLetter: boolean('enable_ai_cover_letter').default(true),
  coverLetterTemplate: text('cover_letter_template'),
  preferredLoginMethod: varchar('preferred_login_method', { length: 20 }).default('manual'),
  
  // Files
  resumeFileName: varchar('resume_file_name', { length: 255 }),
  coverLetterFileName: varchar('cover_letter_file_name', { length: 255 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
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
  profileSnapshot: json('profile_snapshot').$type<ComprehensiveProfile>(), // Store user profile at time of application
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
  loginCredentials: json('login_credentials'), // Encrypted email/password for auto-login
  reviewEmailSent: boolean('review_email_sent').default(false).notNull(),
  whatsappReviewSent: boolean('whatsapp_review_sent').default(false).notNull(),
  approvalToken: varchar('approval_token', { length: 64 }).notNull(),
  screenshotPath: text('screenshot_path'), // Path to submission screenshot
  htmlSnapshotPath: text('html_snapshot_path'), // Path to HTML snapshot
  autoGeneratedCoverLetter: text('auto_generated_cover_letter'), // AI-generated cover letter
  submissionResult: varchar('submission_result', { length: 50 }), // success/failure
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  submittedAt: timestamp('submitted_at'),
});

export const applicationLogs = pgTable('application_logs', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 36 }).references(() => applicationSessions.id),
  userId: integer('user_id').references(() => users.id).notNull(),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  jobUrl: text('job_url').notNull(),
  result: varchar('result', { length: 50 }).notNull(), // success/failure/pending
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  notes: text('notes'),
});

// Login Sessions for Secure Login Link System
export const loginSessions = pgTable('login_sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  sessionId: varchar('session_id', { length: 36 }).references(() => applicationSessions.id).notNull(),
  platform: varchar('platform', { length: 100 }).notNull(), // google, linkedin, workday, etc.
  loginUrl: text('login_url').notNull(), // Original job portal login URL
  jobUrl: text('job_url').notNull(),
  secureToken: varchar('secure_token', { length: 128 }).notNull().unique(),
  browserSessionData: json('browser_session_data'), // Stored cookies/session after login
  loginStatus: varchar('login_status', { length: 50 }).default('pending').notNull(), // pending, completed, expired, failed
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  authMethod: varchar('auth_method', { length: 50 }).notNull().default('manual'),
  errorMessage: text('error_message'),
  loginCompletedAt: timestamp('login_completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobApplications: many(jobApplications),
  applicationSessions: many(applicationSessions),
  applicationLogs: many(applicationLogs),
  loginSessions: many(loginSessions),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  user: one(users, {
    fields: [jobApplications.userId],
    references: [users.id],
  }),
}));

export const applicationSessionsRelations = relations(applicationSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [applicationSessions.userId],
    references: [users.id],
  }),
  logs: many(applicationLogs),
  loginSessions: many(loginSessions),
}));

export const loginSessionsRelations = relations(loginSessions, ({ one }) => ({
  user: one(users, {
    fields: [loginSessions.userId],
    references: [users.id],
  }),
  applicationSession: one(applicationSessions, {
    fields: [loginSessions.sessionId],
    references: [applicationSessions.id],
  }),
}));

export const applicationLogsRelations = relations(applicationLogs, ({ one }) => ({
  user: one(users, {
    fields: [applicationLogs.userId],
    references: [users.id],
  }),
  session: one(applicationSessions, {
    fields: [applicationLogs.sessionId],
    references: [applicationSessions.id],
  }),
}));

// Database Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type JobApplicationRecord = typeof jobApplications.$inferSelect;
export type InsertJobApplication = typeof jobApplications.$inferInsert;
export type ApplicationSessionRecord = typeof applicationSessions.$inferSelect;
export type InsertApplicationSession = typeof applicationSessions.$inferInsert;
export type ApplicationLogRecord = typeof applicationLogs.$inferSelect;
export type InsertApplicationLog = typeof applicationLogs.$inferInsert;
export type LoginSessionRecord = typeof loginSessions.$inferSelect;
export type InsertLoginSession = typeof loginSessions.$inferInsert;

// Insert Schemas for Validation  
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({ id: true, appliedAt: true });

export type InsertUserType = z.infer<typeof insertUserSchema>;
export type InsertJobApplicationType = z.infer<typeof insertJobApplicationSchema>;
