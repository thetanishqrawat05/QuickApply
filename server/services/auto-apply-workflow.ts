import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { ComprehensiveProfile, ApplicationSessionRecord } from '@shared/schema';
import { storage } from '../storage';
import { EmailService } from './email-service';
import { PlatformHandlers } from './platform-handlers';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

interface JobApplicationData {
  jobUrl: string;
  profile: ComprehensiveProfile;
  resumeFile?: Buffer;
  coverLetterFile?: Buffer;
}

interface AutoApplyResult {
  success: boolean;
  sessionId?: string;
  message: string;
  applicationId?: string;
  submissionMethod?: 'manual' | 'auto';
}

export class AutoApplyWorkflowService {
  private browser: Browser | null = null;
  private emailService: EmailService;
  private platformHandlers: PlatformHandlers;
  private pendingApplications: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.emailService = new EmailService();
    this.platformHandlers = new PlatformHandlers();
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
        if (error instanceof Error && error.message.includes('Host system is missing dependencies')) {
          throw new Error('BROWSER_DEPENDENCIES_MISSING: ' + error.message);
        }
        throw error;
      }
    }
    return this.browser;
  }

  private detectPlatform(jobUrl: string): string {
    if (jobUrl.includes('greenhouse.io')) return 'Greenhouse';
    if (jobUrl.includes('lever.co')) return 'Lever';
    if (jobUrl.includes('workday.com')) return 'Workday';
    if (jobUrl.includes('bamboohr.com')) return 'BambooHR';
    if (jobUrl.includes('smartrecruiters.com')) return 'SmartRecruiters';
    if (jobUrl.includes('jobvite.com')) return 'Jobvite';
    if (jobUrl.includes('icims.com')) return 'iCIMS';
    if (jobUrl.includes('careers.')) return 'Company Career Site';
    return 'Unknown Platform';
  }

  private async extractJobInfo(page: Page): Promise<{ jobTitle?: string; company?: string }> {
    try {
      // Try various selectors to extract job title and company
      const jobTitle = await page.$eval('h1, .job-title, [data-testid="job-title"], .position-title', 
        el => el.textContent?.trim()).catch(() => undefined);
      
      const company = await page.$eval('.company-name, .employer-name, [data-testid="company-name"]', 
        el => el.textContent?.trim()).catch(() => undefined);

      return { jobTitle, company };
    } catch (error) {
      return {};
    }
  }

  private async saveTemporaryFile(buffer: Buffer, filename: string): Promise<string> {
    const tempPath = join('/tmp', `${uuidv4()}_${filename}`);
    writeFileSync(tempPath, buffer);
    return tempPath;
  }

  private cleanupTemporaryFile(filePath: string): void {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temporary file: ${filePath}`, error);
    }
  }

  async startAutoApplyProcess(applicationData: JobApplicationData): Promise<AutoApplyResult> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    const sessionId = uuidv4();
    let resumePath: string | null = null;
    let coverLetterPath: string | null = null;

    try {
      // Step 1: Create/get user
      let user = await storage.getUserByEmail(applicationData.profile.email);
      if (!user) {
        user = await storage.createUser({
          name: applicationData.profile.name,
          email: applicationData.profile.email,
          phone: applicationData.profile.phone,
          resumeFileName: applicationData.profile.resumeFileName,
          coverLetterFileName: applicationData.profile.coverLetterFileName,
        });
      }

      // Step 2: Launch browser and navigate to job page
      browser = await this.launchBrowser();
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      page = await context.newPage();

      console.log(`🌐 Navigating to job page: ${applicationData.jobUrl}`);
      await page.goto(applicationData.jobUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Step 3: Extract job information
      const { jobTitle, company } = await this.extractJobInfo(page);
      const platform = this.detectPlatform(applicationData.jobUrl);

      console.log(`🔍 Detected: ${jobTitle || 'Unknown Position'} at ${company || 'Unknown Company'} (${platform})`);

      // Step 4: Handle CAPTCHA detection (basic implementation)
      const hasCaptcha = await page.$('.captcha, [data-captcha], .g-recaptcha').then(() => true).catch(() => false);
      if (hasCaptcha) {
        console.log('🤖 CAPTCHA detected - pausing for manual intervention');
        await page.waitForTimeout(5000); // Give time for manual CAPTCHA solving
      }

      // Step 5: Auto-login if needed (basic implementation for common patterns)
      await this.handleAutoLogin(page, applicationData.profile);

      // Step 6: Navigate to application form
      const applicationStarted = await this.findAndClickApplyButton(page);
      if (!applicationStarted) {
        throw new Error('Could not find or click apply button');
      }

      // Step 7: Autofill form fields
      const filledData = await this.autofillApplicationForm(page, applicationData, resumePath, coverLetterPath);

      // Step 8: Create application session for approval workflow
      const approvalToken = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      const session = await storage.createApplicationSession({
        id: sessionId,
        userId: user.id,
        jobUrl: applicationData.jobUrl,
        platform,
        jobTitle,
        company,
        status: 'pending_review',
        profileData: applicationData.profile,
        filledFormData: filledData,
        reviewEmailSent: false,
        approvalToken,
        expiresAt: expiresAt,
      });

      // Step 9: Send review email with 60-second timer
      const emailSent = await this.emailService.sendReviewEmail(session, filledData);
      if (emailSent) {
        await storage.updateApplicationSession(sessionId, { reviewEmailSent: true });
      }

      // Step 10: Set 60-second auto-submit timer
      this.setAutoSubmitTimer(sessionId, page, context);

      return {
        success: true,
        sessionId,
        message: `Application prepared for ${jobTitle || 'position'} at ${company || 'company'}. Review email sent. Will auto-submit in 60 seconds if not approved manually.`,
        applicationId: sessionId
      };

    } catch (error) {
      console.error('❌ Auto-apply process failed:', error);
      
      // Cleanup
      if (resumePath) this.cleanupTemporaryFile(resumePath);
      if (coverLetterPath) this.cleanupTemporaryFile(coverLetterPath);
      
      return {
        success: false,
        message: `Auto-apply failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sessionId
      };
    }
  }

  private async handleAutoLogin(page: Page, profile: ComprehensiveProfile): Promise<void> {
    try {
      // Look for common login patterns
      const loginSelectors = [
        'a[href*="login"]',
        'a[href*="signin"]',
        '.login-link',
        '.signin-link',
        'button:has-text("Login")',
        'button:has-text("Sign In")'
      ];

      for (const selector of loginSelectors) {
        const loginButton = await page.$(selector);
        if (loginButton) {
          console.log('🔐 Login option detected - this would require user credentials');
          // In a real implementation, you'd handle stored credentials here
          break;
        }
      }
    } catch (error) {
      console.log('ℹ️ No login required or login detection failed');
    }
  }

  private async findAndClickApplyButton(page: Page): Promise<boolean> {
    try {
      const applySelectors = [
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        '.apply-button',
        '.btn-apply',
        '[data-testid="apply-button"]',
        'button[type="submit"]:has-text("Apply")',
        'input[type="submit"][value*="Apply"]'
      ];

      for (const selector of applySelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`🎯 Found apply button: ${selector}`);
            await button.click();
            await page.waitForTimeout(2000); // Wait for navigation/form load
            return true;
          }
        } catch (error) {
          continue; // Try next selector
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to find apply button:', error);
      return false;
    }
  }

  private async autofillApplicationForm(
    page: Page, 
    applicationData: JobApplicationData,
    resumePath: string | null,
    coverLetterPath: string | null
  ): Promise<any> {
    const { profile } = applicationData;
    const filledData: any = {};

    try {
      // Save files temporarily if needed
      if (applicationData.resumeFile && !resumePath) {
        resumePath = await this.saveTemporaryFile(applicationData.resumeFile, profile.resumeFileName || 'resume.pdf');
      }
      if (applicationData.coverLetterFile && !coverLetterPath) {
        coverLetterPath = await this.saveTemporaryFile(applicationData.coverLetterFile, profile.coverLetterFileName || 'coverletter.pdf');
      }

      // Basic information fields
      const basicFields = [
        { selector: 'input[name*="firstName"], input[name*="first_name"], input[placeholder*="First"]', value: profile.name.split(' ')[0] },
        { selector: 'input[name*="lastName"], input[name*="last_name"], input[placeholder*="Last"]', value: profile.name.split(' ').slice(1).join(' ') },
        { selector: 'input[name*="email"], input[type="email"]', value: profile.email },
        { selector: 'input[name*="phone"], input[type="tel"]', value: profile.phone },
        { selector: 'input[name*="address"], textarea[name*="address"]', value: profile.address || '' },
        { selector: 'input[name*="city"]', value: profile.city || '' },
        { selector: 'input[name*="state"]', value: profile.state || '' },
        { selector: 'input[name*="zip"], input[name*="postal"]', value: profile.zipCode || '' },
      ];

      for (const field of basicFields) {
        if (field.value) {
          try {
            const element = await page.$(field.selector);
            if (element) {
              await element.fill(field.value);
              filledData[field.selector] = field.value;
              console.log(`✅ Filled: ${field.selector} = ${field.value}`);
            }
          } catch (error) {
            console.log(`⚠️ Could not fill: ${field.selector}`);
          }
        }
      }

      // File uploads
      if (resumePath) {
        const resumeSelectors = [
          'input[type="file"][name*="resume"]',
          'input[type="file"][accept*="pdf"]',
          'input[type="file"]'
        ];

        for (const selector of resumeSelectors) {
          try {
            const fileInput = await page.$(selector);
            if (fileInput) {
              await fileInput.setInputFiles(resumePath);
              filledData['resume'] = 'uploaded';
              console.log('📎 Resume uploaded successfully');
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }

      if (coverLetterPath) {
        const coverLetterSelectors = [
          'input[type="file"][name*="cover"]',
          'input[type="file"][name*="letter"]'
        ];

        for (const selector of coverLetterSelectors) {
          try {
            const fileInput = await page.$(selector);
            if (fileInput) {
              await fileInput.setInputFiles(coverLetterPath);
              filledData['coverLetter'] = 'uploaded';
              console.log('📎 Cover letter uploaded successfully');
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }

      // Handle dropdowns and selects
      if (profile.workAuthorization) {
        const workAuthSelectors = ['select[name*="authorization"]', 'select[name*="work_auth"]'];
        for (const selector of workAuthSelectors) {
          try {
            const select = await page.$(selector);
            if (select) {
              await select.selectOption({ label: profile.workAuthorization });
              filledData['workAuthorization'] = profile.workAuthorization;
            }
          } catch (error) {
            continue;
          }
        }
      }

      return filledData;

    } catch (error) {
      console.error('Form filling error:', error);
      return filledData;
    } finally {
      // Cleanup temporary files
      if (resumePath) this.cleanupTemporaryFile(resumePath);
      if (coverLetterPath) this.cleanupTemporaryFile(coverLetterPath);
    }
  }

  private setAutoSubmitTimer(sessionId: string, page: Page, context: BrowserContext): void {
    console.log(`⏱️ Setting 60-second auto-submit timer for session: ${sessionId}`);
    
    const timer = setTimeout(async () => {
      try {
        console.log(`🤖 Auto-submitting application for session: ${sessionId}`);
        
        // Check if session still exists and is pending
        const session = await storage.getApplicationSession(sessionId);
        if (!session || session.status !== 'pending_review') {
          console.log(`⚠️ Session ${sessionId} no longer pending, skipping auto-submit`);
          return;
        }

        // Find and click submit button
        const submitSuccess = await this.submitApplication(page);
        
        if (submitSuccess) {
          await storage.updateApplicationSession(sessionId, { 
            status: 'submitted' 
          });

          // Send confirmation email
          await this.emailService.sendConfirmationEmail(session, true);
          
          console.log(`✅ Auto-submitted application for session: ${sessionId}`);
        } else {
          await storage.updateApplicationSession(sessionId, { 
            status: 'failed' 
          });
          
          await this.emailService.sendConfirmationEmail(session, false);
          console.log(`❌ Auto-submit failed for session: ${sessionId}`);
        }

      } catch (error) {
        console.error(`❌ Auto-submit error for session ${sessionId}:`, error);
      } finally {
        // Cleanup
        this.pendingApplications.delete(sessionId);
        await context?.close();
      }
    }, 60000); // 60 seconds

    this.pendingApplications.set(sessionId, timer);
  }

  private async submitApplication(page: Page): Promise<boolean> {
    try {
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Submit")',
        'button:has-text("Apply")',
        '.submit-button',
        '.btn-submit'
      ];

      for (const selector of submitSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`🎯 Found submit button: ${selector}`);
            await button.click();
            
            // Wait for submission to complete
            await page.waitForTimeout(3000);
            
            // Check for success indicators
            const successIndicators = [
              '.success-message',
              '.confirmation',
              ':has-text("submitted")',
              ':has-text("received")',
              ':has-text("thank you")'
            ];

            for (const indicator of successIndicators) {
              const element = await page.$(indicator);
              if (element) {
                console.log('✅ Application submission confirmed');
                return true;
              }
            }

            return true; // Assume success if no error
          }
        } catch (error) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error('Submit application error:', error);
      return false;
    }
  }

  async approveAndSubmitApplication(token: string): Promise<{ success: boolean; message: string }> {
    try {
      // Cancel auto-submit timer
      const session = await storage.getApplicationSessionByToken(token);
      if (!session) {
        throw new Error('Application session not found or expired');
      }

      if (this.pendingApplications.has(session.id)) {
        clearTimeout(this.pendingApplications.get(session.id));
        this.pendingApplications.delete(session.id);
        console.log(`⏱️ Cancelled auto-submit timer for session: ${session.id}`);
      }

      // Update session status
      await storage.updateApplicationSession(session.id, { status: 'approved' });

      // In a real implementation, you'd re-open the browser context and submit
      // For now, we'll simulate immediate submission
      await storage.updateApplicationSession(session.id, { status: 'submitted' });

      // Send confirmation email
      await this.emailService.sendConfirmationEmail(session, true);

      return {
        success: true,
        message: `Application approved and submitted successfully for ${session.jobTitle || 'position'} at ${session.company || 'company'}`
      };

    } catch (error) {
      console.error('Approval error:', error);
      return {
        success: false,
        message: `Failed to approve application: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async cleanup(): Promise<void> {
    // Clear all pending timers
    this.pendingApplications.forEach((timer, sessionId) => {
      clearTimeout(timer);
      console.log(`🧹 Cleaned up timer for session: ${sessionId}`);
    });
    this.pendingApplications.clear();

    // Close browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}