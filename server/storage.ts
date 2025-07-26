import { randomUUID } from "crypto";

// This application uses localStorage on the frontend for data persistence
// The backend storage is only used for temporary data during automation

export interface IStorage {
  // Minimal storage interface since we're using localStorage
  getTemporaryData(id: string): Promise<any>;
  setTemporaryData(id: string, data: any): Promise<void>;
  deleteTemporaryData(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private tempData: Map<string, any>;

  constructor() {
    this.tempData = new Map();
  }

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

export const storage = new MemStorage();
