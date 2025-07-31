import { Page, Browser, BrowserContext } from 'playwright';
import { RobustBrowserService } from './robust-browser-service';
import { GeminiService } from './gemini-service';
import { EmailService } from './email-service';
import { WhatsAppService } from './whatsapp-service';
import { ScreenshotService } from './screenshot-service';
import { ComprehensiveProfile } from '@shared/schema';
import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';

export interface ManualLoginApplicationRequest {
  jobUrl: string;
  profile: ComprehensiveProfile;
  resumeFile?: Buffer;
  coverLetterFile?: Buffer;
  sessionContext?: string; // Stored browser context if user already logged in
}

export interface ApplicationSession {
  sessionId: string;
  browserContext: BrowserContext;
  page: Page;
  jobDetails: {
    title: string;
    company: string;
    description: string;
  };
  isLoggedIn: boolean;
  loginVerified: boolean;
}

export class ManualLoginAutomationService {
  private browserService: RobustBrowserService;
  private geminiService: GeminiService;
  private emailService: EmailService;
  private whatsappService: WhatsAppService;
  private screenshotService: ScreenshotService;
  private activeSessions: Map<string, ApplicationSession> = new Map();

  constructor() {
    this.browserService = new RobustBrowserService();
    this.geminiService = new GeminiService();
    this.emailService = new EmailService();
    this.whatsappService = new WhatsAppService();
    this.screenshotService = new ScreenshotService();
  }

  private async clearOldSessions(userEmail: string): Promise<void> {
    try {
      // Clear any active sessions for this user
      for (const [sessionId, session] of Array.from(this.activeSessions.entries())) {
        const sessionData = await storage.getApplicationSession(sessionId);
        if (sessionData?.profileData && 
            typeof sessionData.profileData === 'object' && 
            'email' in sessionData.profileData && 
            sessionData.profileData.email === userEmail) {
          
          // Close browser context if it exists
          try {
            await session.browserContext.close();
          } catch (error) {
            console.log('Error closing browser context:', error);
          }
          
          this.activeSessions.delete(sessionId);
          console.log(`🧹 Cleared old session ${sessionId} for ${userEmail}`);
        }
      }
    } catch (error) {
      console.log('Error clearing old sessions:', error);
    }
  }

