import { chromium, Browser, Page } from 'playwright';
import { ApplicationHistoryItem, ApplyJobResponse } from '@shared/schema';
import { PlatformHandlers } from './platform-handlers.js';
import { randomUUID } from 'crypto';

interface ApplicationData {
  jobUrl: string;
  profile: {
    name: string;
    email: string;
    phone: string;
  };
  resumeFile: Express.Multer.File;
  coverLetterFile?: Express.Multer.File;
}

export class AutomationService {
  private platformHandlers: PlatformHandlers;

  constructor() {
    this.platformHandlers = new PlatformHandlers();
  }

  detectPlatform(jobUrl: string): string {
    if (jobUrl.includes('greenhouse.io')) return 'Greenhouse';
    if (jobUrl.includes('lever.co')) return 'Lever';
    if (jobUrl.includes('workday.com')) return 'Workday';
    if (jobUrl.includes('bamboohr.com')) return 'BambooHR';
    if (jobUrl.includes('smartrecruiters.com')) return 'SmartRecruiters';
    if (jobUrl.includes('jobvite.com')) return 'Jobvite';
    if (jobUrl.includes('icims.com')) return 'iCIMS';
    return 'Unknown Platform';
  }

  async applyToJob(applicationData: ApplicationData): Promise<ApplyJobResponse> {
    let browser: Browser | null = null;
    let page: Page | null = null;
    const applicationId = randomUUID();

    try {
      // Launch browser
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });

      // Navigate to job page
      console.log(`Navigating to: ${applicationData.jobUrl}`);
      await page.goto(applicationData.jobUrl, { waitUntil: 'networkidle' });

      // Detect platform and get appropriate handler
      const platform = this.detectPlatform(applicationData.jobUrl);
      const handler = this.platformHandlers.getHandler(platform);

      if (!handler) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Apply using platform-specific handler
      const result = await handler.apply(page, applicationData);

      if (result.success) {
        return {
          success: true,
          message: `Successfully applied to job on ${platform}`,
          applicationId,
          submissionConfirmed: result.submissionConfirmed || false
        };
      } else {
        return {
          success: false,
          message: result.message || `Failed to apply on ${platform}`,
          applicationId,
          errorDetails: result.errorDetails,
          submissionConfirmed: false
        };
      }

    } catch (error) {
      console.error('Automation error:', error);
      return {
        success: false,
        message: 'Failed to process job application',
        applicationId,
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
        submissionConfirmed: false
      };
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }
}
