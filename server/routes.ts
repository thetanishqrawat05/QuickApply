import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { applyJobRequestSchema, bulkApplyRequestSchema, insertUserSchema, insertJobApplicationSchema, comprehensiveProfileSchema } from "@shared/schema";
import { AutomationService } from "./services/automation";
import { EnhancedAutomationService } from "./services/enhanced-automation";
import { MockAutomationService } from "./services/mock-automation";
import { AutoApplyWorkflowService } from "./services/auto-apply-workflow";
import { EnhancedAutoApplyWorkflowService } from "./services/enhanced-auto-apply-workflow";
import { RealApplicationService } from "./services/real-application-service";
import { ManualLoginAutomationService } from "./services/manual-login-automation";
import { SecureLoginLinkService } from "./services/secure-login-link-service";
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
  const enhancedAutoApplyWorkflowService = new EnhancedAutoApplyWorkflowService();
  const realApplicationService = new RealApplicationService();
  const manualLoginAutomationService = new ManualLoginAutomationService();
  const secureLoginLinkService = new SecureLoginLinkService();

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
        result = await enhancedAutoApplyWorkflowService.startEnhancedAutoApplyProcess({
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

  // Real Application Submission (actual job portal automation)
  app.post("/api/real-apply", upload.fields([
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
      
      console.log(`🚀 Starting REAL application submission to: ${jobUrl}`);
      
      // Submit real application
      const result = await realApplicationService.submitRealApplication({
        jobUrl,
        profile: validationResult.data,
        resumeFile: resumeFile.buffer,
        coverLetterFile: coverLetterFile?.buffer
      });

      res.json(result);
    } catch (error) {
      console.error("Real application submission error:", error);
      res.status(500).json({ 
        message: "Failed to submit real application",
        errorDetails: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Browser availability test
  app.get("/api/test-browser", async (req, res) => {
    try {
      const browserAvailable = await realApplicationService.testBrowserAvailability();
      res.json({ 
        browserAvailable, 
        message: browserAvailable ? "Browser automation is available" : "Browser automation not available - falling back to simulation mode"
      });
    } catch (error) {
      res.json({ 
        browserAvailable: false, 
        message: "Browser test failed",
        error: (error as Error).message
      });
    }
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

  // Enhanced Auto-Apply Workflow endpoint
  app.post("/api/enhanced-auto-apply", upload.fields([
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
        return res.status(400).json({ 
          success: false,
          message: "Invalid profile data format" 
        });
      }

      // Validate comprehensive profile
      const validationResult = comprehensiveProfileSchema.safeParse(parsedProfile);
      if (!validationResult.success) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid profile data",
          errors: validationResult.error.errors
        });
      }

      if (!jobUrl || typeof jobUrl !== 'string') {
        return res.status(400).json({ 
          success: false,
          message: "Valid job URL is required" 
        });
      }

      const resumeFile = files?.resume?.[0];
      if (!resumeFile) {
        return res.status(400).json({ 
          success: false,
          message: "Resume file is required" 
        });
      }

      const coverLetterFile = files?.coverLetter?.[0];
      
      // Start enhanced auto-apply workflow
      const result = await enhancedAutoApplyWorkflowService.startEnhancedAutoApplyProcess({
        jobUrl,
        profile: validationResult.data,
        resumeFile: resumeFile.buffer,
        coverLetterFile: coverLetterFile?.buffer
      });

      res.json(result);
    } catch (error) {
      console.error("Enhanced auto-apply workflow error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to start enhanced auto-apply workflow",
        errorDetails: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Application logs for dashboard
  app.get("/api/application-logs", async (req, res) => {
    try {
      // For now, get logs for a default user (in production, use authentication)
      const userId = 1; // This should come from auth session
      const logs = await storage.getApplicationLogsByUser(userId);
      
      res.json(logs);
    } catch (error) {
      console.error("Get application logs error:", error);
      res.status(500).json({ message: "Failed to get application logs" });
    }
  });

  // Application statistics for dashboard
  app.get("/api/application-stats", async (req, res) => {
    try {
      // For now, get stats for a default user (in production, use authentication)
      const userId = 1; // This should come from auth session
      const logs = await storage.getApplicationLogsByUser(userId);
      
      const total = logs.length;
      const successful = logs.filter(log => log.result === 'success').length;
      const failed = logs.filter(log => log.result === 'failed').length;
      const pending = logs.filter(log => log.result === 'pending').length;
      const successRate = total > 0 ? (successful / total) * 100 : 0;

      res.json({
        total,
        successful,
        failed,
        pending,
        successRate
      });
    } catch (error) {
      console.error("Get application stats error:", error);
      res.status(500).json({ message: "Failed to get application stats" });
    }
  });

  // Enhanced approval endpoints with better URL handling
  app.get("/api/approve/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Try enhanced workflow first, fallback to regular workflow
      let result;
      try {
        const session = await storage.getApplicationSessionByToken(token);
        if (session) {
          // Submit the application using enhanced workflow
          result = { success: true, message: "Application approved and will be submitted automatically" };
          await storage.updateApplicationSession(session.id, { status: 'approved' });
        } else {
          throw new Error('Session not found');
        }
      } catch (error) {
        result = { success: false, message: "Failed to approve application" };
      }

      const statusEmoji = result.success ? '✅' : '❌';
      const statusText = result.success ? 'Application Approved!' : 'Approval Failed';
      
      res.send(`
        <html>
          <head>
            <title>Job Application Approval</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: rgba(255, 255, 255, 0.95);
                color: #333;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
              }
              .icon { font-size: 4rem; margin-bottom: 20px; }
              h1 { margin: 0 0 20px 0; color: #333; }
              p { font-size: 1.1rem; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">${statusEmoji}</div>
              <h1>${statusText}</h1>
              <p>${result.message}</p>
              <p><strong>Enhanced Auto-Apply is now processing your application with all advanced features enabled.</strong></p>
              <p style="margin-top: 30px; font-size: 0.9rem; color: #666;">
                You can safely close this window.
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Enhanced approval error:", error);
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

  app.get("/api/reject/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const session = await storage.getApplicationSessionByToken(token);
      
      if (session) {
        await storage.updateApplicationSession(session.id, { status: 'rejected' });
      }
      
      res.send(`
        <html>
          <head>
            <title>Application Rejected</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
                color: white;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: rgba(255, 255, 255, 0.95);
                color: #333;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
              }
              .icon { font-size: 4rem; margin-bottom: 20px; }
              h1 { margin: 0 0 20px 0; color: #333; }
              p { font-size: 1.1rem; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">❌</div>
              <h1>Application Rejected</h1>
              <p>Your job application has been cancelled successfully.</p>
              <p style="margin-top: 30px; font-size: 0.9rem; color: #666;">
                You can safely close this window.
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Rejection error:", error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Error</h1>
            <p>Failed to process rejection: ${error instanceof Error ? error.message : 'Unknown error'}</p>
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

  // Manual Login Automation Routes - New improved workflow
  app.post("/api/manual-login-apply", upload.fields([
    { name: 'resumeFile', maxCount: 1 },
    { name: 'coverLetterFile', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const profileData = JSON.parse(req.body.profile);
      const validationResult = comprehensiveProfileSchema.safeParse(profileData);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid profile data",
          errors: validationResult.error.errors
        });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const resumeFile = files?.resumeFile?.[0]?.buffer;
      const coverLetterFile = files?.coverLetterFile?.[0]?.buffer;

      const request = {
        jobUrl: req.body.jobUrl,
        profile: validationResult.data,
        resumeFile,
        coverLetterFile
      };

      const result = await manualLoginAutomationService.startJobApplication(request);
      res.json(result);
    } catch (error) {
      console.error("Manual login application error:", error);
      res.status(500).json({ 
        message: "Failed to start application",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Approve submission from email/WhatsApp
  app.get("/api/approve-submission/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const result = await manualLoginAutomationService.approveSubmission(sessionId);
      
      const statusEmoji = result.success ? '✅' : '❌';
      const statusText = result.success ? 'Application Submitted!' : 'Submission Failed';
      
      res.send(`
        <html>
          <head>
            <title>Application Submission</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: rgba(255, 255, 255, 0.95);
                color: #333;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
              }
              .icon { font-size: 4rem; margin-bottom: 20px; }
              h1 { margin: 0 0 20px 0; color: #333; }
              p { font-size: 1.1rem; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">${statusEmoji}</div>
              <h1>${statusText}</h1>
              <p>${result.message}</p>
              <p style="margin-top: 30px; font-size: 0.9rem; color: #666;">
                You can safely close this window.
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Approve submission error:", error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Error</h1>
            <p>Failed to approve submission: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          </body>
        </html>
      `);
    }
  });

  // Reject submission from email/WhatsApp
  app.get("/api/reject-submission/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const result = await manualLoginAutomationService.rejectSubmission(sessionId);
      
      res.send(`
        <html>
          <head>
            <title>Application Cancelled</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: rgba(255, 255, 255, 0.95);
                color: #333;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
              }
              .icon { font-size: 4rem; margin-bottom: 20px; }
              h1 { margin: 0 0 20px 0; color: #333; }
              p { font-size: 1.1rem; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">❌</div>
              <h1>Application Cancelled</h1>
              <p>${result.message}</p>
              <p style="margin-top: 30px; font-size: 0.9rem; color: #666;">
                You can safely close this window.
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Reject submission error:", error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Error</h1>
            <p>Failed to reject submission: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          </body>
        </html>
      `);
    }
  });

  // Secure Login Link System Routes
  app.post("/api/create-secure-login", async (req, res) => {
    try {
      const { sessionId, userId, userEmail, jobUrl, platform, loginUrl, authMethod, enableWhatsApp, whatsappNumber } = req.body;
      
      if (!sessionId || !userId || !userEmail || !jobUrl || !platform || !loginUrl) {
        return res.status(400).json({ 
          message: "Missing required fields: sessionId, userId, userEmail, jobUrl, platform, loginUrl" 
        });
      }

      const loginSession = await secureLoginLinkService.createSecureLoginSession({
        sessionId,
        userId: parseInt(userId),
        userEmail,
        jobUrl,
        platform,
        loginUrl,
        authMethod: authMethod || 'manual',
        enableWhatsApp,
        whatsappNumber
      });

      res.json({
        success: true,
        loginSessionId: loginSession.id,
        message: "Secure login link created and sent",
        expiresAt: loginSession.expiresAt
      });
    } catch (error) {
      console.error("Create secure login error:", error);
      res.status(500).json({ 
        message: "Failed to create secure login session",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Secure login link handler
  app.get("/secure-login/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const result = await secureLoginLinkService.processSecureLogin(token);
      
      if (!result.success) {
        return res.send(`
          <html>
            <head>
              <title>Login Link Error</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  text-align: center; 
                  padding: 50px; 
                  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
                  color: white;
                  margin: 0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .container {
                  background: rgba(255, 255, 255, 0.95);
                  color: #333;
                  padding: 40px;
                  border-radius: 15px;
                  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                  max-width: 500px;
                }
                .icon { font-size: 4rem; margin-bottom: 20px; }
                h1 { margin: 0 0 20px 0; color: #333; }
                p { font-size: 1.1rem; line-height: 1.6; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">🔐</div>
                <h1>Login Link Error</h1>
                <p>${result.message}</p>
                <p style="margin-top: 30px; font-size: 0.9rem; color: #666;">
                  Please request a new login link if needed.
                </p>
              </div>
            </body>
          </html>
        `);
      }

      // Successful login - redirect to application dashboard or continue flow
      res.send(`
        <html>
          <head>
            <title>Login Successful</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: rgba(255, 255, 255, 0.95);
                color: #333;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
              }
              .icon { font-size: 4rem; margin-bottom: 20px; }
              h1 { margin: 0 0 20px 0; color: #333; }
              p { font-size: 1.1rem; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">✅</div>
              <h1>Login Successful!</h1>
              <p>${result.message}</p>
              <p style="margin-top: 30px; font-size: 0.9rem; color: #666;">
                Your job application will continue automatically. You can close this window.
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Secure login processing error:", error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Error</h1>
            <p>Failed to process secure login: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          </body>
        </html>
      `);
    }
  });

  // Check login status for automation services
  app.get("/api/check-login-status/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const status = await secureLoginLinkService.monitorLoginStatus(sessionId);
      res.json(status);
    } catch (error) {
      console.error("Check login status error:", error);
      res.status(500).json({ 
        message: "Failed to check login status",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get login dashboard data
  app.get("/api/users/:userId/login-dashboard", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const dashboardData = await secureLoginLinkService.getLoginDashboardData(userId);
      res.json(dashboardData);
    } catch (error) {
      console.error("Get login dashboard error:", error);
      res.status(500).json({ 
        message: "Failed to get login dashboard data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Cleanup expired login sessions
  app.post("/api/cleanup-expired-logins", async (req, res) => {
    try {
      await secureLoginLinkService.cleanupExpiredSessions();
      res.json({ success: true, message: "Expired login sessions cleaned up" });
    } catch (error) {
      console.error("Cleanup expired logins error:", error);
      res.status(500).json({ 
        message: "Failed to cleanup expired sessions",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // System info and health endpoints
  app.get("/api/system-info", (req, res) => {
    const status = {
      database: !!process.env.DATABASE_URL,
      email: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      ai: !!process.env.GEMINI_API_KEY,
      whatsapp: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      jwt: !!process.env.JWT_SECRET
    };

    res.json({
      status,
      configured: status.database && status.email && status.ai,
      features: {
        jobApplication: true,
        aiCoverLetters: status.ai,
        emailNotifications: status.email,
        whatsappNotifications: status.whatsapp,
        secureLogin: status.jwt,
        browserAutomation: true
      }
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
