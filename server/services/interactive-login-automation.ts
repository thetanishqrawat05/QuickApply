import { Page, Browser, BrowserContext } from 'playwright';
import { RobustBrowserService } from './robust-browser-service';
import { UniversalFormDetector } from './universal-form-detector';
import { ScreenshotService } from './screenshot-service';
import { ComprehensiveProfile } from '@shared/schema';
import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';

export interface InteractiveApplicationRequest {
  jobUrl: string;
  profile: ComprehensiveProfile;
  resumeFile?: Buffer;
  coverLetterFile?: Buffer;
}

export interface InteractiveSession {
  sessionId: string;
  browserContext: BrowserContext;
  page: Page;
  jobDetails: {
    title: string;
    company: string;
    description: string;
  };
  isLoggedIn: boolean;
  formFilled: boolean;
  status: 'waiting_for_login' | 'ready_to_fill' | 'form_filled' | 'submitted' | 'error';
}

export class InteractiveLoginAutomationService {
  private browserService: RobustBrowserService;
  private formDetector: UniversalFormDetector;
  private screenshotService: ScreenshotService;
  private activeSessions: Map<string, InteractiveSession> = new Map();

  constructor() {
    this.browserService = new RobustBrowserService();
    this.formDetector = new UniversalFormDetector();
    this.screenshotService = new ScreenshotService();
  }

