import { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

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

interface ApplicationResult {
  success: boolean;
  message?: string;
  errorDetails?: string;
}

abstract class PlatformHandler {
  abstract apply(page: Page, data: ApplicationData): Promise<ApplicationResult>;

  protected async saveFileTemporarily(file: Express.Multer.File): Promise<string> {
    const tempDir = '/tmp';
    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = path.join(tempDir, fileName);
    
    await fs.promises.writeFile(filePath, file.buffer);
    return filePath;
  }

  protected async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to cleanup file: ${filePath}`, error);
    }
  }

  protected async fillBasicFields(page: Page, profile: ApplicationData['profile']): Promise<void> {
    // Common field selectors for name, email, phone
    const nameSelectors = [
      'input[name*="name"]',
      'input[name*="first"]',
      'input[id*="name"]',
      'input[placeholder*="name"]'
    ];

    const emailSelectors = [
      'input[name*="email"]',
      'input[type="email"]',
      'input[id*="email"]',
      'input[placeholder*="email"]'
    ];

    const phoneSelectors = [
      'input[name*="phone"]',
      'input[type="tel"]',
      'input[id*="phone"]',
      'input[placeholder*="phone"]'
    ];

    // Fill name
    for (const selector of nameSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await element.fill(profile.name);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // Fill email
    for (const selector of emailSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await element.fill(profile.email);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // Fill phone
    for (const selector of phoneSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await element.fill(profile.phone);
          break;
        }
      } catch (error) {
        continue;
      }
    }
  }

  protected async uploadResume(page: Page, resumePath: string): Promise<boolean> {
    const fileSelectors = [
      'input[type="file"]',
      'input[name*="resume"]',
      'input[name*="cv"]',
      'input[accept*=".pdf"]'
    ];

    for (const selector of fileSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await element.setInputFiles(resumePath);
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    return false;
  }
}

class GreenhouseHandler extends PlatformHandler {
  async apply(page: Page, data: ApplicationData): Promise<ApplicationResult> {
    try {
      // Wait for Greenhouse form to load
      await page.waitForSelector('.application-form, form[data-qa="application-form"]', { timeout: 10000 });

      // Fill basic fields
      await this.fillBasicFields(page, data.profile);

      // Save resume file temporarily
      const resumePath = await this.saveFileTemporarily(data.resumeFile);

      try {
        // Upload resume
        const resumeUploaded = await this.uploadResume(page, resumePath);
        if (!resumeUploaded) {
          throw new Error('Failed to upload resume');
        }

        // Wait a bit for file upload
        await page.waitForTimeout(2000);

        // Find and click submit button
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button[data-qa="submit-application"]',
          '.btn-submit'
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
          try {
            const element = await page.$(selector);
            if (element && await element.isVisible() && await element.isEnabled()) {
              await element.click();
              submitted = true;
              break;
            }
          } catch (error) {
            continue;
          }
        }

        if (!submitted) {
          throw new Error('Could not find submit button');
        }

        // Wait for submission confirmation
        await page.waitForTimeout(3000);

        // Check for success indicators
        const successSelectors = [
          '.success-message',
          '.confirmation',
          '[data-qa="application-success"]'
        ];

        for (const selector of successSelectors) {
          const element = await page.$(selector);
          if (element && await element.isVisible()) {
            return { success: true, message: 'Application submitted successfully' };
          }
        }

        // Check for error messages
        const errorElement = await page.$('.error-message, .alert-danger');
        if (errorElement) {
          const errorText = await errorElement.textContent();
          throw new Error(`Application error: ${errorText}`);
        }

        return { success: true, message: 'Application appears to have been submitted' };

      } finally {
        await this.cleanupFile(resumePath);
      }

    } catch (error) {
      return {
        success: false,
        message: 'Failed to submit application on Greenhouse',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

class LeverHandler extends PlatformHandler {
  async apply(page: Page, data: ApplicationData): Promise<ApplicationResult> {
    try {
      // Wait for Lever form to load
      await page.waitForSelector('.application-form, form.application', { timeout: 10000 });

      // Fill basic fields
      await this.fillBasicFields(page, data.profile);

      const resumePath = await this.saveFileTemporarily(data.resumeFile);

      try {
        const resumeUploaded = await this.uploadResume(page, resumePath);
        if (!resumeUploaded) {
          throw new Error('Failed to upload resume');
        }

        await page.waitForTimeout(2000);

        // Submit application
        const submitButton = await page.$('button[type="submit"], .submit-btn');
        if (!submitButton) {
          throw new Error('Submit button not found');
        }

        await submitButton.click();
        await page.waitForTimeout(3000);

        return { success: true, message: 'Application submitted successfully' };

      } finally {
        await this.cleanupFile(resumePath);
      }

    } catch (error) {
      return {
        success: false,
        message: 'Failed to submit application on Lever',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

class GenericHandler extends PlatformHandler {
  async apply(page: Page, data: ApplicationData): Promise<ApplicationResult> {
    try {
      // Generic form handling
      await page.waitForTimeout(3000);

      await this.fillBasicFields(page, data.profile);

      const resumePath = await this.saveFileTemporarily(data.resumeFile);

      try {
        const resumeUploaded = await this.uploadResume(page, resumePath);
        if (!resumeUploaded) {
          throw new Error('Failed to upload resume');
        }

        await page.waitForTimeout(2000);

        // Try to find and click submit button
        const submitButton = await page.$('button[type="submit"], input[type="submit"], .submit, .apply-btn');
        if (submitButton && await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(3000);
          return { success: true, message: 'Application submitted' };
        }

        throw new Error('Submit button not found');

      } finally {
        await this.cleanupFile(resumePath);
      }

    } catch (error) {
      return {
        success: false,
        message: 'Failed to submit application',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export class PlatformHandlers {
  private handlers: Map<string, PlatformHandler>;

  constructor() {
    this.handlers = new Map([
      ['Greenhouse', new GreenhouseHandler()],
      ['Lever', new LeverHandler()],
      ['Generic', new GenericHandler()]
    ]);
  }

  getHandler(platform: string): PlatformHandler | null {
    return this.handlers.get(platform) || this.handlers.get('Generic') || null;
  }
}