  async startJobApplication(request: ManualLoginApplicationRequest): Promise<{
    success: boolean;
    sessionId: string;
    message: string;
    requiresLogin: boolean;
    browserUrl?: string;
  }> {
    const sessionId = uuidv4();

    try {
      console.log(`🚀 Starting manual login job application for: ${request.jobUrl}`);
      
      // Clear any existing sessions for this user to prevent URL caching issues
      await this.clearOldSessions(request.profile.email);

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

      // Create application session in database with fresh URL
      await storage.createApplicationSession({
        id: sessionId,
        userId: user.id,
        jobUrl: request.jobUrl, // Ensure fresh job URL is used
        platform: this.detectPlatform(request.jobUrl),
        status: 'pending_login',
        profileData: request.profile,
        reviewEmailSent: false,
        whatsappReviewSent: false,
        approvalToken: uuidv4(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      // Launch browser with persistent context
      const browser = await this.browserService.launchBrowser();
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();
      
      // Navigate to the NEW job page URL (ensure fresh navigation)
      console.log(`🌐 Navigating to fresh job URL: ${request.jobUrl}`);
      await page.goto(request.jobUrl, { waitUntil: 'networkidle' });

      // Extract job details
      const jobDetails = await this.extractJobDetails(page);
      
      // Update session with job details
      await storage.updateApplicationSession(sessionId, {
        jobTitle: jobDetails.title,
        company: jobDetails.company,
      });

      // Store active session
      this.activeSessions.set(sessionId, {
        sessionId,
        browserContext: context,
        page,
        jobDetails,
        isLoggedIn: false,
        loginVerified: false
      });

      // Check if login is required
      const requiresLogin = await this.detectLoginRequirement(page);

      if (requiresLogin) {
        console.log('🔐 Login detected - sending email for manual login');
        
        // Send email notification for manual login with fresh job URL
        try {
          // Get fresh session data to ensure correct job URL
          const freshSession = await storage.getApplicationSession(sessionId);
          const currentJobUrl = freshSession?.jobUrl || request.jobUrl;
          
          await this.emailService.sendManualLoginEmail({
            userEmail: request.profile.email,
            userName: request.profile.name,
            jobTitle: jobDetails.title,
            company: jobDetails.company,
            jobUrl: currentJobUrl, // Use fresh URL from database
            sessionId: sessionId
          });
          
          console.log('📧 Manual login email sent successfully');
          
          // Start monitoring for login success
          this.monitorLoginStatus(sessionId);
          
          return {
            success: true,
            sessionId,
            message: '📧 Login email sent! Check your email for instructions on how to log into the job portal. The application will continue automatically after you log in.',
            requiresLogin: true,
            browserUrl: request.jobUrl
          };
        } catch (error) {
          console.error('Failed to send manual login email:', error);
          return {
            success: false,
            sessionId,
            message: 'Failed to send login notification email. Please try again.',
            requiresLogin: true
          };
        }
      } else {
        console.log('✅ No login required - proceeding with form filling');
        
        // Mark as logged in and proceed
        const session = this.activeSessions.get(sessionId)!;
        session.isLoggedIn = true;
        session.loginVerified = true;
        
        return await this.proceedWithApplication(sessionId);
      }

    } catch (error) {
      console.error('Error starting job application:', error);
      return {
        success: false,
        sessionId,
        message: `Failed to start application: ${(error as Error).message}`,
        requiresLogin: false
      };
    }
  }

  private async monitorLoginStatus(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    let checkCount = 0;
    const maxChecks = 60; // Maximum 3 minutes of monitoring (60 * 3 seconds)

    const checkLogin = async () => {
      try {
        // Stop if session no longer exists or is already processed
        const currentSession = this.activeSessions.get(sessionId);
        if (!currentSession || currentSession.loginVerified) {
          console.log('🛑 Stopping login monitoring - session processed');
          return;
        }

        checkCount++;
        if (checkCount > maxChecks) {
          console.log('⏰ Login monitoring timeout - stopping checks');
          return;
        }

        const loginSuccess = await this.verifyLoginSuccess(currentSession.page);
        
        if (loginSuccess) {
          console.log('✅ Login detected! Proceeding with application...');
          currentSession.isLoggedIn = true;
          currentSession.loginVerified = true;
          
          // Update session status
          await storage.updateApplicationSession(sessionId, {
            status: 'logged_in'
          });
          
          // Proceed with application
          await this.proceedWithApplication(sessionId);
          return;
        }
        
        // Continue monitoring if not logged in yet
        setTimeout(checkLogin, 5000); // Increased interval to 5 seconds
        
      } catch (error) {
        console.error('Error monitoring login status:', error);
        // Don't continue monitoring on errors
      }
    };

    // Start monitoring after 5 seconds
    setTimeout(checkLogin, 5000);
  }

  private async proceedWithApplication(sessionId: string): Promise<{
    success: boolean;
    sessionId: string;
    message: string;
    requiresLogin: boolean;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        sessionId,
        message: 'Session not found',
        requiresLogin: false
      };
    }

    try {
      console.log('🤖 Starting automated form filling...');
      
      // Navigate to application form if needed
      const applicationFormUrl = await this.findApplicationForm(session.page);
      if (applicationFormUrl && applicationFormUrl !== session.page.url()) {
        await session.page.goto(applicationFormUrl, { waitUntil: 'networkidle' });
      }

      // Generate AI cover letter if needed
      const sessionData = await storage.getApplicationSession(sessionId);
      const profile = sessionData?.profileData as ComprehensiveProfile;
      
      let aiCoverLetter = '';
      if (profile?.enableAICoverLetter) {
        try {
          const experienceText = Array.isArray(profile.experience) 
            ? profile.experience.map(exp => `${exp.title} at ${exp.company}`).join(', ')
            : 'Software engineering experience';
            
          aiCoverLetter = await this.geminiService.generateCoverLetter(
            session.jobDetails.title,
            session.jobDetails.company,
            session.jobDetails.description,
            profile.name,
            experienceText
          );
          console.log('🤖 AI cover letter generated');
        } catch (error) {
          console.log('Cover letter generation failed:', error);
        }
      }

      // Fill the form with user data
      await this.fillApplicationForm(session.page, profile, aiCoverLetter);

      // Take screenshot before submission (continue even if screenshot fails)
      let screenshotPath = '';
      try {
        screenshotPath = await this.screenshotService.captureScreenshot(
          session.page, 
          sessionId, 
          'pre-submission'
        );
      } catch (screenshotError) {
        console.log('Screenshot failed, continuing with workflow:', screenshotError);
      }

      // Update session with filled data
      await storage.updateApplicationSession(sessionId, {
        status: 'ready_for_submission',
        screenshotPath,
        autoGeneratedCoverLetter: aiCoverLetter,
      });

      // Send notification and start timer
      await this.sendSubmissionNotification(sessionId, profile);

      return {
        success: true,
        sessionId,
        message: 'Form filled successfully. Check your email/WhatsApp for submission approval.',
        requiresLogin: false
      };

    } catch (error) {
      console.error('Error proceeding with application:', error);
      return {
        success: false,
        sessionId,
        message: `Error filling form: ${(error as Error).message}`,
        requiresLogin: false
      };
    }
  }

  private async sendSubmissionNotification(sessionId: string, profile: ComprehensiveProfile): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const approvalUrl = `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/approve-submission/${sessionId}`;
    const rejectUrl = `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/reject-submission/${sessionId}`;

    // Send email notification - only after form is filled and ready for submission
    try {
      await this.emailService.sendJobApplicationReview(
        profile.email,
        session.jobDetails.title,
        session.jobDetails.company,
        approvalUrl,
        rejectUrl
      );
      console.log('📧 Review email sent');
    } catch (error) {
      console.log('Email send failed:', error);
    }

    // Send WhatsApp notification if enabled
    if (profile.enableWhatsappNotifications && profile.whatsappNumber) {
      try {
        await this.whatsappService.sendJobApplicationReview(
          profile.whatsappNumber,
          session.jobDetails.title,
          session.jobDetails.company,
          approvalUrl,
          rejectUrl
        );
        console.log('📱 WhatsApp notification sent');
      } catch (error) {
        console.log('WhatsApp send failed:', error);
      }
    }

    // Start 16-second timer for auto-submission
    setTimeout(async () => {
      const currentSession = await storage.getApplicationSession(sessionId);
      if (currentSession?.status === 'ready_for_submission') {
        console.log('⏰ 16 seconds elapsed - auto-submitting application');
        await this.submitApplication(sessionId);
      }
    }, 16000); // 16 seconds as requested
  }