  async startInteractiveSession(request: InteractiveApplicationRequest): Promise<{
    success: boolean;
    sessionId: string;
    message: string;
    browserUrl: string;
    requiresLogin: boolean;
  }> {
    const sessionId = uuidv4();

    try {
      console.log(`🚀 Starting interactive session for: ${request.jobUrl}`);

      // Create user record
      let user = await storage.getUserByEmail(request.profile.email);
      if (!user) {
        user = await storage.createUser({
          name: request.profile.name,
          email: request.profile.email,
          phone: request.profile.phone,
          resumeFileName: request.profile.resumeFileName,
          coverLetterFileName: request.profile.coverLetterFileName,
        });
      }

      // Launch browser
      const browser = await this.browserService.launchBrowser();
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();

      // Navigate to job page
      console.log(`📱 Navigating to: ${request.jobUrl}`);
      await page.goto(request.jobUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Take initial screenshot
      await this.screenshotService.captureScreenshot(page, sessionId, 'page-loaded');

      // Extract job details
      const jobDetails = await this.extractJobDetails(page);
      console.log(`📋 Job Details: ${jobDetails.title} at ${jobDetails.company}`);

      // Check if login is required
      const requiresLogin = await this.checkLoginRequired(page);
      
      // Create session record
      const session: InteractiveSession = {
        sessionId,
        browserContext: context,
        page,
        jobDetails,
        isLoggedIn: !requiresLogin,
        formFilled: false,
        status: requiresLogin ? 'waiting_for_login' : 'ready_to_fill'
      };

      this.activeSessions.set(sessionId, session);

      // Save to database
      await storage.createApplicationSession({
        id: sessionId,
        userId: user.id,
        jobUrl: request.jobUrl,
        platform: this.detectPlatform(request.jobUrl),
        status: requiresLogin ? 'pending_login' : 'ready_to_fill',
        profileData: request.profile,
        jobTitle: jobDetails.title,
        company: jobDetails.company,
        reviewEmailSent: false,
        whatsappReviewSent: false,
        approvalToken: uuidv4(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      return {
        success: true,
        sessionId,
        message: requiresLogin 
          ? 'Please login to the company portal. I\'ll detect when you\'re logged in and then fill the form automatically.'
          : 'Ready to fill the application form!',
        browserUrl: request.jobUrl,
        requiresLogin
      };

    } catch (error) {
      console.error('❌ Error starting interactive session:', error);
      return {
        success: false,
        sessionId,
        message: `Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        browserUrl: request.jobUrl,
        requiresLogin: false
      };
    }
  }

  async checkLoginStatus(sessionId: string): Promise<{
    isLoggedIn: boolean;
    canProceed: boolean;
    message: string;
    status: string;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        isLoggedIn: false,
        canProceed: false,
        message: 'Session not found',
        status: 'error'
      };
    }

    try {
      // Check if user is now logged in
      const wasLoggedIn = session.isLoggedIn;
      session.isLoggedIn = await this.checkIfLoggedIn(session.page);

      if (!wasLoggedIn && session.isLoggedIn) {
        console.log(`✅ User logged in for session ${sessionId}`);
        session.status = 'ready_to_fill';
        await this.screenshotService.captureScreenshot(session.page, sessionId, 'login-success');
      }

      return {
        isLoggedIn: session.isLoggedIn,
        canProceed: session.isLoggedIn,
        message: session.isLoggedIn 
          ? 'Great! You\'re logged in. Ready to fill the form.'
          : 'Please complete your login to continue.',
        status: session.status
      };

    } catch (error) {
      console.error('Error checking login status:', error);
      return {
        isLoggedIn: false,
        canProceed: false,
        message: 'Error checking login status',
        status: 'error'
      };
    }
  }

  async fillApplicationForm(sessionId: string): Promise<{
    success: boolean;
    message: string;
    formFilled: boolean;
    readyToSubmit: boolean;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        message: 'Session not found',
        formFilled: false,
        readyToSubmit: false
      };
    }

    if (!session.isLoggedIn) {
      return {
        success: false,
        message: 'Please login first before filling the form',
        formFilled: false,
        readyToSubmit: false
      };
    }

    try {
      console.log(`📝 Filling application form for session ${sessionId}`);
      
      // Get session data from database
      const sessionData = await storage.getApplicationSession(sessionId);
      if (!sessionData?.profileData) {
        throw new Error('Profile data not found');
      }

      const profile = sessionData.profileData as ComprehensiveProfile;

      // Take screenshot before filling
      await this.screenshotService.captureScreenshot(session.page, sessionId, 'before-form-fill');

      // Detect and fill form fields
      const detectedFields = await this.formDetector.detectAllFormFields(session.page);
      const fillResults = await this.fillDetectedFields(session.page, detectedFields, profile);
      console.log(`📋 Form filling results:`, fillResults);

      // Handle file uploads if needed
      await this.handleFileUploads(session.page, profile, sessionId);

      // Take screenshot after filling
      await this.screenshotService.captureScreenshot(session.page, sessionId, 'form-filled');

      session.formFilled = true;
      session.status = 'form_filled';

      // Update database
      await storage.updateApplicationSession(sessionId, {
        status: 'form_filled',
        filledFormData: fillResults.filledFields
      });

      return {
        success: true,
        message: `Form filled successfully! Found and filled ${fillResults.filledFields} fields.`,
        formFilled: true,
        readyToSubmit: true
      };

    } catch (error) {
      console.error('❌ Error filling form:', error);
      session.status = 'error';
      
      return {
        success: false,
        message: `Error filling form: ${error instanceof Error ? error.message : 'Unknown error'}`,
        formFilled: false,
        readyToSubmit: false
      };
    }
  }

  async submitApplication(sessionId: string): Promise<{
    success: boolean;
    message: string;
    submitted: boolean;
    confirmationDetails?: any;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        message: 'Session not found',
        submitted: false
      };
    }

    if (!session.formFilled) {
      return {
        success: false,
        message: 'Please fill the form first',
        submitted: false
      };
    }

    try {
      console.log(`🚀 Submitting application for session ${sessionId}`);

      // Take screenshot before submission
      await this.screenshotService.captureScreenshot(session.page, sessionId, 'pre-submission');

      // Find and click submit button
      const submitButton = await session.page.locator([
        'input[type="submit"]',
        'button[type="submit"]',
        'button:has-text("Submit")',
        'button:has-text("Apply")',
        'button:has-text("Send Application")',
        '[data-testid*="submit"]',
        '[data-testid*="apply"]'
      ].join(', ')).first();

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await session.page.waitForTimeout(3000); // Wait for submission

        // Take final screenshot
        await this.screenshotService.captureScreenshot(session.page, sessionId, 'after-submission');

        // Check for confirmation
        const confirmationText = await this.checkSubmissionConfirmation(session.page);
        
        session.status = 'submitted';
        
        // Update database
        await storage.updateApplicationSession(sessionId, {
          status: 'submitted',
          submittedAt: new Date()
        });

        return {
          success: true,
          message: 'Application submitted successfully!',
          submitted: true,
          confirmationDetails: { confirmationText }
        };
      } else {
        return {
          success: false,
          message: 'Submit button not found. Please submit manually.',
          submitted: false
        };
      }

    } catch (error) {
      console.error('❌ Error submitting application:', error);
      return {
        success: false,
        message: `Error submitting: ${error instanceof Error ? error.message : 'Unknown error'}`,
        submitted: false
      };
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      try {
        await session.browserContext.close();
        this.activeSessions.delete(sessionId);
        console.log(`🧹 Closed session ${sessionId}`);
      } catch (error) {
        console.error('Error closing session:', error);
      }
    }
  }

  // Helper methods
  private async extractJobDetails(page: Page): Promise<{ title: string; company: string; description: string }> {
    try {
      const title = await page.locator('h1, [data-testid*="job-title"], .job-title, .position-title').first().textContent() || 'Unknown Position';
      const company = await page.locator('[data-testid*="company"], .company-name, .employer-name').first().textContent() || 'Unknown Company';
      const description = await page.locator('[data-testid*="description"], .job-description, .position-description').first().textContent() || 'No description available';
      
      return {
        title: title.trim(),
        company: company.trim(),
        description: description.trim().substring(0, 500)
      };
    } catch (error) {
      return {
        title: 'Unknown Position',
        company: 'Unknown Company', 
        description: 'No description available'
      };
    }
  }

  private async checkLoginRequired(page: Page): Promise<boolean> {
    try {
      const loginIndicators = await page.locator([
        'input[type="password"]',
        '[data-testid*="login"]',
        '[data-testid*="sign-in"]',
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        '.login-form',
        '.sign-in-form'
      ].join(', ')).count();
      
      return loginIndicators > 0;
    } catch (error) {
      return false;
    }
  }

  private async checkIfLoggedIn(page: Page): Promise<boolean> {
    try {
      // Check for common logged-in indicators
      const loggedInIndicators = await page.locator([
        '[data-testid*="profile"]',
        '[data-testid*="account"]',
        '[data-testid*="logout"]',
        'button:has-text("Logout")',
        'button:has-text("Sign Out")',
        '.user-profile',
        '.account-menu',
        '.profile-dropdown'
      ].join(', ')).count();

      // Check if login forms are gone
      const loginForms = await page.locator([
        'input[type="password"]',
        '[data-testid*="login"]',
        'button:has-text("Login")',
        '.login-form'
      ].join(', ')).count();

      return loggedInIndicators > 0 || loginForms === 0;
    } catch (error) {
      return false;
    }
  }

  private async handleFileUploads(page: Page, profile: ComprehensiveProfile, sessionId: string): Promise<void> {
    try {
      const fileInputs = await page.locator('input[type="file"]').all();
      
      for (const input of fileInputs) {
        const inputName = await input.getAttribute('name') || '';
        const inputLabel = await input.getAttribute('aria-label') || '';
        
        if (inputName.toLowerCase().includes('resume') || inputLabel.toLowerCase().includes('resume')) {
          if (profile.resumeFileName) {
            const resumePath = path.join(process.cwd(), 'uploads', profile.resumeFileName);
            if (await fs.access(resumePath).then(() => true).catch(() => false)) {
              await input.setInputFiles(resumePath);
              console.log(`📎 Uploaded resume: ${profile.resumeFileName}`);
            }
          }
        } else if (inputName.toLowerCase().includes('cover') || inputLabel.toLowerCase().includes('cover')) {
          if (profile.coverLetterFileName) {
            const coverPath = path.join(process.cwd(), 'uploads', profile.coverLetterFileName);
            if (await fs.access(coverPath).then(() => true).catch(() => false)) {
              await input.setInputFiles(coverPath);
              console.log(`📎 Uploaded cover letter: ${profile.coverLetterFileName}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling file uploads:', error);
    }
  }

  private async checkSubmissionConfirmation(page: Page): Promise<string> {
    try {
      const confirmationSelectors = [
        ':text("thank you")',
        ':text("application submitted")',
        ':text("application received")',
        ':text("successfully submitted")',
        ':text("confirmation")',
        '.success-message',
        '.confirmation-message',
        '[data-testid*="success"]',
        '[data-testid*="confirmation"]'
      ];

      for (const selector of confirmationSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          return await element.textContent() || 'Application submitted';
        }
      }

      return 'Application submitted';
    } catch (error) {
      return 'Application submitted';
    }
  }

  private async fillDetectedFields(page: Page, fields: any[], profile: ComprehensiveProfile): Promise<{ filledFields: number }> {
    let filledCount = 0;

    for (const field of fields) {
      try {
        const value = this.getFieldValue(field, profile);
        if (value) {
          if (field.type === 'select') {
            await field.element.selectOption(value);
          } else if (field.type === 'checkbox' || field.type === 'radio') {
            if (value === 'true' || value === 'Yes') {
              await field.element.check();
            }
          } else {
            await field.element.fill(value);
          }
          filledCount++;
        }
      } catch (error) {
        console.error(`Error filling field ${field.name}:`, error);
      }
    }

    return { filledFields: filledCount };
  }

  private getFieldValue(field: any, profile: ComprehensiveProfile): string {
    const name = field.name.toLowerCase();
    const label = field.label.toLowerCase();
    
    // Map form fields to profile data
    if (name.includes('firstname') || label.includes('first name')) return profile.firstName || '';
    if (name.includes('lastname') || label.includes('last name')) return profile.lastName || '';
    if (name.includes('name') && !name.includes('first') && !name.includes('last')) return profile.name || '';
    if (name.includes('email')) return profile.email || '';
    if (name.includes('phone')) return profile.phone || '';
    if (name.includes('address') && !name.includes('email')) return profile.address || '';
    if (name.includes('city')) return profile.city || '';
    if (name.includes('state')) return profile.state || '';
    if (name.includes('zip') || name.includes('postal')) return profile.zipCode || '';
    if (name.includes('country')) return profile.country || 'United States';
    
    return '';
  }

  private detectPlatform(jobUrl: string): string {
    const url = jobUrl.toLowerCase();
    if (url.includes('greenhouse')) return 'Greenhouse';
    if (url.includes('lever')) return 'Lever';
    if (url.includes('workday')) return 'Workday';
    if (url.includes('bamboohr')) return 'BambooHR';
    if (url.includes('smartrecruiters')) return 'SmartRecruiters';
    if (url.includes('jobvite')) return 'Jobvite';
    if (url.includes('taleo')) return 'Taleo';
    if (url.includes('successfactors')) return 'SuccessFactors';
    return 'Unknown';
  }
}