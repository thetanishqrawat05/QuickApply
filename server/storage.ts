import { 
  users, 
  jobApplications, 
  applicationSessions,
  applicationLogs,
  loginSessions,
  type User, 
  type InsertUser, 
  type JobApplicationRecord, 
  type InsertJobApplication,
  type ApplicationSessionRecord,
  type InsertApplicationSession,
  type ApplicationLogRecord,
  type InsertApplicationLog,
  type LoginSessionRecord,
  type InsertLoginSession
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, lt } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  
  // Job application operations
  createJobApplication(insertApplication: InsertJobApplication): Promise<JobApplicationRecord>;
  getJobApplicationsByUser(userId: number): Promise<JobApplicationRecord[]>;
  updateJobApplication(id: number, data: Partial<InsertJobApplication>): Promise<JobApplicationRecord>;
  getJobApplication(id: number): Promise<JobApplicationRecord | undefined>;
  
  // Application session operations
  createApplicationSession(insertSession: InsertApplicationSession): Promise<ApplicationSessionRecord>;
  getApplicationSession(id: string): Promise<ApplicationSessionRecord | undefined>;
  getApplicationSessionById(id: string): Promise<ApplicationSessionRecord | undefined>;
  getApplicationSessionByToken(token: string): Promise<ApplicationSessionRecord | undefined>;
  getApplicationSessionsByUser(userId: number): Promise<ApplicationSessionRecord[]>;
  updateApplicationSession(id: string, data: Partial<InsertApplicationSession>): Promise<ApplicationSessionRecord>;
  deleteExpiredSessions(): Promise<void>;
  
  // Application log operations
  createApplicationLog(insertLog: InsertApplicationLog): Promise<ApplicationLogRecord>;
  getApplicationLogsByUser(userId: number): Promise<ApplicationLogRecord[]>;
  getApplicationLogsBySession(sessionId: string): Promise<ApplicationLogRecord[]>;
  
  // Login session operations
  createLoginSession(insertLoginSession: InsertLoginSession): Promise<LoginSessionRecord>;
  getLoginSessionByToken(token: string): Promise<LoginSessionRecord | undefined>;
  getLoginSessionsByUser(userEmail: string): Promise<LoginSessionRecord[]>;
  getLoginSessionsByUserId(userId: number): Promise<LoginSessionRecord[]>;
  getLoginSessionsByApplicationSessionId(sessionId: string): Promise<LoginSessionRecord[]>;
  updateLoginSession(token: string, data: Partial<InsertLoginSession>): Promise<LoginSessionRecord>;
  getExpiredLoginSessions(): Promise<LoginSessionRecord[]>;
  deleteExpiredLoginSessions(): Promise<void>;
  
  // Temporary data operations (for automation sessions)
  getTemporaryData(id: string): Promise<any>;
  setTemporaryData(id: string, data: any): Promise<void>;
  deleteTemporaryData(id: string): Promise<void>;
  
  // Profile management
  updateUserProfile(email: string, profile: import("@shared/schema").ComprehensiveProfile): Promise<User | undefined>;
  getUserProfile(email: string): Promise<import("@shared/schema").ComprehensiveProfile | undefined>;
}

export class DatabaseStorage implements IStorage {
  private tempData: Map<string, any> = new Map();

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createJobApplication(insertApplication: InsertJobApplication): Promise<JobApplicationRecord> {
    const [application] = await db
      .insert(jobApplications)
      .values(insertApplication)
      .returning();
    return application;
  }

