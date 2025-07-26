import { users, jobApplications, type User, type InsertUser, type JobApplicationRecord, type InsertJobApplication } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
  
  // Temporary data operations (for automation sessions)
  getTemporaryData(id: string): Promise<any>;
  setTemporaryData(id: string, data: any): Promise<void>;
  deleteTemporaryData(id: string): Promise<void>;
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

  // Temporary data for automation sessions
  async getTemporaryData(id: string): Promise<any> {
    return this.tempData.get(id);
  }

  async setTemporaryData(id: string, data: any): Promise<void> {
    this.tempData.set(id, data);
  }

  async deleteTemporaryData(id: string): Promise<void> {
    this.tempData.delete(id);
  }
}

export const storage = new DatabaseStorage();
