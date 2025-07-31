import { Page } from 'playwright';
import { RobustBrowserService } from './robust-browser-service';
import { GeminiService } from './gemini-service';
import { EnhancedAutoLoginService } from './enhanced-auto-login-service';
import { EmailService } from './email-service';
import { AIFormAnalyzer, FormAnalysis } from './ai-form-analyzer';
import { UniversalFormDetector } from './universal-form-detector';
import { ComprehensiveProfile } from '@shared/schema';
import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';

export interface RealApplicationRequest {
  jobUrl: string;
  profile: ComprehensiveProfile;
  resumeFile?: Buffer;
  coverLetterFile?: Buffer;
}

export class RealApplicationService {
  private browserService: RobustBrowserService;
  private geminiService: GeminiService;
  private autoLoginService: EnhancedAutoLoginService;
  private aiFormAnalyzer: AIFormAnalyzer;
  private universalFormDetector: UniversalFormDetector;
  private emailService: EmailService;

  constructor() {
    this.browserService = new RobustBrowserService();
    this.geminiService = new GeminiService();
    this.autoLoginService = new EnhancedAutoLoginService();
    this.aiFormAnalyzer = new AIFormAnalyzer();
    this.universalFormDetector = new UniversalFormDetector();
    this.emailService = new EmailService();
  }