  async getJobApplicationsByUser(userId: number): Promise<JobApplicationRecord[]> {
    return db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.userId, userId))
      .orderBy(desc(jobApplications.appliedAt));
  }

  async updateJobApplication(id: number, data: Partial<InsertJobApplication>): Promise<JobApplicationRecord> {
    const [application] = await db
      .update(jobApplications)
      .set(data)
      .where(eq(jobApplications.id, id))
      .returning();
    return application;
  }

  async getJobApplication(id: number): Promise<JobApplicationRecord | undefined> {
    const [application] = await db.select().from(jobApplications).where(eq(jobApplications.id, id));
    return application || undefined;
  }

  async createApplicationSession(insertSession: InsertApplicationSession): Promise<ApplicationSessionRecord> {
    const [session] = await db
      .insert(applicationSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getApplicationSession(id: string): Promise<ApplicationSessionRecord | undefined> {
    const [session] = await db.select().from(applicationSessions).where(eq(applicationSessions.id, id));
    return session || undefined;
  }

  async getApplicationSessionById(id: string): Promise<ApplicationSessionRecord | undefined> {
    return this.getApplicationSession(id);
  }

  async getApplicationSessionByToken(token: string): Promise<ApplicationSessionRecord | undefined> {
    const [session] = await db.select().from(applicationSessions).where(eq(applicationSessions.approvalToken, token));
    return session || undefined;
  }

  async getApplicationSessionsByUser(userId: number): Promise<ApplicationSessionRecord[]> {
    return db
      .select()
      .from(applicationSessions)
      .where(eq(applicationSessions.userId, userId))
      .orderBy(desc(applicationSessions.createdAt));
  }

  async updateApplicationSession(id: string, data: Partial<InsertApplicationSession>): Promise<ApplicationSessionRecord> {
    const [session] = await db
      .update(applicationSessions)
      .set(data)
      .where(eq(applicationSessions.id, id))
      .returning();
    return session;
  }

  async deleteExpiredSessions(): Promise<void> {
    await db.delete(applicationSessions).where(lt(applicationSessions.expiresAt, new Date()));
  }

  async createApplicationLog(insertLog: InsertApplicationLog): Promise<ApplicationLogRecord> {
    const [log] = await db
      .insert(applicationLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getApplicationLogsByUser(userId: number): Promise<ApplicationLogRecord[]> {
    return db
      .select()
      .from(applicationLogs)
      .where(eq(applicationLogs.userId, userId))
      .orderBy(desc(applicationLogs.timestamp));
  }

  async getApplicationLogsBySession(sessionId: string): Promise<ApplicationLogRecord[]> {
    return db
      .select()
      .from(applicationLogs)
      .where(eq(applicationLogs.sessionId, sessionId))
      .orderBy(desc(applicationLogs.timestamp));
  }

  async createLoginSession(insertLoginSession: InsertLoginSession): Promise<LoginSessionRecord> {
    const [session] = await db
      .insert(loginSessions)
      .values(insertLoginSession)
      .returning();
    return session;
  }

  async getLoginSessionByToken(token: string): Promise<LoginSessionRecord | undefined> {
    const [session] = await db.select().from(loginSessions).where(eq(loginSessions.secureToken, token));
    return session || undefined;
  }

  async getLoginSessionsByUser(userEmail: string): Promise<LoginSessionRecord[]> {
    return db
      .select()
      .from(loginSessions)
      .where(eq(loginSessions.userEmail, userEmail))
      .orderBy(desc(loginSessions.createdAt));
  }

  async getLoginSessionsByUserId(userId: number): Promise<LoginSessionRecord[]> {
    return db
      .select()
      .from(loginSessions)
      .where(eq(loginSessions.userId, userId))
      .orderBy(desc(loginSessions.createdAt));
  }

  async getLoginSessionsByApplicationSessionId(sessionId: string): Promise<LoginSessionRecord[]> {
    return db
      .select()
      .from(loginSessions)
      .where(eq(loginSessions.sessionId, sessionId))
      .orderBy(desc(loginSessions.createdAt));
  }

  async updateLoginSession(token: string, data: Partial<InsertLoginSession>): Promise<LoginSessionRecord> {
    const [session] = await db
      .update(loginSessions)
      .set(data)
      .where(eq(loginSessions.secureToken, token))
      .returning();
    return session;
  }

  async getExpiredLoginSessions(): Promise<LoginSessionRecord[]> {
    return db
      .select()
      .from(loginSessions)
      .where(lt(loginSessions.expiresAt, new Date()));
  }

  async deleteExpiredLoginSessions(): Promise<void> {
    await db.delete(loginSessions).where(lt(loginSessions.expiresAt, new Date()));
  }

  // Temporary data operations
  async getTemporaryData(id: string): Promise<any> {
    return this.tempData.get(id);
  }

  async setTemporaryData(id: string, data: any): Promise<void> {
    this.tempData.set(id, data);
  }

  async deleteTemporaryData(id: string): Promise<void> {
    this.tempData.delete(id);
  }

  // Profile management methods
  async updateUserProfile(email: string, profile: import("@shared/schema").ComprehensiveProfile): Promise<User | undefined> {
    try {
      // Get or create user
      let user = await this.getUserByEmail(email);
      
      if (!user) {
        // Create new user with profile data
        user = await this.createUser({
          name: profile.name || `${profile.firstName} ${profile.lastName}`.trim(),
          email: profile.email,
          phone: profile.phone,
          firstName: profile.firstName,
          lastName: profile.lastName,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          zipCode: profile.zipCode,
          country: profile.country,
          linkedinProfile: profile.linkedinProfile,
          website: profile.website,
          portfolioUrl: profile.portfolioUrl,
          workAuthorization: profile.workAuthorization,
          requiresSponsorship: profile.requiresSponsorship,
          visaStatus: profile.visaStatus,
          desiredSalary: profile.desiredSalary,
          salaryMin: profile.salaryMin,
          salaryMax: profile.salaryMax,
          salaryNegotiable: profile.salaryNegotiable,
          availableStartDate: profile.availableStartDate,
          noticePeriod: profile.noticePeriod,
          highestDegree: profile.highestDegree,
          university: profile.university,
          major: profile.major,
          graduationYear: profile.graduationYear,
          gpa: profile.gpa,
          yearsOfExperience: profile.yearsOfExperience,
          currentTitle: profile.currentTitle,
          currentCompany: profile.currentCompany,
          previousTitle: profile.previousTitle,
          previousCompany: profile.previousCompany,
          skills: profile.skills,
          certifications: profile.certifications,
          languages: profile.languages,
          criminalBackground: profile.criminalBackground,
          drugTest: profile.drugTest,
          backgroundCheckConsent: profile.backgroundCheckConsent,
          race: profile.race,
          gender: profile.gender,
          veteranStatus: profile.veteranStatus,
          disabilityStatus: profile.disabilityStatus,
          jobType: profile.jobType,
          workLocation: profile.workLocation,
          willingToRelocate: profile.willingToRelocate,
          willingToTravel: profile.willingToTravel,
          hasReferences: profile.hasReferences,
          referenceContactInfo: profile.referenceContactInfo,
          whyInterested: profile.whyInterested,
          strengthsWeaknesses: profile.strengthsWeaknesses,
          careerGoals: profile.careerGoals,
          additionalInfo: profile.additionalInfo,
          customResponses: profile.customResponses,
          whatsappNumber: profile.whatsappNumber,
          enableWhatsappNotifications: profile.enableWhatsappNotifications,
          enableEmailNotifications: profile.enableEmailNotifications,
          enableAICoverLetter: profile.enableAICoverLetter,
          coverLetterTemplate: profile.coverLetterTemplate,
          preferredLoginMethod: profile.preferredLoginMethod,
          resumeFileName: profile.resumeFileName,
          coverLetterFileName: profile.coverLetterFileName,
        });
      } else {
        // Update existing user with new profile data
        const [updatedUser] = await db
          .update(users)
          .set({
            name: profile.name || user.name,
            phone: profile.phone || user.phone,
            firstName: profile.firstName,
            lastName: profile.lastName,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            zipCode: profile.zipCode,
            country: profile.country || user.country,
            linkedinProfile: profile.linkedinProfile,
            website: profile.website,
            portfolioUrl: profile.portfolioUrl,
            workAuthorization: profile.workAuthorization,
            requiresSponsorship: profile.requiresSponsorship,
            visaStatus: profile.visaStatus,
            desiredSalary: profile.desiredSalary,
            salaryMin: profile.salaryMin,
            salaryMax: profile.salaryMax,
            salaryNegotiable: profile.salaryNegotiable,
            availableStartDate: profile.availableStartDate,
            noticePeriod: profile.noticePeriod,
            highestDegree: profile.highestDegree,
            university: profile.university,
            major: profile.major,
            graduationYear: profile.graduationYear,
            gpa: profile.gpa,
            yearsOfExperience: profile.yearsOfExperience,
            currentTitle: profile.currentTitle,
            currentCompany: profile.currentCompany,
            previousTitle: profile.previousTitle,
            previousCompany: profile.previousCompany,
            skills: profile.skills,
            certifications: profile.certifications,
            languages: profile.languages,
            criminalBackground: profile.criminalBackground,
            drugTest: profile.drugTest,
            backgroundCheckConsent: profile.backgroundCheckConsent,
            race: profile.race,
            gender: profile.gender,
            veteranStatus: profile.veteranStatus,
            disabilityStatus: profile.disabilityStatus,
            jobType: profile.jobType,
            workLocation: profile.workLocation,
            willingToRelocate: profile.willingToRelocate,
            willingToTravel: profile.willingToTravel,
            hasReferences: profile.hasReferences,
            referenceContactInfo: profile.referenceContactInfo,
            whyInterested: profile.whyInterested,
            strengthsWeaknesses: profile.strengthsWeaknesses,
            careerGoals: profile.careerGoals,
            additionalInfo: profile.additionalInfo,
            customResponses: profile.customResponses,
            whatsappNumber: profile.whatsappNumber,
            enableWhatsappNotifications: profile.enableWhatsappNotifications,
            enableEmailNotifications: profile.enableEmailNotifications,
            enableAICoverLetter: profile.enableAICoverLetter,
            coverLetterTemplate: profile.coverLetterTemplate,
            preferredLoginMethod: profile.preferredLoginMethod,
            resumeFileName: profile.resumeFileName,
            coverLetterFileName: profile.coverLetterFileName,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning();
        
        user = updatedUser;
      }
      
      return user;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return undefined;
    }
  }

  async getUserProfile(email: string): Promise<import("@shared/schema").ComprehensiveProfile | undefined> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) return undefined;
      
      // Convert user record to ComprehensiveProfile format
      return {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        name: user.name,
        email: user.email,
        phone: user.phone,
        countryCode: user.countryCode || '+1',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        country: user.country || 'United States',
        linkedinProfile: user.linkedinProfile || undefined,
        website: user.website || undefined,
        portfolioUrl: user.portfolioUrl || undefined,
        workAuthorization: user.workAuthorization as any || 'us_citizen',
        requiresSponsorship: user.requiresSponsorship || false,
        visaStatus: user.visaStatus || undefined,
        desiredSalary: user.desiredSalary || undefined,
        salaryMin: user.salaryMin || undefined,
        salaryMax: user.salaryMax || undefined,
        salaryNegotiable: user.salaryNegotiable || true,
        availableStartDate: user.availableStartDate || undefined,
        noticePeriod: user.noticePeriod || undefined,
        highestDegree: user.highestDegree as any,
        university: user.university || undefined,
        major: user.major || undefined,
        graduationYear: user.graduationYear || undefined,
        gpa: user.gpa || undefined,
        yearsOfExperience: user.yearsOfExperience || undefined,
        currentTitle: user.currentTitle || undefined,
        currentCompany: user.currentCompany || undefined,
        previousTitle: user.previousTitle || undefined,
        previousCompany: user.previousCompany || undefined,
        skills: user.skills || [],
        certifications: user.certifications || [],
        languages: user.languages || [],
        criminalBackground: user.criminalBackground || undefined,
        drugTest: user.drugTest || undefined,
        backgroundCheckConsent: user.backgroundCheckConsent || true,
        race: user.race as any,
        gender: user.gender as any,
        veteranStatus: user.veteranStatus as any,
        disabilityStatus: user.disabilityStatus as any,
        jobType: user.jobType as any,
        workLocation: user.workLocation as any,
        willingToRelocate: user.willingToRelocate || undefined,
        willingToTravel: user.willingToTravel || undefined,
        hasReferences: user.hasReferences || undefined,
        referenceContactInfo: user.referenceContactInfo || undefined,
        whyInterested: user.whyInterested || undefined,
        strengthsWeaknesses: user.strengthsWeaknesses || undefined,
        careerGoals: user.careerGoals || undefined,
        additionalInfo: user.additionalInfo || undefined,
        customResponses: user.customResponses || {},
        whatsappNumber: user.whatsappNumber || undefined,
        enableWhatsappNotifications: user.enableWhatsappNotifications || false,
        enableEmailNotifications: user.enableEmailNotifications || true,
        enableAICoverLetter: user.enableAICoverLetter || true,
        coverLetterTemplate: user.coverLetterTemplate || undefined,
        preferredLoginMethod: user.preferredLoginMethod as any || 'manual',
        resumeFileName: user.resumeFileName || undefined,
        coverLetterFileName: user.coverLetterFileName || undefined
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();