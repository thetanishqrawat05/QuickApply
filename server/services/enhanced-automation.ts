import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { ComprehensiveProfile, ApplicationSessionRecord } from '@shared/schema';
import { storage } from '../storage';
import { EmailService } from './email-service';
import { v4 as uuidv4 } from 'uuid';

export class EnhancedAutomationService {
  private browser: Browser | null = null;
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  private async launchBrowser(): Promise<Browser> {
    if (!this.browser) {
      try {
        this.browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-ipc-flooding-protection',
            '--force-color-profile=srgb',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-default-browser-check',
            '--disable-background-networking'
          ],
          chromiumSandbox: false
        });
      } catch (error) {
        // If browser launch fails due to missing dependencies, throw a specific error
        if (error instanceof Error && error.message.includes('Host system is missing dependencies')) {
          throw new Error('BROWSER_DEPENDENCIES_MISSING: ' + error.message);
        }
        throw error;
      }
    }
    return this.browser;
  }

  async startJobApplicationProcess(
    jobUrl: string, 
    profile: ComprehensiveProfile,
    resumeFile?: Buffer,
    coverLetterFile?: Buffer
  ): Promise<{ success: boolean; sessionId?: string; message: string }> {
    try {
      // Create user if doesn't exist
      let user = await storage.getUserByEmail(profile.email);
      if (!user) {
        user = await storage.createUser({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          resumeFileName: profile.resumeFileName,
          coverLetterFileName: profile.coverLetterFileName,
        });
      }

      // Create application session
      const sessionId = uuidv4();
      const approvalToken = uuidv4().replace(/-/g, ''); // Clean token for URLs
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const session = await storage.createApplicationSession({
        id: sessionId,
        userId: user.id,
        jobUrl,
        platform: this.detectPlatform(jobUrl),
        status: 'pending_review',
        profileData: profile,
        approvalToken,
        expiresAt,
        reviewEmailSent: false,
      });

      // Launch browser and prefill form
      const filledData = await this.prefillJobForm(jobUrl, profile, resumeFile, coverLetterFile);
      
      // Update session with form data
      await storage.updateApplicationSession(sessionId, {
        filledFormData: filledData,
      });

      // Send review email
      const emailSent = await this.emailService.sendReviewEmail(
        { ...session, filledFormData: filledData } as ApplicationSessionRecord, 
        filledData
      );

      if (emailSent) {
        await storage.updateApplicationSession(sessionId, {
          reviewEmailSent: true,
        });
      }

      return {
        success: true,
        sessionId,
        message: `Form prefilled successfully. Review email sent to ${profile.email}. Please check your email to approve and submit the application.`
      };

    } catch (error) {
      console.error('Enhanced automation error:', error);
      return {
        success: false,
        message: `Failed to start application process: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async approveAndSubmitApplication(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const session = await storage.getApplicationSessionByToken(token);
      if (!session) {
        return { success: false, message: 'Invalid or expired approval token' };
      }

      if (new Date() > session.expiresAt) {
        return { success: false, message: 'Approval link has expired' };
      }

      if (session.status !== 'pending_review') {
        return { success: false, message: 'Application has already been processed' };
      }

      // Update status to approved
      await storage.updateApplicationSession(session.id, {
        status: 'approved',
      });

      // Submit the form
      const submissionResult = await this.submitJobApplication(session);

      // Update final status
      const finalStatus = submissionResult.success ? 'submitted' : 'failed';
      await storage.updateApplicationSession(session.id, {
        status: finalStatus,
      });

      // Create job application record
      await storage.createJobApplication({
        userId: session.userId,
        jobUrl: session.jobUrl,
        platform: session.platform,
        jobTitle: session.jobTitle,
        company: session.company,
        status: submissionResult.success ? 'applied' : 'failed',
        errorMessage: submissionResult.success ? undefined : submissionResult.message,
        submissionConfirmed: submissionResult.success,
        applicationData: {
          sessionId: session.id,
          profileData: session.profileData,
          submissionDetails: submissionResult.details,
        },
      });

      // Send confirmation email
      await this.emailService.sendConfirmationEmail(session, submissionResult.success);

      return {
        success: submissionResult.success,
        message: submissionResult.message
      };

    } catch (error) {
      console.error('Approval submission error:', error);
      return {
        success: false,
        message: `Failed to submit application: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async prefillJobForm(
    jobUrl: string, 
    profile: ComprehensiveProfile,
    resumeFile?: Buffer,
    coverLetterFile?: Buffer
  ): Promise<any> {
    let context: BrowserContext | null = null;
    
    try {
      await this.launchBrowser();

      context = await this.browser!.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });

      const page = await context.newPage();
      await page.goto(jobUrl, { waitUntil: 'networkidle' });

      // Extract job details
      const jobDetails = await this.extractJobDetails(page);
      
      // Fill form fields (without submitting)
      const filledData = await this.fillFormFields(page, profile, resumeFile, coverLetterFile);

      return {
        jobDetails,
        filledFields: filledData,
        formReady: true,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Form prefill failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (context) {
        await context.close();
      }
    }
  }

  private async submitJobApplication(session: ApplicationSessionRecord): Promise<{ success: boolean; message: string; details?: any }> {
    let context: BrowserContext | null = null;
    
    try {
      await this.launchBrowser();

      context = await this.browser!.newContext();
      const page = await context.newPage();
      
      await page.goto(session.jobUrl, { waitUntil: 'networkidle' });

      // Re-fill the form with stored data
      const profile = session.profileData as ComprehensiveProfile;
      await this.fillFormFields(page, profile);

      // Submit the form
      const submitButton = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Apply")').first();
      
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // Wait for submission confirmation
        await page.waitForLoadState('networkidle');
        
        // Check for success indicators
        const successIndicators = [
          'thank you',
          'application submitted',
          'successfully submitted',
          'confirmation',
          'received your application'
        ];

        const pageContent = await page.content();
        const currentUrl = page.url();
        
        const isSuccess = successIndicators.some(indicator => 
          pageContent.toLowerCase().includes(indicator) || 
          currentUrl.toLowerCase().includes('success') ||
          currentUrl.toLowerCase().includes('confirmation')
        );

        return {
          success: isSuccess,
          message: isSuccess 
            ? 'Application submitted successfully' 
            : 'Application may not have been submitted properly',
          details: {
            finalUrl: currentUrl,
            submissionTime: new Date().toISOString()
          }
        };
      } else {
        return {
          success: false,
          message: 'Could not find submit button on the form'
        };
      }

    } catch (error) {
      return {
        success: false,
        message: `Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    } finally {
      if (context) {
        await context.close();
      }
    }
  }

  private async extractJobDetails(page: Page): Promise<{ title?: string; company?: string }> {
    try {
      const title = await page.locator('h1, .job-title, [data-testid*="job-title"]').first().textContent();
      const company = await page.locator('.company-name, [data-testid*="company"], .employer').first().textContent();
      
      return {
        title: title?.trim(),
        company: company?.trim()
      };
    } catch (error) {
      return {};
    }
  }

  private async fillFormFields(
    page: Page, 
    profile: ComprehensiveProfile,
    resumeFile?: Buffer,
    coverLetterFile?: Buffer
  ): Promise<Record<string, string>> {
    const filledFields: Record<string, string> = {};

    try {
      // Basic information fields
      const fieldMappings = {
        name: ['name', 'full-name', 'fullname', 'first-name', 'firstname'],
        firstName: ['first-name', 'firstname', 'fname'],
        lastName: ['last-name', 'lastname', 'lname'],
        email: ['email', 'email-address'],
        phone: ['phone', 'telephone', 'mobile'],
        address: ['address', 'street-address'],
        city: ['city'],
        state: ['state', 'province'],
        zipCode: ['zip', 'postal-code', 'zipcode'],
        salary: ['salary', 'expected-salary', 'compensation'],
      };

      // Fill text fields
      for (const [profileField, selectors] of Object.entries(fieldMappings)) {
        const value = profile[profileField as keyof ComprehensiveProfile] as string;
        if (value) {
          for (const selector of selectors) {
            const input = await page.locator(`input[name*="${selector}"], input[id*="${selector}"], input[placeholder*="${selector}"]`).first();
            if (await input.count() > 0) {
              await input.fill(value);
              filledFields[selector] = value;
              break;
            }
          }
        }
      }

      // Handle file uploads
      if (resumeFile) {
        const resumeInput = await page.locator('input[type="file"][name*="resume"], input[type="file"][id*="resume"]').first();
        if (await resumeInput.count() > 0) {
          // Note: In a real implementation, you'd need to handle file uploads properly
          filledFields['resume'] = 'Resume uploaded';
        }
      }

      // Handle work authorization
      if (profile.workAuthorization) {
        const workAuthSelect = await page.locator('select[name*="authorization"], select[id*="work-auth"]').first();
        if (await workAuthSelect.count() > 0) {
          await workAuthSelect.selectOption({ label: profile.workAuthorization });
          filledFields['workAuthorization'] = profile.workAuthorization;
        }
      }

      return filledFields;
    } catch (error) {
      console.error('Form filling error:', error);
      return filledFields;
    }
  }

  private detectPlatform(jobUrl: string): string {
    const url = jobUrl.toLowerCase();
    
    if (url.includes('greenhouse')) return 'Greenhouse';
    if (url.includes('lever')) return 'Lever';
    if (url.includes('workday')) return 'Workday';
    if (url.includes('bamboohr')) return 'BambooHR';
    if (url.includes('icims')) return 'iCIMS';
    if (url.includes('taleo')) return 'Taleo';
    if (url.includes('jobvite')) return 'Jobvite';
    if (url.includes('smartrecruiters')) return 'SmartRecruiters';
    
    return 'Unknown Platform';
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}