  async approveSubmission(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      await storage.updateApplicationSession(sessionId, {
        status: 'approved'
      });
      
      return await this.submitApplication(sessionId);
    } catch (error) {
      return {
        success: false,
        message: `Failed to approve: ${(error as Error).message}`
      };
    }
  }

  async rejectSubmission(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      await storage.updateApplicationSession(sessionId, {
        status: 'rejected'
      });

      // Clean up browser session
      const session = this.activeSessions.get(sessionId);
      if (session) {
        await session.browserContext.close();
        this.activeSessions.delete(sessionId);
      }

      return {
        success: true,
        message: 'Application submission cancelled'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reject: ${(error as Error).message}`
      };
    }
  }

  private async submitApplication(sessionId: string): Promise<{ success: boolean; message: string }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        message: 'Session not found'
      };
    }

    try {
      console.log('🚀 Submitting application...');

      // Find and click submit button
      const submitSuccess = await this.findAndClickSubmitButton(session.page);

      // Take confirmation screenshot (continue even if screenshot fails)
      let confirmationScreenshot = '';
      try {
        confirmationScreenshot = await this.screenshotService.captureScreenshot(
          session.page,
          sessionId,
          'confirmation'
        );
      } catch (screenshotError) {
        console.log('Confirmation screenshot failed, continuing:', screenshotError);
      }

      // Verify submission
      const submissionVerified = await this.verifySubmissionSuccess(session.page);

      // Update session
      await storage.updateApplicationSession(sessionId, {
        status: submissionVerified ? 'submitted' : 'failed',
        submittedAt: new Date(),
        screenshotPath: confirmationScreenshot,
        submissionResult: submissionVerified ? 'success' : 'failed'
      });

      // Clean up browser session
      await session.browserContext.close();
      this.activeSessions.delete(sessionId);

      if (submissionVerified) {
        console.log('✅ Application submitted successfully!');
        
        // Send success confirmation email
        try {
          const sessionData = await storage.getApplicationSession(sessionId);
          if (sessionData?.profileData) {
            await this.emailService.sendApplicationConfirmation({
              userEmail: (sessionData.profileData as any).email,
              userName: (sessionData.profileData as any).name,
              jobTitle: session.jobDetails.title,
              company: session.jobDetails.company,
              jobUrl: sessionData.jobUrl,
              status: 'submitted',
              sessionId
            });
          }
        } catch (emailError) {
          console.log('Confirmation email failed:', emailError);
        }
        
        return {
          success: true,
          message: 'Application submitted successfully!'
        };
      } else {
        console.log('❌ Application submission may have failed');
        
        // Send failure notification email
        try {
          const sessionData = await storage.getApplicationSession(sessionId);
          if (sessionData?.profileData) {
            await this.emailService.sendApplicationConfirmation({
              userEmail: (sessionData.profileData as any).email,
              userName: (sessionData.profileData as any).name,
              jobTitle: session.jobDetails.title,
              company: session.jobDetails.company,
              jobUrl: sessionData.jobUrl,
              status: 'failed',
              sessionId
            });
          }
        } catch (emailError) {
          console.log('Failure notification email failed:', emailError);
        }
        
        return {
          success: false,
          message: 'Application submission could not be verified'
        };
      }

    } catch (error) {
      console.error('Error submitting application:', error);
      return {
        success: false,
        message: `Submission failed: ${(error as Error).message}`
      };
    }
  }

  // Helper methods (similar to existing services but optimized for manual login flow)
  
  private detectPlatform(jobUrl: string): string {
    const url = jobUrl.toLowerCase();
    if (url.includes('greenhouse')) return 'Greenhouse';
    if (url.includes('lever')) return 'Lever';
    if (url.includes('workday')) return 'Workday';
    if (url.includes('bamboohr')) return 'BambooHR';
    if (url.includes('smartrecruiters')) return 'SmartRecruiters';
    if (url.includes('jobvite')) return 'Jobvite';
    if (url.includes('google.com/jobs')) return 'Google Jobs';
    if (url.includes('amazon.jobs')) return 'Amazon Jobs';
    if (url.includes('microsoft.com/careers')) return 'Microsoft Careers';
    if (url.includes('meta.com/careers')) return 'Meta Careers';
    return 'Unknown';
  }

  private async detectLoginRequirement(page: Page): Promise<boolean> {
    try {
      const loginIndicators = [
        'input[type="email"]',
        'input[type="password"]',
        'button:has-text("Sign in")',
        'button:has-text("Log in")',
        'button:has-text("Login")',
        'a:has-text("Sign in")',
        'a:has-text("Log in")',
        '.login-form',
        '.signin-form',
        '#login',
        '#signin'
      ];

      for (const selector of loginIndicators) {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            console.log(`Login detected: ${selector}`);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.log('Error detecting login requirement:', error);
      return false;
    }
  }

  private async verifyLoginSuccess(page: Page): Promise<boolean> {
    try {
      // Check for common indicators that user is logged in
      const loggedInIndicators = [
        '[data-testid="user-menu"]',
        '.user-avatar',
        '.profile-dropdown',
        'button:has-text("Profile")',
        'button:has-text("Account")',
        'a:has-text("Logout")',
        'a:has-text("Sign out")',
        '.dashboard',
        '.user-name',
        // Google-specific indicators
        '.gb_pc', // Google profile circle
        '.gb_Aa', // Google account menu
        '[aria-label*="Account"]',
        '[data-ved]' // Google search results page (logged in)
      ];

      for (const selector of loggedInIndicators) {
        try {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              console.log(`✅ Login verified with indicator: ${selector}`);
              return true;
            }
          }
        } catch (e) {
          // Continue checking other indicators
        }
      }

      // Check URL changes that indicate successful login
      const currentUrl = page.url();
      if (
        currentUrl.includes('/jobs/') || 
        currentUrl.includes('/careers/') || 
        currentUrl.includes('/apply/') ||
        currentUrl.includes('/application/') ||
        (currentUrl.includes('google.com') && !currentUrl.includes('accounts.google.com'))
      ) {
        console.log('✅ Login verified by URL change');
        return true;
      }

      // Check if login forms are no longer visible (opposite of login detection)
      const loginFormsVisible = await this.checkLoginFormsVisible(page);
      return !loginFormsVisible;

    } catch (error) {
      console.log('Error verifying login success:', error);
      return false;
    }
  }

  private async checkLoginFormsVisible(page: Page): Promise<boolean> {
    try {
      const loginSelectors = [
        'input[type="email"]',
        'input[type="password"]',
        'button:has-text("Sign in")',
        'button:has-text("Log in")',
        '.login-form'
      ];

      for (const selector of loginSelectors) {
        try {
          const element = await page.$(selector);
          if (element && await element.isVisible()) {
            return true;
          }
        } catch (e) {
          // Continue checking
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async extractJobDetails(page: Page): Promise<{ title: string; company: string; description: string }> {
    try {
      // Extract job title
      const titleSelectors = [
        'h1',
        '[data-testid="job-title"]',
        '.job-title',
        '.position-title',
        '.role-title'
      ];

      let title = 'Unknown Position';
      for (const selector of titleSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await element.textContent();
            if (text && text.trim().length > 0) {
              title = text.trim();
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Extract company name
      const companySelectors = [
        '[data-testid="company-name"]',
        '.company-name',
        '.employer-name',
        'h2',
        '.company'
      ];

      let company = 'Unknown Company';
      for (const selector of companySelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await element.textContent();
            if (text && text.trim().length > 0 && !text.includes(title)) {
              company = text.trim();
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Extract job description
      const descriptionSelectors = [
        '[data-testid="job-description"]',
        '.job-description',
        '.job-details',
        '.description',
        '.content'
      ];

      let description = 'No description available';
      for (const selector of descriptionSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await element.textContent();
            if (text && text.trim().length > 50) {
              description = text.trim().substring(0, 1000); // Limit description length
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      return { title, company, description };
    } catch (error) {
      console.log('Error extracting job details:', error);
      return { 
        title: 'Unknown Position', 
        company: 'Unknown Company', 
        description: 'No description available' 
      };
    }
  }

  private async findApplicationForm(page: Page): Promise<string | null> {
    try {
      const applyButtons = [
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        'button:has-text("Apply Now")',
        'a:has-text("Apply Now")',
        '[data-testid="apply-button"]',
        '.apply-button',
        '.apply-now'
      ];

      for (const selector of applyButtons) {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            await element.click();
            await page.waitForTimeout(2000);
            return page.url();
          }
        }
      }

      return null;
    } catch (error) {
      console.log('Error finding application form:', error);
      return null;
    }
  }

  private async fillApplicationForm(page: Page, profile: ComprehensiveProfile, coverLetter?: string): Promise<void> {
    try {
      console.log('📝 Filling application form...');

      // Fill basic information
      await this.fillFieldSafely(page, 'input[name*="name"], input[id*="name"], input[placeholder*="name"]', profile.name);
      await this.fillFieldSafely(page, 'input[type="email"], input[name*="email"], input[id*="email"]', profile.email);
      await this.fillFieldSafely(page, 'input[type="tel"], input[name*="phone"], input[id*="phone"]', profile.phone);

      // Fill address information
      if (profile.address) {
        await this.fillFieldSafely(page, 'input[name*="address"], input[id*="address"]', profile.address);
      }
      if (profile.city) {
        await this.fillFieldSafely(page, 'input[name*="city"], input[id*="city"]', profile.city);
      }
      if (profile.state) {
        await this.fillFieldSafely(page, 'input[name*="state"], select[name*="state"]', profile.state);
      }
      if (profile.zipCode) {
        await this.fillFieldSafely(page, 'input[name*="zip"], input[name*="postal"]', profile.zipCode);
      }

      // Fill cover letter
      if (coverLetter) {
        await this.fillFieldSafely(page, 'textarea[name*="cover"], textarea[id*="cover"]', coverLetter);
      }

      console.log('✅ Form filled successfully');
    } catch (error) {
      console.log('Error filling form:', error);
      throw error;
    }
  }

  private async fillFieldSafely(page: Page, selector: string, value: string): Promise<void> {
    try {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          await element.fill(value);
          console.log(`Filled field: ${selector}`);
        }
      }
    } catch (error) {
      console.log(`Could not fill field ${selector}:`, error);
    }
  }

  private async findAndClickSubmitButton(page: Page): Promise<boolean> {
    try {
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Submit")',
        'button:has-text("Submit Application")',
        'button:has-text("Apply")',
        'button:has-text("Send Application")',
        '[data-testid="submit-button"]',
        '.submit-button'
      ];

      for (const selector of submitSelectors) {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            await element.click();
            await page.waitForTimeout(3000);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.log('Error clicking submit button:', error);
      return false;
    }
  }

  private async verifySubmissionSuccess(page: Page): Promise<boolean> {
    try {
      await page.waitForTimeout(3000);

      const successIndicators = [
        'text="Thank you"',
        'text="Application submitted"',
        'text="Successfully submitted"',
        'text="Application received"',
        '.success-message',
        '.confirmation',
        '[data-testid="success"]'
      ];

      for (const indicator of successIndicators) {
        const element = await page.$(indicator);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            return true;
          }
        }
      }

      // Check URL for success indicators
      const url = page.url().toLowerCase();
      if (url.includes('success') || url.includes('thank') || url.includes('confirm')) {
        return true;
      }

      return false;
    } catch (error) {
      console.log('Error verifying submission:', error);
      return false;
    }
  }
}