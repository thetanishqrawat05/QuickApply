import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { applyJobRequestSchema } from "@shared/schema";
import { AutomationService } from "./services/automation";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const automationService = new AutomationService();

  // Detect job platform from URL
  app.post("/api/detect-platform", async (req, res) => {
    try {
      const { jobUrl } = req.body;
      
      if (!jobUrl || typeof jobUrl !== 'string') {
        return res.status(400).json({ message: "Valid job URL is required" });
      }

      const platform = automationService.detectPlatform(jobUrl);
      
      res.json({ 
        platform,
        supported: platform !== 'Unknown Platform'
      });
    } catch (error) {
      console.error("Platform detection error:", error);
      res.status(500).json({ message: "Failed to detect platform" });
    }
  });

  // Apply to job
  app.post("/api/apply-job", upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { jobUrl, profile } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Parse profile data if it's a string
      let parsedProfile;
      try {
        parsedProfile = typeof profile === 'string' ? JSON.parse(profile) : profile;
      } catch (error) {
        return res.status(400).json({ message: "Invalid profile data format" });
      }

      // Validate request data
      const validationResult = applyJobRequestSchema.safeParse({
        jobUrl,
        profile: parsedProfile
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: validationResult.error.errors
        });
      }

      // Prepare file data
      const resumeFile = files?.resume?.[0];
      const coverLetterFile = files?.coverLetter?.[0];

      if (!resumeFile) {
        return res.status(400).json({ message: "Resume file is required" });
      }

      const applicationData = {
        jobUrl,
        profile: parsedProfile,
        resumeFile,
        coverLetterFile
      };

      // Process job application
      const result = await automationService.applyToJob(applicationData);
      
      res.json(result);
    } catch (error) {
      console.error("Job application error:", error);
      res.status(500).json({ 
        message: "Failed to process job application",
        errorDetails: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
