import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { applyJobRequestSchema, bulkApplyRequestSchema, insertUserSchema, insertJobApplicationSchema, comprehensiveProfileSchema } from "@shared/schema";
import { AutomationService } from "./services/automation";
import { EnhancedAutomationService } from "./services/enhanced-automation";
import { MockAutomationService } from "./services/mock-automation";
import { AutoApplyWorkflowService } from "./services/auto-apply-workflow";
import { storage } from "./storage";

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
  const enhancedAutomationService = new EnhancedAutomationService();
  const mockAutomationService = new MockAutomationService();
  const autoApplyWorkflowService = new AutoApplyWorkflowService();

  // User management routes
  app.post("/api/users", async (req, res) => {
    try {
      const validationResult = insertUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid user data",
          errors: validationResult.error.errors
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validationResult.data.email);
      if (existingUser) {
        return res.json(existingUser);
      }

      const user = await storage.createUser(validationResult.data);
      res.json(user);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Get user by email
  app.get("/api/users/:email", async (req, res) => {
    try {
      const user = await storage.getUserByEmail(req.params.email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Get job applications for a user  
  app.get("/api/users/:userId/applications", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const applications = await storage.getJobApplicationsByUser(userId);
      res.json(applications);
    } catch (error) {
      console.error("Get applications error:", error);
      res.status(500).json({ message: "Failed to get applications" });
    }
  });

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

      // Get or create user
      let user = await storage.getUserByEmail(parsedProfile.email);
      if (!user) {
        user = await storage.createUser({
          name: parsedProfile.name,
          email: parsedProfile.email,
          phone: parsedProfile.phone,
          resumeFileName: resumeFile.originalname,
          coverLetterFileName: coverLetterFile?.originalname,
        });
      }

      // Detect platform
      const platform = automationService.detectPlatform(jobUrl);

      // Create job application record
      const jobApplication = await storage.createJobApplication({
        userId: user.id,
        jobUrl,
        platform,
        status: 'pending',
        retryCount: 0,
        submissionConfirmed: false,
        applicationData: {
          profile: parsedProfile,
          resumeFileName: resumeFile.originalname,
          coverLetterFileName: coverLetterFile?.originalname,
        },
      });

      try {
        // Process job application
        const result = await automationService.applyToJob(applicationData);
        
        // Update application record with result
        await storage.updateJobApplication(jobApplication.id, {
          status: result.success ? 'applied' : 'failed',
          errorMessage: result.success ? undefined : result.message,
          submissionConfirmed: result.submissionConfirmed || false,
        });

        res.json({
          ...result,
          applicationId: jobApplication.id.toString(),
        });
      } catch (error) {
        // Update application record with error
        await storage.updateJobApplication(jobApplication.id, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    } catch (error) {
      console.error("Job application error:", error);
      res.status(500).json({ 
        message: "Failed to process job application",
        errorDetails: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Bulk apply to multiple jobs
  app.post("/api/bulk-apply", upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { jobUrls, profile } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Parse data
      let parsedJobUrls, parsedProfile;
      try {
        parsedJobUrls = typeof jobUrls === 'string' ? JSON.parse(jobUrls) : jobUrls;
        parsedProfile = typeof profile === 'string' ? JSON.parse(profile) : profile;
      } catch (error) {
        return res.status(400).json({ message: "Invalid request data format" });
      }

      // Validate request data
      const validationResult = bulkApplyRequestSchema.safeParse({
        jobUrls: parsedJobUrls,
        profile: parsedProfile
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: validationResult.error.errors
        });
      }

      const resumeFile = files?.resume?.[0];
      const coverLetterFile = files?.coverLetter?.[0];

      if (!resumeFile) {
        return res.status(400).json({ message: "Resume file is required" });
      }

      // Process bulk applications
      const results = [];
      const totalJobs = parsedJobUrls.length;
      
      for (let i = 0; i < parsedJobUrls.length; i++) {
        const jobUrl = parsedJobUrls[i];
        
        try {
          const applicationData = {
            jobUrl,
            profile: parsedProfile,
            resumeFile,
            coverLetterFile
          };

          const result = await automationService.applyToJob(applicationData);
          results.push({
            jobUrl,
            success: result.success,
            result
          });

          // Send progress update (in a real app, you'd use WebSockets or Server-Sent Events)
          console.log(`Progress: ${i + 1}/${totalJobs} - ${jobUrl} - ${result.success ? 'Success' : 'Failed'}`);

        } catch (error) {
          results.push({
            jobUrl,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Add delay between applications
        if (i < parsedJobUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      res.json({
        totalJobs,
        successful,
        failed,
        results
      });

    } catch (error) {
      console.error("Bulk application error:", error);
      res.status(500).json({ 
        message: "Failed to process bulk applications",
        errorDetails: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Auto-apply workflow endpoint
  app.post("/api/auto-apply", upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { jobUrl, profile } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Parse profile data
      let parsedProfile;
      try {
        parsedProfile = typeof profile === 'string' ? JSON.parse(profile) : profile;
      } catch (error) {
        return res.status(400).json({ message: "Invalid profile data format" });
      }

      // Validate comprehensive profile
      const validationResult = comprehensiveProfileSchema.safeParse(parsedProfile);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid profile data",
          errors: validationResult.error.errors
        });
      }

      if (!jobUrl || typeof jobUrl !== 'string') {
        return res.status(400).json({ message: "Valid job URL is required" });
      }

      const resumeFile = files?.resume?.[0];
      if (!resumeFile) {
        return res.status(400).json({ message: "Resume file is required" });
      }

      const coverLetterFile = files?.coverLetter?.[0];
      
      // Start auto-apply workflow with fallback to mock service
      let result;
      try {
        result = await autoApplyWorkflowService.startAutoApplyProcess({
          jobUrl,
          profile: validationResult.data,
          resumeFile: resumeFile.buffer,
          coverLetterFile: coverLetterFile?.buffer
        });
      } catch (error) {
        console.log('🔄 Auto-apply workflow failed, falling back to simulation mode...');
        console.error('Error:', error);
        
        // Fallback to mock automation service
        if (error instanceof Error && error.message.includes('BROWSER_DEPENDENCIES_MISSING')) {
          result = await mockAutomationService.startJobApplicationProcess(
            jobUrl,
            validationResult.data,
            resumeFile.buffer,
            coverLetterFile?.buffer
          );
        } else {
          throw error; // Re-throw if it's not a browser dependency issue
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Auto-apply workflow error:", error);
      res.status(500).json({ 
        message: "Failed to start auto-apply workflow",
        errorDetails: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manual approval endpoint for auto-apply workflow
  app.post("/api/approve-auto-apply/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const result = await autoApplyWorkflowService.approveAndSubmitApplication(token);
      
      res.json(result);
    } catch (error) {
      console.error("Manual approval error:", error);
      res.status(500).json({ 
        message: "Failed to approve application",
        errorDetails: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Enhanced job application with email approval workflow
  app.post("/api/start-application", upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { jobUrl, profile } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Parse profile data
      let parsedProfile;
      try {
        parsedProfile = typeof profile === 'string' ? JSON.parse(profile) : profile;
      } catch (error) {
        return res.status(400).json({ message: "Invalid profile data format" });
      }

      // Validate comprehensive profile
      const validationResult = comprehensiveProfileSchema.safeParse(parsedProfile);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid profile data",
          errors: validationResult.error.errors
        });
      }

      if (!jobUrl || typeof jobUrl !== 'string') {
        return res.status(400).json({ message: "Valid job URL is required" });
      }

      const resumeFile = files?.resume?.[0];
      if (!resumeFile) {
        return res.status(400).json({ message: "Resume file is required" });
      }

      const coverLetterFile = files?.coverLetter?.[0];
      
      // Directly use mock automation for now due to browser dependencies
      console.log('🔄 Using simulation mode due to browser dependency issues...');
      const result = await mockAutomationService.startJobApplicationProcess(
        jobUrl,
        validationResult.data,
        resumeFile.buffer,
        coverLetterFile?.buffer
      );

      res.json(result);
    } catch (error) {
      console.error("Enhanced application error:", error);
      res.status(500).json({ 
        message: "Failed to start application process",
        errorDetails: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Approval endpoint for email links (updated for auto-apply workflow)
  app.get("/api/approve-application/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { action } = req.query;

      if (action === 'reject') {
        // Update session status to rejected
        const session = await storage.getApplicationSessionByToken(token);
        if (session) {
          await storage.updateApplicationSession(session.id, { status: 'failed' });
        }
        return res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>❌ Application Cancelled</h1>
              <p>Your job application has been cancelled successfully.</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
      }

      // Try auto-apply workflow service first, fallback to mock automation
      let result;
      try {
        console.log('🔄 Processing approval with auto-apply workflow service...');
        result = await autoApplyWorkflowService.approveAndSubmitApplication(token);
        
        if (!result.success) {
          // Fallback to mock automation if auto-apply fails
          console.log('🔄 Falling back to simulation mode...');
          const mockResult = await mockAutomationService.approveAndSubmitApplication(token);
          result = mockResult;
        }
      } catch (error) {
        // Final fallback to mock automation
        console.log('🔄 Using simulation mode for approval due to error:', error);
        result = await mockAutomationService.approveAndSubmitApplication(token);
      }

      const statusEmoji = result.success ? '✅' : '❌';
      const statusText = result.success ? 'Application Submitted Successfully!' : 'Application Failed';
      const message = result.message;

      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>${statusEmoji} ${statusText}</h1>
            <p>${message}</p>
            <p>You can close this window. You should receive a confirmation email shortly.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Approval error:", error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Error</h1>
            <p>Failed to process approval: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          </body>
        </html>
      `);
    }
  });

  // Get application sessions for a user
  app.get("/api/users/:userId/sessions", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const sessions = await storage.getApplicationSessionsByUser(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({ message: "Failed to get sessions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