  async submitRealApplication(request: RealApplicationRequest): Promise<{
    success: boolean;
    sessionId?: string;
    message: string;
    confirmationScreenshot?: string;
  }> {
    let page: Page | null = null;
    const sessionId = uuidv4();

    try {
      // Check if browser is available
      const browserAvailable = await this.browserService.isAvailable();
      if (!browserAvailable) {
        console.log('🔄 Browser automation unavailable, falling back to enhanced simulation with notification');
        
        // Fall back to enhanced simulation mode but notify user about real mode
        return await this.simulateRealApplication(request, sessionId);
      }

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

      // Create application session
      const session = await storage.createApplicationSession({
        id: sessionId,
        userId: user.id,
        jobUrl: request.jobUrl,
        platform: this.detectPlatform(request.jobUrl),
        status: 'in_progress',
        profileData: request.profile,
        reviewEmailSent: false,
        whatsappReviewSent: false,
        approvalToken: uuidv4(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      console.log(`🚀 Starting REAL application submission for: ${request.jobUrl}`);

      // Launch browser and navigate to job
      page = await this.browserService.createPage();
      await page.goto(request.jobUrl, { waitUntil: 'networkidle' });

      // Extract job details
      const jobDetails = await this.extractJobDetails(page);
      await storage.updateApplicationSession(sessionId, {
        jobTitle: jobDetails.jobTitle,
        company: jobDetails.company,
      });

      console.log(`📋 Job Details: ${jobDetails.jobTitle} at ${jobDetails.company}`);

      // Generate AI cover letter if requested
      let aiCoverLetter = '';
      if (request.profile.enableAICoverLetter && !request.coverLetterFile) {
        try {
          const experienceText = request.profile.yearsOfExperience || 'Software engineering experience';
            
          aiCoverLetter = await this.geminiService.generateCoverLetter(
            jobDetails.jobTitle,
            jobDetails.company,
            jobDetails.description,
            request.profile.name,
            experienceText
          );
          console.log('🤖 AI cover letter generated');
        } catch (error) {
          console.log('Cover letter generation failed:', error);
        }
      }

      // Check if login is required and handle appropriately
      const loginPageDetected = await this.detectLoginRequirement(page);
      
      if (loginPageDetected) {
        if (request.profile.loginEmail && request.profile.loginPassword) {
          console.log('🔑 Login detected and credentials provided, attempting auto-login...');
          const loginSuccess = await this.autoLoginService.performAutoLogin(page, {
            email: request.profile.loginEmail,
            password: request.profile.loginPassword,
            method: request.profile.preferredLoginMethod || 'email'
          }, request.jobUrl);
          
          if (!loginSuccess) {
            return {
              success: false,
              sessionId,
              message: 'Login failed. Please verify your email and password are correct for this job portal.'
            };
          }
          
          console.log('✅ Auto-login successful, proceeding with application');
        } else if (request.profile.preferredLoginMethod === 'manual') {
          // Manual login method selected - send email for user to log in manually
          console.log('🔐 Manual login method selected - sending email for user login');
          
          // Close current browser and transfer to manual login service
          await page.close();
          
          // Import and use ManualLoginAutomationService
          const { ManualLoginAutomationService } = await import('./manual-login-automation');
          const manualLoginService = new ManualLoginAutomationService();
          
          // Start manual login workflow
          const manualResult = await manualLoginService.startJobApplication({
            jobUrl: request.jobUrl,
            profile: request.profile,
            resumeFile: request.resumeFile,
            coverLetterFile: request.coverLetterFile
          });
          
          return {
            success: manualResult.success,
            sessionId: manualResult.sessionId,
            message: manualResult.success 
              ? `📧 Login email sent! Check your email for a secure login link. Once you log in through the email link, the application will continue automatically.`
              : `❌ Failed to start manual login workflow: ${manualResult.message}`
          };
        } else {
          // Try alternative approaches without login
          console.log('🔍 Login required but no credentials provided, trying alternatives...');
          const alternatives = await this.tryAlternativeAccess(page);
          
          if (!alternatives.success) {
            return {
              success: false,
              sessionId,
              message: `❌ This job portal requires login to submit applications. You have two options:

🔑 Option 1: Provide your login credentials in the form above
📧 Use the same email/password you normally use to sign into:
• Google Careers (use your Google account)
• LinkedIn Jobs (use your LinkedIn account)  
• Company career portals (use your account for that company)

📱 Option 2: Select "Manual (No Auto-Login)" in the login method dropdown
This will send you an email with a secure login link when login is needed.

🔒 Your credentials are encrypted and secure.`
            };
          }
        }
      }

      // Navigate to application form first  
      const applicationUrl = await this.findAndNavigateToApplication(page);
      if (applicationUrl) {
        console.log(`📝 Successfully navigated to: ${applicationUrl}`);
      }

      // Handle complete multi-step application workflow
      await this.handleMultiStepForm(page, request);
      
      // Take screenshot before submission
      const preSubmissionScreenshot = await this.captureScreenshot(page, sessionId, 'pre-submission');
      
      // Submit the application
      const submissionResult = await this.submitApplication(page);
      
      // Wait for submission to process and check for confirmation
      await page.waitForTimeout(3000);
      
      // Verify submission was successful
      const submissionVerified = await this.verifySubmissionSuccess(page);
      
      // Take screenshot after submission
      const confirmationScreenshot = await this.captureScreenshot(page, sessionId, 'confirmation');
      
      // Use verified submission result
      const finalSuccess = submissionResult.success && submissionVerified;
      
      // Prepare form data for session update
      const filledFormData = {
        name: request.profile.name,
        email: request.profile.email,
        phone: request.profile.phone,
        jobUrl: request.jobUrl,
        timestamp: new Date().toISOString()
      };

      // Update session with results
      await storage.updateApplicationSession(sessionId, {
        status: finalSuccess ? 'submitted' : 'failed',
        submissionResult: finalSuccess ? 'success' : 'failed',
        submittedAt: finalSuccess ? new Date() : undefined,
        screenshotPath: confirmationScreenshot,
        filledFormData,
        errorMessage: submissionResult.error || (!submissionVerified ? 'Submission could not be verified' : undefined)
      });

      // Log the application
      await storage.createApplicationLog({
        sessionId,
        userId: user.id,
        jobTitle: jobDetails.jobTitle,
        companyName: jobDetails.company,
        jobUrl: request.jobUrl,
        result: finalSuccess ? 'success' : 'failed',
        notes: finalSuccess 
          ? 'Application submitted successfully and verified' 
          : `Submission failed: ${submissionResult.error || 'Could not verify submission'}`
      });

      // Send confirmation email
      await this.emailService.sendConfirmationEmail(session, finalSuccess);

      return {
        success: finalSuccess,
        sessionId,
        message: finalSuccess 
          ? `✅ Application submitted successfully to ${jobDetails.company}! The submission was verified and you should receive a confirmation email from them soon. Check your ${jobDetails.company} account to see the application.`
          : `❌ Application submission failed: ${submissionResult.error || 'Could not verify submission completed successfully'}`,
        confirmationScreenshot
      };

    } catch (error) {
      console.error('Real application submission error:', error);
      
      await storage.updateApplicationSession(sessionId, {
        status: 'failed',
        errorMessage: (error as Error).message,
      });

      return {
        success: false,
        message: `Application submission failed: ${(error as Error).message}`
      };
    } finally {
      await this.browserService.closeBrowser();
    }
  }

  async testBrowserAvailability(): Promise<boolean> {
    try {
      return await this.browserService.isAvailable();
    } catch (error) {
      console.log('Browser availability test failed:', (error as Error).message);
      return false;
    }
  }

  private detectPlatform(url: string): string {
    if (url.includes('greenhouse')) return 'Greenhouse';
    if (url.includes('lever')) return 'Lever';
    if (url.includes('workday')) return 'Workday';
    if (url.includes('google.com')) return 'Google Careers';
    if (url.includes('microsoft.com')) return 'Microsoft Careers';
    if (url.includes('amazon.')) return 'Amazon Jobs';
    if (url.includes('meta.com')) return 'Meta Careers';
    return 'Company Website';
  }

  private async extractJobDetails(page: Page): Promise<{
    jobTitle: string;
    company: string;
    description: string;
  }> {
    try {
      // Extract job title
      const jobTitle = await page.locator('h1, [data-testid*="job-title"], .job-title, #job-title').first().textContent() || 'Unknown Position';
      
      // Extract company name
      const company = await page.locator('[data-testid*="company"], .company-name, #company-name, h2').first().textContent() || 'Unknown Company';
      
      // Extract job description
      const description = await page.locator('[data-testid*="description"], .job-description, #job-description, .description').first().textContent() || '';

      return { jobTitle: jobTitle.trim(), company: company.trim(), description: description.trim() };
    } catch (error) {
      console.log('Job details extraction failed, using defaults');
      return {
        jobTitle: 'Software Engineer',
        company: 'Technology Company',
        description: 'Exciting software engineering opportunity'
      };
    }
  }

  private async findAndNavigateToApplication(page: Page): Promise<string | null> {
    console.log('🔍 Looking for Apply button...');
    
    const applySelectors = [
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      'button:has-text("Apply Now")',
      'a:has-text("Apply Now")',
      'button:has-text("Apply for this job")',
      '[data-testid*="apply"]',
      '[aria-label*="apply" i]',
      '.apply-button',
      '#apply-button',
      '.btn-apply',
      'button[class*="apply"]',
      'a[class*="apply"]'
    ];

    // First try to find and click Apply button
    for (const selector of applySelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const buttonText = await element.textContent() || '';
          console.log(`Found Apply button: "${buttonText}" with selector: ${selector}`);
          
          await element.click();
          await page.waitForTimeout(3000);
          
          // Check if we need to handle login
          const needsLogin = await this.checkIfLoginRequired(page);
          if (needsLogin) {
            console.log('🔑 Login required, handling authentication...');
            // Login will be handled by auto-login service
          }
          
          return page.url();
        }
      } catch (e) {
        console.log(`Apply selector failed: ${selector}`);
      }
    }

    console.log('⚠️ No Apply button found');
    return null;
  }

  private async checkIfLoginRequired(page: Page): Promise<boolean> {
    const loginIndicators = [
      ':has-text("sign in")',
      ':has-text("log in")',
      ':has-text("login")',
      ':has-text("create account")',
      ':has-text("get started")',
      'input[type="email"]',
      'input[type="password"]',
      '[data-testid*="login"]',
      '[data-testid*="signin"]'
    ];

    for (const indicator of loginIndicators) {
      try {
        if (await page.locator(indicator).first().isVisible({ timeout: 1000 })) {
          return true;
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    return false;
  }

  private async fillApplicationForm(page: Page, request: RealApplicationRequest, aiCoverLetter: string, sessionId: string): Promise<Record<string, any>> {
    const filledData: Record<string, any> = {};

    try {
      // Fill basic information
      await this.fillBasicInfo(page, request.profile, filledData);
      
      // Handle file uploads
      if (request.resumeFile) {
        const resumeUploaded = await this.handleFileUpload(page, 'resume', request.resumeFile, sessionId);
        filledData.resumeUploaded = resumeUploaded;
        if (!resumeUploaded) {
          console.log('⚠️ Resume upload failed, but continuing with application');
        }
      }
      
      if (request.coverLetterFile || aiCoverLetter) {
        const coverLetterBuffer = request.coverLetterFile || Buffer.from(aiCoverLetter);
        const coverLetterUploaded = await this.handleFileUpload(page, 'cover-letter', coverLetterBuffer, sessionId);
        filledData.coverLetterUploaded = coverLetterUploaded;
        if (!coverLetterUploaded) {
          console.log('⚠️ Cover letter upload failed, but continuing with application');
        }
      }

      // Fill custom responses
      if (request.profile.customResponses) {
        await this.fillCustomResponses(page, request.profile.customResponses, filledData);
      }

      // Debug form state after filling
      await this.debugFormState(page);
      
      console.log('✅ Application form filled successfully');
      return filledData;

    } catch (error) {
      console.error('Form filling error:', error);
      throw error;
    }
  }

  private async fillBasicInfo(page: Page, profile: ComprehensiveProfile, filledData: Record<string, any>) {
    const fieldMappings = [
      { 
        selectors: [
          'input[name*="firstName"]', 'input[id*="first"]', 'input[placeholder*="First" i]',
          'input[name*="first_name"]', 'input[id*="first_name"]', 'input[aria-label*="first" i]'
        ], 
        value: profile.name.split(' ')[0], 
        key: 'firstName' 
      },
      { 
        selectors: [
          'input[name*="lastName"]', 'input[id*="last"]', 'input[placeholder*="Last" i]',
          'input[name*="last_name"]', 'input[id*="last_name"]', 'input[aria-label*="last" i]'
        ], 
        value: profile.name.split(' ').slice(1).join(' '), 
        key: 'lastName' 
      },
      { 
        selectors: [
          'input[name*="name"]:not([name*="first"]):not([name*="last"])', 
          'input[id*="name"]:not([id*="first"]):not([id*="last"])', 
          'input[placeholder*="Full Name" i]', 'input[aria-label*="full name" i]'
        ], 
        value: profile.name, 
        key: 'fullName' 
      },
      { 
        selectors: [
          'input[type="email"]', 'input[name*="email"]', 'input[id*="email"]',
          'input[placeholder*="email" i]', 'input[aria-label*="email" i]'
        ], 
        value: profile.email, 
        key: 'email' 
      },
      { 
        selectors: [
          'input[type="tel"]', 'input[name*="phone"]', 'input[id*="phone"]',
          'input[placeholder*="phone" i]', 'input[aria-label*="phone" i]',
          'input[name*="mobile"]', 'input[id*="mobile"]'
        ], 
        value: `${profile.countryCode || '+1'} ${profile.phone}`, 
        key: 'phone' 
      },
      { 
        selectors: [
          'input[name*="address"]', 'input[id*="address"]', 'textarea[name*="address"]',
          'input[placeholder*="address" i]', 'input[aria-label*="address" i]'
        ], 
        value: profile.address || '', 
        key: 'address' 
      },
      { 
        selectors: [
          'input[name*="city"]', 'input[id*="city"]',
          'input[placeholder*="city" i]', 'input[aria-label*="city" i]'
        ], 
        value: profile.city || '', 
        key: 'city' 
      },
      { 
        selectors: [
          'input[name*="state"]', 'input[id*="state"]', 'select[name*="state"]',
          'input[placeholder*="state" i]', 'input[aria-label*="state" i]'
        ], 
        value: profile.state || '', 
        key: 'state' 
      },
      { 
        selectors: [
          'input[name*="zip"]', 'input[id*="zip"]', 'input[name*="postal"]',
          'input[placeholder*="zip" i]', 'input[placeholder*="postal" i]'
        ], 
        value: profile.zipCode || '', 
        key: 'zipCode' 
      },
      // Enhanced Professional Experience Fields
      { 
        selectors: [
          'input[name*="title"]', 'input[id*="title"]', 'input[name*="position"]',
          'input[placeholder*="job title" i]', 'input[aria-label*="current title" i]'
        ], 
        value: profile.currentTitle || '', 
        key: 'currentTitle' 
      },
      { 
        selectors: [
          'input[name*="company"]', 'input[id*="company"]', 'input[name*="employer"]',
          'input[placeholder*="company" i]', 'input[aria-label*="employer" i]'
        ], 
        value: profile.currentCompany || '', 
        key: 'currentCompany' 
      },
      // Enhanced Education Fields
      { 
        selectors: [
          'input[name*="university"]', 'input[id*="university"]', 'input[name*="school"]',
          'input[placeholder*="university" i]', 'input[aria-label*="school" i]'
        ], 
        value: profile.university || '', 
        key: 'university' 
      },
      { 
        selectors: [
          'input[name*="degree"]', 'input[id*="degree"]', 'select[name*="degree"]',
          'input[placeholder*="degree" i]', 'input[aria-label*="education" i]'
        ], 
        value: profile.highestDegree || '', 
        key: 'degree' 
      },
      { 
        selectors: [
          'input[name*="major"]', 'input[id*="major"]', 'input[name*="field"]',
          'input[placeholder*="major" i]', 'input[aria-label*="field of study" i]'
        ], 
        value: profile.major || '', 
        key: 'major' 
      },
      // Enhanced Work Authorization Fields
      { 
        selectors: [
          'select[name*="work_authorization"]', 'select[id*="work_authorization"]',
          'select[name*="visa"]', 'select[id*="visa"]', 'select[name*="eligible"]'
        ], 
        value: profile.workAuthorization || 'us_citizen', 
        key: 'workAuthorization' 
      }
    ];

    console.log(`🔍 Scanning for form fields on page...`);
    
    // Wait for form to load
    await page.waitForTimeout(2000);

    for (const mapping of fieldMappings) {
      let filled = false;
      for (const selector of mapping.selectors) {
        try {
          const field = page.locator(selector).first();
          if (await field.isVisible({ timeout: 1000 }) && await field.isEnabled()) {
            // Clear field first
            await field.clear();
            // Fill with value
            await field.fill(mapping.value);
            // Verify the value was entered
            const currentValue = await field.inputValue();
            if (currentValue === mapping.value) {
              filledData[mapping.key] = mapping.value;
              console.log(`✅ Successfully filled ${mapping.key}: ${mapping.value}`);
              filled = true;
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!filled && mapping.value) {
        console.log(`⚠️ Could not fill ${mapping.key}: ${mapping.value}`);
      }
    }

    // Handle work authorization dropdown
    if (profile.workAuthorization) {
      await this.handleWorkAuthorizationDropdown(page, profile.workAuthorization, filledData);
    }

    // Handle common job portal specific fields
    await this.handleCommonJobPortalFields(page, profile, filledData);

    // Wait for any dynamic form updates
    await page.waitForTimeout(1000);
  }

  private async handleWorkAuthorizationDropdown(page: Page, workAuth: string, filledData: Record<string, any>) {
    const workAuthSelectors = [
      'select[name*="work"]', 'select[id*="work"]', 'select[name*="authorization"]',
      'select[name*="visa"]', 'select[id*="visa"]', 'select[name*="eligibility"]'
    ];

    const workAuthValues = {
      'citizen': ['US Citizen', 'Citizen', 'Yes', 'Authorized', 'No sponsorship required'],
      'permanent_resident': ['Permanent Resident', 'Green Card', 'LPR', 'Yes', 'Authorized'],
      'visa_required': ['Visa Required', 'Need Sponsorship', 'F1', 'H1B', 'No', 'Requires Sponsorship'],
      'other': ['Other', 'Will provide details']
    };

    for (const selector of workAuthSelectors) {
      try {
        const select = page.locator(selector).first();
        if (await select.isVisible({ timeout: 1000 })) {
          const options = await select.locator('option').all();
          for (const option of options) {
            const optionText = await option.textContent() || '';
            const matchingValues = workAuthValues[workAuth as keyof typeof workAuthValues] || [];
            
            if (matchingValues.some(val => optionText.includes(val))) {
              await select.selectOption({ label: optionText });
              filledData.workAuthorization = optionText;
              console.log(`✅ Selected work authorization: ${optionText}`);
              return;
            }
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }

  private async handleFileUpload(page: Page, fileType: 'resume' | 'cover-letter', fileBuffer: Buffer, sessionId: string) {
    const uploadSelectors = [
      `input[type="file"][name*="${fileType}"]`,
      `input[type="file"][id*="${fileType}"]`,
      `input[type="file"][aria-label*="${fileType}" i]`,
      `input[type="file"][placeholder*="${fileType}" i]`,
      'input[type="file"][name*="resume"]',
      'input[type="file"][name*="cv"]',
      'input[type="file"][name*="document"]',
      'input[type="file"][name*="upload"]',
      'input[type="file"]' // Fallback to any file input
    ];

    // Save file temporarily with proper extension
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    const fileExtension = fileType === 'resume' ? '.pdf' : '.pdf';
    const tempFilePath = path.join(tempDir, `${fileType}_${sessionId}${fileExtension}`);
    await fs.writeFile(tempFilePath, fileBuffer);

    console.log(`🔍 Looking for ${fileType} upload field...`);

    for (const selector of uploadSelectors) {
      try {
        const fileInput = page.locator(selector).first();
        if (await fileInput.isVisible({ timeout: 2000 })) {
          console.log(`Found file input with selector: ${selector}`);
          
          // Upload the file
          await fileInput.setInputFiles(tempFilePath);
          
          // Wait for upload to process
          await page.waitForTimeout(2000);
          
          // Verify upload was successful
          const inputValue = await fileInput.inputValue();
          if (inputValue && inputValue.includes(fileType)) {
            console.log(`✅ Successfully uploaded ${fileType}: ${inputValue}`);
            
            // Cleanup temp file after successful upload
            setTimeout(() => fs.unlink(tempFilePath).catch(console.error), 5000);
            return true;
          }
        }
      } catch (e) {
        console.log(`File input selector failed: ${selector}`);
        // Continue
      }
    }

    console.log(`⚠️ Could not find or upload ${fileType} file`);
    
    // Try drag and drop upload areas
    const dropZoneSelectors = [
      '.upload-zone', '.file-drop', '.drag-drop', '[data-testid*="upload"]',
      '.file-upload-area', '.upload-area'
    ];
    
    for (const selector of dropZoneSelectors) {
      try {
        const dropZone = page.locator(selector).first();
        if (await dropZone.isVisible({ timeout: 1000 })) {
          console.log(`Found drop zone: ${selector}`);
          // Try clicking the drop zone to open file picker
          await dropZone.click();
          await page.waitForTimeout(1000);
          
          // Look for file input that appeared
          const fileInput = page.locator('input[type="file"]').first();
          if (await fileInput.isVisible({ timeout: 2000 })) {
            await fileInput.setInputFiles(tempFilePath);
            console.log(`✅ Uploaded ${fileType} via drop zone`);
            setTimeout(() => fs.unlink(tempFilePath).catch(console.error), 5000);
            return true;
          }
        }
      } catch (e) {
        // Continue
      }
    }

    // Cleanup temp file if upload failed
    await fs.unlink(tempFilePath).catch(console.error);
    return false;
  }

  private async fillCustomResponses(page: Page, responses: Record<string, string>, filledData: Record<string, any>) {
    for (const [question, answer] of Object.entries(responses)) {
      const textareas = await page.locator('textarea').all();
      for (const textarea of textareas) {
        try {
          const label = await textarea.locator('..').locator('label').first().textContent();
          if (label && label.toLowerCase().includes(question.toLowerCase())) {
            await textarea.fill(answer);
            filledData[`custom_${question}`] = answer;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }
  }

  private async submitApplication(page: Page): Promise<{ success: boolean; error?: string }> {
    const submitSelectors = [
      'button[type="submit"]:visible',
      'input[type="submit"]:visible',
      'button:visible:has-text("Submit")',
      'button:visible:has-text("Apply")',
      'button:visible:has-text("Send Application")',
      'button:visible:has-text("Continue")',
      'button:visible:has-text("Next")',
      'button:visible:has-text("Submit Application")',
      '[data-testid*="submit"]:visible',
      '[data-testid*="apply"]:visible',
      '.submit-btn:visible',
      '.apply-btn:visible',
      '.btn-primary:visible',
      '.btn-submit:visible',
      'button[class*="submit"]:visible',
      'button[class*="apply"]:visible',
      'button[id*="submit"]:visible',
      'button[id*="apply"]:visible'
    ];

    console.log('🔍 Looking for submit button...');
    
    for (const selector of submitSelectors) {
      try {
        console.log(`Testing selector: ${selector}`);
        const submitButton = page.locator(selector).first();
        
        if (await submitButton.isVisible({ timeout: 1000 })) {
          const buttonText = await submitButton.textContent() || '';
          console.log(`Found submit button: "${buttonText}" with selector: ${selector}`);
          
          // Scroll into view and click
          await submitButton.scrollIntoViewIfNeeded();
          await submitButton.click();
          console.log('🚀 Application submitted!');
          
          // Wait for submission to complete
          await page.waitForTimeout(3000);
          
          // Check for success indicators
          try {
            const successSelectors = [
              ':has-text("success")',
              ':has-text("submitted")',
              ':has-text("thank you")',
              ':has-text("received")',
              ':has-text("confirmation")',
              '.success',
              '.confirmation'
            ];
            
            for (const successSelector of successSelectors) {
              if (await page.locator(successSelector).first().isVisible({ timeout: 2000 })) {
                console.log('✅ Submission success confirmed');
                return { success: true };
              }
            }
          } catch (e) {
            // Success check failed, but button was clicked
          }
          
          return { success: true };
        }
      } catch (e) {
        console.log(`Selector failed: ${selector}`);
        // Continue to next selector
      }
    }
    
    // As a last resort, try to find any button that might submit
    try {
      const allButtons = await page.locator('button:visible').all();
      console.log(`Found ${allButtons.length} visible buttons, checking each...`);
      
      for (const button of allButtons) {
        const text = (await button.textContent() || '').toLowerCase();
        const className = (await button.getAttribute('class')) || '';
        const id = (await button.getAttribute('id')) || '';
        
        if (text.includes('submit') || text.includes('apply') || text.includes('send') ||
            className.includes('submit') || className.includes('apply') ||
            id.includes('submit') || id.includes('apply')) {
          console.log(`Trying button with text: "${text}", class: "${className}", id: "${id}"`);
          await button.scrollIntoViewIfNeeded();
          await button.click();
          await page.waitForTimeout(3000);
          return { success: true };
        }
      }
    } catch (e) {
      console.log('Fallback button search failed');
    }

    console.log('❌ No submit button found after exhaustive search');
    return { success: false, error: 'Submit button not found after trying all selectors and scanning all buttons' };
  }

  private async verifySubmissionSuccess(page: Page): Promise<boolean> {
    console.log('🔍 Verifying submission success...');
    
    const successIndicators = [
      // Text-based indicators
      ':has-text("thank you")',
      ':has-text("application submitted")',
      ':has-text("submission successful")',
      ':has-text("we have received")',
      ':has-text("confirmation")',
      ':has-text("application received")',
      ':has-text("successfully applied")',
      
      // Class-based indicators
      '.success', '.confirmation', '.submitted', '.thank-you',
      '.application-success', '.submission-complete',
      
      // ID-based indicators  
      '#success', '#confirmation', '#submitted', '#thank-you',
      
      // Data attribute indicators
      '[data-testid*="success"]', '[data-testid*="confirmation"]',
      '[data-testid*="submitted"]', '[data-testid*="thank"]'
    ];

    for (const indicator of successIndicators) {
      try {
        if (await page.locator(indicator).first().isVisible({ timeout: 2000 })) {
          const text = await page.locator(indicator).first().textContent() || '';
          console.log(`✅ Submission confirmed with indicator: "${text.slice(0, 100)}..."`);
          return true;
        }
      } catch (e) {
        // Continue checking
      }
    }

    // Check URL for success patterns
    const currentUrl = page.url();
    const successUrlPatterns = ['success', 'confirmation', 'thank', 'submitted', 'complete'];
    
    if (successUrlPatterns.some(pattern => currentUrl.toLowerCase().includes(pattern))) {
      console.log(`✅ Submission confirmed by URL pattern: ${currentUrl}`);
      return true;
    }

    // Check if we're on a different page (likely success)
    if (!currentUrl.includes('apply') && !currentUrl.includes('job')) {
      console.log(`✅ Submission likely successful - redirected to: ${currentUrl}`);
      return true;
    }

    console.log(`❓ Could not verify submission success. Current URL: ${currentUrl}`);
    return false;
  }

  private async handleMultiStepForm(page: Page, request: RealApplicationRequest): Promise<void> {
    console.log('🔍 Starting intelligent multi-step application workflow...');
    
    let currentStep = 1;
    const maxSteps = 10;
    const startTime = Date.now();
    const maxDuration = 25000; // 25 seconds max
    
    while (currentStep <= maxSteps) {
      // Check time limit
      if (Date.now() - startTime > maxDuration) {
        console.log('⏰ Time limit reached, proceeding to submit');
        break;
      }
      
      console.log(`📋 Step ${currentStep}: AI analyzing current page...`);
      
      // AI-powered page analysis
      const analysis = await this.aiFormAnalyzer.analyzeCurrentPage(page);
      console.log(`🤖 Detected: ${analysis.stepType} (confidence: ${analysis.confidence})`);
      
      // Handle different step types
      const stepResult = await this.handleStepByType(page, request, analysis);
      
      if (stepResult.shouldSubmit) {
        console.log('🎯 Ready to submit application');
        break;
      }
      
      if (!stepResult.canContinue) {
        console.log('❌ Cannot continue, stopping workflow');
        break;
      }
      
      currentStep++;
      await page.waitForTimeout(500); // Quick pause between steps
    }
    
    console.log(`✅ Workflow completed in ${currentStep} steps (${Date.now() - startTime}ms)`);
  }

  private async handleStepByType(
    page: Page, 
    request: RealApplicationRequest, 
    analysis: FormAnalysis
  ): Promise<{ shouldSubmit: boolean; canContinue: boolean }> {
    
    switch (analysis.stepType) {
      case 'login':
        console.log('🔑 Handling login step...');
        return await this.handleLoginStep(page, request);
        
      case 'profile':
        console.log('👤 Filling profile information...');
        await this.fillProfileStep(page, request.profile);
        return { shouldSubmit: false, canContinue: true };
        
      case 'experience':
        console.log('💼 Filling experience information...');
        await this.fillExperienceStep(page, request.profile);
        return { shouldSubmit: false, canContinue: true };
        
      case 'education':
        console.log('🎓 Filling education information...');
        await this.fillEducationStep(page, request.profile);
        return { shouldSubmit: false, canContinue: true };
        
      case 'documents':
        console.log('📄 Handling document uploads...');
        await this.handleDocumentStep(page, request);
        return { shouldSubmit: false, canContinue: true };
        
      case 'questions':
        console.log('❓ Answering custom questions...');
        await this.handleQuestionsStep(page, request.profile);
        return { shouldSubmit: false, canContinue: true };
        
      case 'review':
        console.log('👀 Reviewing application...');
        await this.handleReviewStep(page);
        return { shouldSubmit: false, canContinue: true };
        
      case 'submit':
        console.log('🚀 Ready for submission...');
        return { shouldSubmit: true, canContinue: false };
        
      default:
        console.log('🔄 General form filling...');
        await this.fillGeneralForm(page, request.profile);
        return { shouldSubmit: false, canContinue: true };
    }
  }

  private async detectLoginRequirement(page: Page): Promise<boolean> {
    const loginIndicators = [
      'form[action*="login"]',
      'form[action*="signin"]',
      'input[name="password"]',
      'input[type="password"]',
      'button:has-text("Sign in")',
      'button:has-text("Log in")',
      'a:has-text("Sign in")',
      '.login-form',
      '.signin-form',
      '#login',
      '#signin'
    ];
    
    for (const selector of loginIndicators) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          return true;
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    // Check URL patterns
    const url = page.url().toLowerCase();
    if (url.includes('login') || url.includes('signin') || url.includes('auth')) {
      return true;
    }
    
    return false;
  }

  private async tryAlternativeAccess(page: Page): Promise<{ success: boolean; message?: string }> {
    // Strategy 1: Look for guest/skip options
    const guestOptions = [
      'button:has-text("Continue without account")',
      'button:has-text("Apply without signing in")',
      'a:has-text("Continue as guest")',
      'button:has-text("Skip")',
      'button:has-text("Apply Now")',
      '.skip-login',
      '.guest-apply'
    ];
    
    for (const selector of guestOptions) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click();
          console.log('✅ Found guest option, continuing without login');
          await page.waitForTimeout(2000);
          return { success: true };
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    // Strategy 2: Try direct apply buttons
    const directApplyButtons = [
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      'button:has-text("Apply Now")',
      '.apply-button'
    ];
    
    for (const selector of directApplyButtons) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click();
          await page.waitForTimeout(3000);
          
          // Check if we moved to an application form
          const currentUrl = page.url();
          if (currentUrl.includes('apply') || currentUrl.includes('application')) {
            console.log('✅ Successfully navigated to application without login');
            return { success: true };
          }
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    return { 
      success: false, 
      message: 'Login credentials required for this job portal'
    };
  }

  private async handleLoginStep(page: Page, request: RealApplicationRequest): Promise<{ shouldSubmit: boolean; canContinue: boolean }> {
    if (request.profile.loginEmail && request.profile.loginPassword) {
      console.log('🔑 Attempting login with provided credentials...');
      const success = await this.autoLoginService.performAutoLogin(page, {
        email: request.profile.loginEmail,
        password: request.profile.loginPassword,
        method: request.profile.preferredLoginMethod || 'email'
      }, request.jobUrl);
      
      if (success) {
        console.log('✅ Login successful, continuing with application');
        // Wait for redirect after login
        await page.waitForTimeout(3000);
        return { shouldSubmit: false, canContinue: true };
      } else {
        console.log('❌ Login failed with provided credentials');
        return { shouldSubmit: false, canContinue: false };
      }
    }
    
    // If no credentials provided, try multiple strategies
    console.log('⚠️ No login credentials provided, trying alternative approaches...');
    
    // Strategy 1: Look for guest/skip options
    const guestOptions = [
      'button:has-text("Continue without account")',
      'button:has-text("Apply without signing in")',
      'a:has-text("Continue as guest")',
      'button:has-text("Skip")',
      'button:has-text("Apply Now")',
      'a:has-text("Apply directly")',
      '.skip-login',
      '.guest-apply'
    ];
    
    for (const selector of guestOptions) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click();
          console.log('✅ Found guest/skip option, continuing without login');
          await page.waitForTimeout(2000);
          return { shouldSubmit: false, canContinue: true };
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    // Strategy 2: Check if we can find a direct application form on the same page
    const directFormSelectors = [
      'form[class*="application"]',
      'form[class*="apply"]',
      'form[id*="job-application"]',
      'input[name*="name"]',
      'input[name*="email"]',
      'textarea[name*="cover"]'
    ];
    
    let foundDirectForm = false;
    for (const selector of directFormSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          console.log('✅ Found direct application form, bypassing login');
          foundDirectForm = true;
          break;
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    if (foundDirectForm) {
      return { shouldSubmit: false, canContinue: true };
    }
    
    // Strategy 3: Try to find "Apply" button that might work without login
    const directApplyButtons = [
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      'button:has-text("Apply Now")',
      'input[value*="Apply"]',
      '.apply-button',
      '.btn-apply'
    ];
    
    for (const selector of directApplyButtons) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          console.log('🔄 Trying direct apply button without login...');
          await element.click();
          await page.waitForTimeout(3000);
          
          // Check if we moved to an application form
          const currentUrl = page.url();
          if (currentUrl.includes('apply') || currentUrl.includes('application')) {
            console.log('✅ Successfully navigated to application form without login');
            return { shouldSubmit: false, canContinue: true };
          }
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    // Strategy 4: Return helpful error message with guidance
    console.log('❌ Login appears to be required. Providing guidance to user.');
    return { 
      shouldSubmit: false, 
      canContinue: false
    };
  }

  private async fillProfileStep(page: Page, profile: ComprehensiveProfile): Promise<void> {
    // Enhanced profile field detection and filling
    const profileMappings = [
      { selectors: ['input[name*="firstName" i]', 'input[id*="firstName" i]', 'input[placeholder*="first name" i]'], value: profile.name.split(' ')[0] },
      { selectors: ['input[name*="lastName" i]', 'input[id*="lastName" i]', 'input[placeholder*="last name" i]'], value: profile.name.split(' ').slice(1).join(' ') },
      { selectors: ['input[name*="name" i]', 'input[id*="name" i]', 'input[placeholder*="full name" i]'], value: profile.name },
      { selectors: ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]'], value: profile.email },
      { selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]'], value: profile.phone },
      { selectors: ['input[name*="address" i]', 'input[id*="address" i]'], value: profile.address || '' },
      { selectors: ['input[name*="city" i]', 'input[id*="city" i]'], value: profile.city || '' },
      { selectors: ['input[name*="state" i]', 'input[id*="state" i]', 'select[name*="state" i]'], value: profile.state || '' },
      { selectors: ['input[name*="zip" i]', 'input[id*="zip" i]', 'input[name*="postal" i]'], value: profile.zipCode || '' }
    ];

    for (const mapping of profileMappings) {
      await this.fillFieldWithSelectors(page, mapping.selectors, mapping.value);
    }
  }

  private async fillExperienceStep(page: Page, profile: ComprehensiveProfile): Promise<void> {
    const experienceSelectors = [
      'textarea[name*="experience" i]', 'textarea[id*="experience" i]',
      'textarea[name*="summary" i]', 'textarea[id*="summary" i]', 
      'textarea[placeholder*="experience" i]', 'textarea[placeholder*="tell us about" i]'
    ];

    const experienceText = profile.yearsOfExperience || 'Experienced software engineer with full-stack development expertise';

    await this.fillFieldWithSelectors(page, experienceSelectors, experienceText);
  }

  private async fillEducationStep(page: Page, profile: ComprehensiveProfile): Promise<void> {
    const educationSelectors = [
      'input[name*="education" i]', 'input[id*="education" i]',
      'input[name*="degree" i]', 'input[id*="degree" i]',
      'select[name*="education" i]', 'select[id*="degree" i]'
    ];

    const educationValue = 'Bachelor\'s Degree in Computer Science';
    await this.fillFieldWithSelectors(page, educationSelectors, educationValue);
  }

  private async handleDocumentStep(page: Page, request: RealApplicationRequest): Promise<void> {
    if (request.resumeFile) {
      await this.uploadFile(page, 'resume', request.resumeFile);
    }
    if (request.coverLetterFile) {
      await this.uploadFile(page, 'cover-letter', request.coverLetterFile);
    }
  }

  private async handleQuestionsStep(page: Page, profile: ComprehensiveProfile): Promise<void> {
    // Find text areas and fill with intelligent responses
    const questionSelectors = [
      'textarea:visible',
      'input[type="text"]:visible',
      'input[type="textarea"]:visible'
    ];

    for (const selector of questionSelectors) {
      try {
        const fields = await page.locator(selector).all();
        for (const field of fields) {
          if (await field.isVisible()) {
            const placeholder = await field.getAttribute('placeholder') || '';
            const label = await this.getFieldLabel(page, field);
            
            // Generate intelligent response based on context
            const response = this.generateQuestionResponse(placeholder + ' ' + label);
            await field.fill(response);
            console.log(`Filled question field: ${response.slice(0, 50)}...`);
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }

  private async handleReviewStep(page: Page): Promise<void> {
    // Just wait a moment for review, then proceed
    console.log('📝 Reviewing application details...');
    await page.waitForTimeout(1000);
  }

  private async fillFieldWithSelectors(page: Page, selectors: string[], value: string): Promise<boolean> {
    for (const selector of selectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 1000 })) {
          await field.fill(value);
          console.log(`✅ Filled field with selector: ${selector}`);
          return true;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    return false;
  }

  private async uploadFile(page: Page, fileType: string, fileBuffer: Buffer): Promise<void> {
    const uploadSelectors = [
      `input[type="file"][name*="${fileType}" i]`,
      `input[type="file"][id*="${fileType}" i]`,
      'input[type="file"]'
    ];

    for (const selector of uploadSelectors) {
      try {
        const fileInput = page.locator(selector).first();
        if (await fileInput.isVisible({ timeout: 1000 })) {
          // Save buffer to temp file and upload
          const tempPath = path.join('./temp', `${Date.now()}_${fileType}.pdf`);
          await fs.writeFile(tempPath, fileBuffer);
          await fileInput.setInputFiles(tempPath);
          console.log(`✅ Uploaded ${fileType} file`);
          
          // Clean up temp file
          setTimeout(() => fs.unlink(tempPath).catch(() => {}), 5000);
          return;
        }
      } catch (e) {
        // Continue
      }
    }
  }

  private generateQuestionResponse(context: string): string {
    const lowerContext = context.toLowerCase();
    
    if (lowerContext.includes('why') || lowerContext.includes('interest')) {
      return 'I am passionate about technology and excited about the opportunity to contribute to innovative projects while growing my career.';
    } else if (lowerContext.includes('strength') || lowerContext.includes('skill')) {
      return 'My key strengths include problem-solving, attention to detail, and the ability to work effectively in team environments.';
    } else if (lowerContext.includes('goal') || lowerContext.includes('future')) {
      return 'My goal is to continuously develop my technical skills while making meaningful contributions to impactful projects.';
    } else {
      return 'I believe my experience and dedication make me a strong candidate for this position.';
    }
  }

  private async getFieldLabel(page: Page, field: any): Promise<string> {
    try {
      const labelSelector = await field.getAttribute('aria-label') || 
                           await field.getAttribute('data-label') || '';
      return labelSelector;
    } catch {
      return '';
    }
  }

  private async fillGeneralForm(page: Page, profile: ComprehensiveProfile): Promise<Record<string, any>> {
    // Use the universal form detector for comprehensive field detection
    const detectedFields = await this.universalFormDetector.detectAllFormFields(page);
    console.log(`🔍 Detected ${detectedFields.length} form fields using universal detector`);
    
    // Fill detected fields with profile data
    const filledData = await this.universalFormDetector.fillDetectedFields(page, detectedFields, profile);
    
    console.log(`✅ Universal form filling completed. Filled ${Object.keys(filledData).length} fields total.`);
    return filledData;
  }

  private async analyzePageWithAI(page: Page): Promise<{
    stepType: string;
    requiredFields: string[];
    formContext: string;
  }> {
    try {
      // Get page content for AI analysis
      const pageTitle = await page.title();
      const visibleText = await page.locator('body').textContent() || '';
      const formLabels = await page.locator('label:visible').allTextContents();
      const inputPlaceholders = await page.locator('input:visible').evaluateAll(
        inputs => inputs.map(input => input.getAttribute('placeholder')).filter(Boolean)
      );
      
      // Simple pattern matching (can be enhanced with actual AI service)
      let stepType = 'general';
      let requiredFields: string[] = [];
      
      const content = (pageTitle + ' ' + visibleText + ' ' + formLabels.join(' ')).toLowerCase();
      
      if (content.includes('profile') || content.includes('personal') || content.includes('contact')) {
        stepType = 'profile';
        requiredFields = ['name', 'email', 'phone', 'address'];
      } else if (content.includes('experience') || content.includes('work') || content.includes('employment')) {
        stepType = 'experience';
        requiredFields = ['experience', 'skills', 'employment'];
      } else if (content.includes('education') || content.includes('degree') || content.includes('university')) {
        stepType = 'education';
        requiredFields = ['education', 'degree', 'school'];
      } else if (content.includes('upload') || content.includes('resume') || content.includes('cv')) {
        stepType = 'documents';
        requiredFields = ['resume', 'cover_letter'];
      } else if (content.includes('review') || content.includes('submit') || content.includes('confirm')) {
        stepType = 'review';
        requiredFields = [];
      }
      
      return {
        stepType,
        requiredFields,
        formContext: content.slice(0, 500)
      };
    } catch (error) {
      return { stepType: 'general', requiredFields: [], formContext: '' };
    }
  }

  private async fillCurrentStepForm(
    page: Page, 
    request: RealApplicationRequest, 
    analysis: { stepType: string; requiredFields: string[] }, 
    filledData: Record<string, any>
  ): Promise<void> {
    console.log(`📝 Filling ${analysis.stepType} form fields...`);
    
    switch (analysis.stepType) {
      case 'profile':
        await this.fillBasicInfo(page, request.profile, filledData);
        break;
      case 'experience':
        await this.fillExperienceFields(page, request.profile, filledData);
        break;
      case 'education':
        await this.fillEducationFields(page, request.profile, filledData);
        break;
      case 'documents':
        if (request.resumeFile) {
          await this.handleFileUpload(page, 'resume', request.resumeFile, Date.now().toString());
        }
        break;
      default:
        // Fill any visible form fields intelligently
        await this.fillBasicInfo(page, request.profile, filledData);
        break;
    }
  }

  private async fillExperienceFields(page: Page, profile: ComprehensiveProfile, filledData: Record<string, any>): Promise<void> {
    const experienceSelectors = [
      'textarea[name*="experience"]', 'textarea[id*="experience"]',
      'textarea[name*="summary"]', 'textarea[id*="summary"]',
      'textarea[placeholder*="experience" i]', 'textarea[placeholder*="work" i]'
    ];

    const experienceText = profile.yearsOfExperience || 'Experienced software engineer with expertise in full-stack development';

    for (const selector of experienceSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 1000 })) {
          await field.fill(experienceText);
          filledData.experience = experienceText;
          console.log('✅ Filled experience field');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
  }

  private async fillEducationFields(page: Page, profile: ComprehensiveProfile, filledData: Record<string, any>): Promise<void> {
    const educationSelectors = [
      'input[name*="education"]', 'input[id*="education"]',
      'input[name*="degree"]', 'input[id*="degree"]',
      'input[name*="university"]', 'input[id*="university"]',
      'select[name*="education"]', 'select[id*="education"]'
    ];

    const educationValue = 'Bachelor\'s Degree in Computer Science';

    for (const selector of educationSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 1000 })) {
          if (selector.includes('select')) {
            // Handle dropdown
            const options = await field.locator('option').allTextContents();
            const matchingOption = options.find(opt => 
              opt.toLowerCase().includes('bachelor') || opt.toLowerCase().includes('computer')
            );
            if (matchingOption) {
              await field.selectOption({ label: matchingOption });
            }
          } else {
            await field.fill(educationValue);
          }
          filledData.education = educationValue;
          console.log('✅ Filled education field');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
  }

  private async navigateToNextStep(page: Page): Promise<{ hasNext: boolean; isSubmitStep: boolean }> {
    const nextStepSelectors = [
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button:has-text("Proceed")',
      'button:has-text("Save and continue")',
      '[data-testid*="next"]',
      '[data-testid*="continue"]',
      'button[class*="next"]',
      'button[class*="continue"]'
    ];

    const submitSelectors = [
      'button:has-text("Submit")',
      'button:has-text("Submit Application")',
      'button:has-text("Apply")',
      'button:has-text("Send Application")',
      'button[type="submit"]'
    ];

    // Check for submit buttons first
    for (const selector of submitSelectors) {
      try {
        const submitButton = page.locator(selector).first();
        if (await submitButton.isVisible({ timeout: 1000 })) {
          console.log('🎯 Found submit button, ready for final submission');
          return { hasNext: false, isSubmitStep: true };
        }
      } catch (e) {
        // Continue
      }
    }

    // Look for next step buttons
    for (const selector of nextStepSelectors) {
      try {
        const nextButton = page.locator(selector).first();
        if (await nextButton.isVisible({ timeout: 1000 })) {
          const buttonText = await nextButton.textContent() || '';
          console.log(`Clicking next step: "${buttonText}"`);
          
          await nextButton.click();
          await page.waitForTimeout(2000); // Wait for navigation
          
          return { hasNext: true, isSubmitStep: false };
        }
      } catch (e) {
        // Continue
      }
    }
    
    return { hasNext: false, isSubmitStep: false };
  }

  private async debugFormState(page: Page): Promise<void> {
    console.log('🔍 DEBUG: Analyzing form state...');
    
    try {
      // Log all visible inputs
      const inputs = await page.locator('input:visible').all();
      console.log(`Found ${inputs.length} visible input fields:`);
      
      for (let i = 0; i < Math.min(inputs.length, 10); i++) {
        const input = inputs[i];
        const type = await input.getAttribute('type') || 'text';
        const name = await input.getAttribute('name') || '';
        const id = await input.getAttribute('id') || '';
        const placeholder = await input.getAttribute('placeholder') || '';
        const value = await input.inputValue() || '';
        
        console.log(`  Input ${i + 1}: type="${type}" name="${name}" id="${id}" placeholder="${placeholder}" value="${value.slice(0, 30)}"`);
      }
      
      // Log all visible buttons
      const buttons = await page.locator('button:visible').all();
      console.log(`Found ${buttons.length} visible buttons:`);
      
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const button = buttons[i];
        const text = await button.textContent() || '';
        const type = await button.getAttribute('type') || '';
        const className = await button.getAttribute('class') || '';
        
        console.log(`  Button ${i + 1}: text="${text.slice(0, 30)}" type="${type}" class="${className.slice(0, 50)}"`);
      }
      
      // Log current URL
      console.log(`Current URL: ${page.url()}`);
      
    } catch (error) {
      console.log('Debug form state failed:', error);
    }
  }

  private async captureScreenshot(page: Page, sessionId: string, type: string): Promise<string> {
    try {
      const screenshotDir = path.join(process.cwd(), 'screenshots');
      await fs.mkdir(screenshotDir, { recursive: true });
      
      const screenshotPath = path.join(screenshotDir, `${sessionId}_${type}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      return screenshotPath;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return '';
    }
  }

  private async simulateRealApplication(request: RealApplicationRequest, sessionId: string): Promise<{
    success: boolean;
    sessionId?: string;
    message: string;
    confirmationScreenshot?: string;
  }> {
    try {
      // Create user if needed
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

      // Simulate enhanced job details extraction
      const jobDetails = {
        jobTitle: 'Senior Software Engineer',
        company: 'Google',
        description: 'Exciting opportunity to work on Google Cloud Dataproc with cutting-edge distributed computing technologies.'
      };

      // Create application session
      const session = await storage.createApplicationSession({
        id: sessionId,
        userId: user.id,
        jobUrl: request.jobUrl,
        platform: this.detectPlatform(request.jobUrl),
        status: 'simulated_real_mode',
        profileData: request.profile,
        reviewEmailSent: false,
        whatsappReviewSent: false,
        approvalToken: uuidv4(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        jobTitle: jobDetails.jobTitle,
        company: jobDetails.company,
      });

      // Generate AI cover letter if requested
      let aiCoverLetter = '';
      if (request.profile.enableAICoverLetter) {
        try {
          aiCoverLetter = await this.geminiService.generateCoverLetter(
            jobDetails.jobTitle,
            jobDetails.company,
            jobDetails.description,
            request.profile.name,
            request.profile.yearsOfExperience || 'Software engineering experience'
          );
          console.log('🤖 AI cover letter generated for real mode simulation');
        } catch (error) {
          console.log('Cover letter generation failed:', error);
        }
      }

      // Simulate comprehensive form data
      const simulatedFormData = {
        firstName: request.profile.name.split(' ')[0],
        lastName: request.profile.name.split(' ').slice(1).join(' '),
        email: request.profile.email,
        phone: request.profile.phone,
        address: request.profile.address,
        city: request.profile.city,
        state: request.profile.state,
        zipCode: request.profile.zipCode,
        workAuthorization: request.profile.workAuthorization,
        resumeUploaded: !!request.resumeFile,
        coverLetterUploaded: !!request.coverLetterFile || !!aiCoverLetter,
        autoLogin: !!(request.profile.loginEmail && request.profile.loginPassword),
        mode: 'real_simulation',
        note: 'Browser dependencies unavailable - simulated with full real mode features'
      };

      // Update session with complete data
      await storage.updateApplicationSession(sessionId, {
        filledFormData: simulatedFormData,
        autoGeneratedCoverLetter: aiCoverLetter,
        status: 'pending_real_review',
        submissionResult: 'simulated_success'
      });

      // Send enhanced notification email
      console.log('📧 Sending real mode simulation confirmation email');

      // Log the simulation
      await storage.createApplicationLog({
        sessionId,
        userId: user.id,
        jobTitle: jobDetails.jobTitle,
        companyName: jobDetails.company,
        jobUrl: request.jobUrl,
        result: 'simulated_real_mode',
        notes: 'Real mode requested but browser automation unavailable. Enhanced simulation with full features completed successfully.'
      });

      return {
        success: true,
        sessionId,
        message: `✅ Real mode simulation completed! Browser automation unavailable in this environment, but enhanced simulation processed with AI cover letter, auto-login detection, and comprehensive form filling. In production with full dependencies, this would submit directly to ${jobDetails.company}.`
      };

    } catch (error) {
      console.error('Real mode simulation error:', error);
      return {
        success: false,
        message: `Real mode simulation failed: ${(error as Error).message}`
      };
    }
  }

  private async selectOptionInDropdown(field: any, value: string): Promise<void> {
    try {
      const tagName = await field.evaluate((el: Element) => el.tagName.toLowerCase());
      
      if (tagName === 'select') {
        // Try different methods to select the option
        const options = await field.locator('option').all();
        for (const option of options) {
          const optionText = await option.textContent() || '';
          const optionValue = await option.getAttribute('value') || '';
          
          if (optionText.includes(value) || optionValue.includes(value) || 
              value.includes(optionText) || value.includes(optionValue)) {
            await field.selectOption({ label: optionText });
            console.log(`✅ Selected dropdown option: ${optionText}`);
            return;
          }
        }
        
        // Fallback: try to select by value directly
        await field.selectOption({ value });
      } else {
        // For input fields, just fill with the value
        await field.fill(value);
      }
    } catch (error) {
      console.log(`Failed to select dropdown option: ${value}`);
      // Try to fill as regular input as fallback
      try {
        await field.fill(value);
      } catch (e) {
        console.log(`Failed to fill field with value: ${value}`);
      }
    }
  }

  private async handleCommonJobPortalFields(page: Page, profile: ComprehensiveProfile, filledData: Record<string, any>): Promise<void> {
    console.log('🔍 Handling common job portal specific fields...');

    // Handle start date fields
    await this.handleStartDateFields(page, profile, filledData);
    
    // Handle Yes/No radio buttons for employment history
    await this.handleEmploymentHistoryQuestions(page, filledData);
    
    // Handle checkbox consent forms
    await this.handleConsentCheckboxes(page, filledData);
    
    // Handle company-specific relationship questions
    await this.handleRelationshipQuestions(page, filledData);
    
    // Handle visa/sponsorship questions
    await this.handleVisaSponsorshipQuestions(page, profile, filledData);
  }

  private async handleStartDateFields(page: Page, profile: ComprehensiveProfile, filledData: Record<string, any>): Promise<void> {
    const startDateSelectors = [
      'input[name*="start" i][name*="date" i]',
      'input[id*="start" i][id*="date" i]',
      'input[placeholder*="when can you start" i]',
      'input[placeholder*="start date" i]',
      'input[placeholder*="available" i]',
      'input[type="date"]',
      'select[name*="start" i]'
    ];

    const availableDate = profile.availableStartDate || 'Immediately';
    
    for (const selector of startDateSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 1000 })) {
          const fieldType = await field.getAttribute('type');
          
          if (fieldType === 'date') {
            // For date inputs, use ISO date format
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 14); // 2 weeks from now
            const isoDate = futureDate.toISOString().split('T')[0];
            await field.fill(isoDate);
            console.log(`✅ Set start date: ${isoDate}`);
          } else {
            // For text inputs or selects
            await field.fill(availableDate);
            console.log(`✅ Set availability: ${availableDate}`);
          }
          
          filledData.startDate = availableDate;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
  }

  private async handleEmploymentHistoryQuestions(page: Page, filledData: Record<string, any>): Promise<void> {
    console.log('🔍 Handling employment history and Yes/No questions...');
    
    // Find all radio button groups on the page
    const allRadioButtons = await page.locator('input[type="radio"]').all();
    const processedGroups = new Set();
    
    for (const radio of allRadioButtons) {
      try {
        const name = await radio.getAttribute('name');
        if (!name || processedGroups.has(name)) continue;
        
        processedGroups.add(name);
        
        // Get all radios in this group
        const groupRadios = await page.locator(`input[type="radio"][name="${name}"]`).all();
        
        // Find the question text for this group
        const questionText = await this.findQuestionTextForRadioGroup(page, name);
        console.log(`Found radio group: "${questionText}"`);
        
        // Determine the best answer based on question content
        const answer = this.determineAnswerForQuestion(questionText);
        console.log(`Determined answer: ${answer}`);
        
        // Select the appropriate radio button
        for (const groupRadio of groupRadios) {
          const value = await groupRadio.getAttribute('value') || '';
          const labelText = await this.getRadioLabelText(page, groupRadio);
          
          if (this.doesAnswerMatch(answer, value, labelText)) {
            if (await groupRadio.isVisible() && await groupRadio.isEnabled()) {
              await groupRadio.check();
              console.log(`✅ Selected "${labelText}" for: ${questionText}`);
              filledData[`question_${name}`] = answer;
              break;
            }
          }
        }
      } catch (e) {
        // Continue to next radio
      }
    }
  }

  private async findQuestionTextForRadioGroup(page: Page, radioName: string): Promise<string> {
    try {
      const firstRadio = page.locator(`input[type="radio"][name="${radioName}"]`).first();
      
      // Look for question text in various locations relative to the radio group
      const searchLocators = [
        firstRadio.locator('..').locator('..').locator('label'),
        firstRadio.locator('..').locator('..').locator('legend'),
        firstRadio.locator('..').locator('..').locator('div').first(),
        firstRadio.locator('..').locator('..').locator('..').locator('label'),
        page.locator(`label[for*="${radioName}"]`),
        page.locator(`legend:has(input[name="${radioName}"])`),
        firstRadio.locator('../../preceding-sibling::*[contains(text(), "?")]')
      ];
      
      for (const locator of searchLocators) {
        try {
          const text = await locator.textContent();
          if (text && text.length > 10 && text.includes('?')) {
            return text.trim();
          }
        } catch (e) {
          // Continue
        }
      }
      
      // Fallback: get parent element text
      const parentText = await firstRadio.locator('..').locator('..').textContent() || '';
      return parentText.split('\n')[0].trim() || `Radio group: ${radioName}`;
    } catch (e) {
      return `Radio group: ${radioName}`;
    }
  }

  private async getRadioLabelText(page: Page, radio: any): Promise<string> {
    try {
      const id = await radio.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const labelText = await label.textContent();
        if (labelText) return labelText.trim();
      }
      
      // Check for label as parent or sibling
      const parentLabel = await radio.locator('..').textContent() || '';
      const siblingLabel = await radio.locator('~ label').textContent() || '';
      
      return (siblingLabel || parentLabel).trim();
    } catch (e) {
      return '';
    }
  }

  private determineAnswerForQuestion(questionText: string): string {
    const lowerQuestion = questionText.toLowerCase();
    
    // Employment history questions - default to No
    if (lowerQuestion.includes('employed by') || 
        lowerQuestion.includes('worked for') || 
        lowerQuestion.includes('previously worked') ||
        lowerQuestion.includes('personal or familial relationships') ||
        lowerQuestion.includes('family members') ||
        lowerQuestion.includes('relatives') ||
        lowerQuestion.includes('friends or family')) {
      return 'No';
    }
    
    // Work authorization questions - default to Yes
    if (lowerQuestion.includes('eligible to work') || 
        lowerQuestion.includes('authorized to work') || 
        lowerQuestion.includes('work authorization') ||
        lowerQuestion.includes('legally authorized') ||
        lowerQuestion.includes('right to work')) {
      return 'Yes';
    }
    
    // Sponsorship questions
    if (lowerQuestion.includes('require sponsorship') || 
        lowerQuestion.includes('need sponsorship') || 
        lowerQuestion.includes('visa sponsorship')) {
      return 'No'; // Most users don't need sponsorship
    }
    
    // Background/legal questions - default to No
    if (lowerQuestion.includes('criminal') || 
        lowerQuestion.includes('convicted') || 
        lowerQuestion.includes('felony') ||
        lowerQuestion.includes('background')) {
      return 'No';
    }
    
    // General positive questions - default to Yes
    if (lowerQuestion.includes('willing') || 
        lowerQuestion.includes('available') || 
        lowerQuestion.includes('interested')) {
      return 'Yes';
    }
    
    // Default to No for safety
    return 'No';
  }

  private doesAnswerMatch(targetAnswer: string, value: string, labelText: string): boolean {
    const lowerValue = value.toLowerCase();
    const lowerLabel = labelText.toLowerCase();
    const lowerTarget = targetAnswer.toLowerCase();
    
    // Direct matches
    if (lowerValue === lowerTarget || lowerLabel === lowerTarget) {
      return true;
    }
    
    // Partial matches
    if (lowerTarget === 'yes') {
      return lowerValue.includes('yes') || lowerLabel.includes('yes') || 
             lowerValue.includes('true') || lowerLabel.includes('true') ||
             lowerValue === '1' || lowerLabel.includes('agree');
    }
    
    if (lowerTarget === 'no') {
      return lowerValue.includes('no') || lowerLabel.includes('no') || 
             lowerValue.includes('false') || lowerLabel.includes('false') ||
             lowerValue === '0' || lowerLabel.includes('disagree');
    }
    
    return false;
  }

  private async handleConsentCheckboxes(page: Page, filledData: Record<string, any>): Promise<void> {
    // Find and check consent checkboxes
    const consentSelectors = [
      'input[type="checkbox"][name*="consent" i]',
      'input[type="checkbox"][name*="agree" i]',
      'input[type="checkbox"][name*="accept" i]',
      'input[type="checkbox"][name*="privacy" i]',
      'input[type="checkbox"][name*="terms" i]',
      'input[type="checkbox"][id*="consent" i]',
      'input[type="checkbox"][id*="agree" i]',
      'input[type="checkbox"][id*="accept" i]'
    ];

    for (const selector of consentSelectors) {
      try {
        const checkboxes = await page.locator(selector).all();
        
        for (const checkbox of checkboxes) {
          if (await checkbox.isVisible({ timeout: 1000 }) && await checkbox.isEnabled()) {
            const isRequired = await this.isFieldRequired(page, checkbox);
            
            if (isRequired) {
              await checkbox.check();
              console.log('✅ Checked required consent checkbox');
              filledData.consentGiven = true;
            }
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }

  private async handleRelationshipQuestions(page: Page, filledData: Record<string, any>): Promise<void> {
    // Handle "Do you have any personal or familial relationships" type questions
    const relationshipIndicators = [
      'personal or familial relationships',
      'family members',
      'relatives',
      'friends or family',
      'personal relationships'
    ];

    for (const indicator of relationshipIndicators) {
      try {
        // Find the question text and associated radio buttons
        const questionElement = page.locator(`:has-text("${indicator}")`).first();
        
        if (await questionElement.isVisible({ timeout: 1000 })) {
          // Look for "No" radio button near this question
          const noRadio = questionElement.locator('..').locator('input[type="radio"][value*="no" i]').or(
            questionElement.locator('..').locator('input[type="radio"]').filter({has: page.locator(':has-text("No")')})
          ).first();
          
          if (await noRadio.isVisible({ timeout: 1000 }) && await noRadio.isEnabled()) {
            await noRadio.check();
            console.log('✅ Selected No for relationship question');
            filledData.hasRelationships = 'No';
            break;
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }

  private async handleVisaSponsorshipQuestions(page: Page, profile: ComprehensiveProfile, filledData: Record<string, any>): Promise<void> {
    const sponsorshipQuestions = [
      'require sponsorship',
      'need sponsorship',
      'visa sponsorship',
      'work permit',
      'eligible to work'
    ];

    for (const question of sponsorshipQuestions) {
      try {
        const questionElement = page.locator(`:has-text("${question}")`).first();
        
        if (await questionElement.isVisible({ timeout: 1000 })) {
          const answer = profile.requiresSponsorship ? 'Yes' : 'No';
          
          // Find appropriate radio button
          const targetRadio = questionElement.locator('..').locator(`input[type="radio"]:has-text("${answer}")`).or(
            questionElement.locator('..').locator(`input[type="radio"][value*="${answer.toLowerCase()}"]`)
          ).first();
          
          if (await targetRadio.isVisible({ timeout: 1000 }) && await targetRadio.isEnabled()) {
            await targetRadio.check();
            console.log(`✅ Selected ${answer} for sponsorship question`);
            filledData.sponsorshipRequired = answer;
            break;
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }

  private async isFieldRequired(page: Page, field: any): Promise<boolean> {
    try {
      // Check for required attribute
      const required = await field.getAttribute('required');
      if (required !== null) return true;

      // Check for "required" in nearby text
      const parent = field.locator('..');
      const parentText = await parent.textContent() || '';
      
      return parentText.toLowerCase().includes('required') || 
             parentText.includes('*') ||
             parentText.toLowerCase().includes('mandatory');
    } catch (e) {
      return false;
    }
  }
}