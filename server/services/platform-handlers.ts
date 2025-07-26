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
  submissionConfirmed?: boolean;
  retryable?: boolean;
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

  protected async fillBasicFields(page: Page, profile: ApplicationData['profile']): Promise<{ nameField: boolean; emailField: boolean; phoneField: boolean }> {
    const result = { nameField: false, emailField: false, phoneField: false };

    // Enhanced field selectors with better patterns
    const nameSelectors = [
      'input[name*="first_name"]',
      'input[name*="firstName"]',
      'input[name*="first"]',
      'input[name*="name"]',
      'input[id*="first"]',
      'input[id*="name"]',
      'input[placeholder*="First name"]',
      'input[placeholder*="Name"]'
    ];

    const emailSelectors = [
      'input[name*="email"]',
      'input[type="email"]',
      'input[id*="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="Email"]'
    ];

    const phoneSelectors = [
      'input[name*="phone"]',
      'input[name*="mobile"]',
      'input[type="tel"]',
      'input[id*="phone"]',
      'input[id*="mobile"]',
      'input[placeholder*="phone"]',
      'input[placeholder*="Phone"]'
    ];

    // Fill name with validation
    for (const selector of nameSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible() && await element.isEnabled()) {
          await element.fill('');
          await element.fill(profile.name);
          await page.waitForTimeout(500);
          
          // Verify the field was filled
          const value = await element.inputValue();
          if (value === profile.name) {
            result.nameField = true;
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }

    // Fill email with validation
    for (const selector of emailSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible() && await element.isEnabled()) {
          await element.fill('');
          await element.fill(profile.email);
          await page.waitForTimeout(500);
          
          // Verify the field was filled
          const value = await element.inputValue();
          if (value === profile.email) {
            result.emailField = true;
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }

    // Fill phone with validation
    for (const selector of phoneSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible() && await element.isEnabled()) {
          await element.fill('');
          await element.fill(profile.phone);
          await page.waitForTimeout(500);
          
          // Verify the field was filled
          const value = await element.inputValue();
          if (value === profile.phone) {
            result.phoneField = true;
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }

    return result;
  }

  protected async uploadResume(page: Page, resumePath: string): Promise<boolean> {
    const fileSelectors = [
      'input[type="file"][name*="resume"]',
      'input[type="file"][name*="cv"]',
      'input[type="file"][id*="resume"]',
      'input[type="file"][accept*=".pdf"]',
      'input[type="file"]'
    ];

    for (const selector of fileSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          await element.setInputFiles(resumePath);
          
          // Wait for file upload to complete
          await page.waitForTimeout(2000);
          
          // Verify upload success by checking if the file input has a value
          const files = await element.inputValue();
          if (files) {
            return true;
          }
        }
      } catch (error) {
        continue;
      }
    }
    return false;
  }

  protected async verifySubmissionSuccess(page: Page): Promise<{ confirmed: boolean; message: string }> {
    // Wait for page transition or success message
    await page.waitForTimeout(3000);

    // Check for common success indicators
    const successSelectors = [
      '.success-message',
      '.thank-you',
      '.confirmation',
      '.application-submitted',
      '[data-qa="application-success"]',
      '[data-testid="success"]',
      '.alert-success',
      '.notification.success',
      'h1:has-text("Thank you")',
      'h2:has-text("Application")',
      '.success',
      '[class*="success"]'
    ];

    for (const selector of successSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          const text = await element.textContent();
          if (text && (
            text.toLowerCase().includes('thank you') ||
            text.toLowerCase().includes('success') ||
            text.toLowerCase().includes('submitted') ||
            text.toLowerCase().includes('received') ||
            text.toLowerCase().includes('application complete')
          )) {
            return { 
              confirmed: true, 
              message: `Submission confirmed: ${text.substring(0, 100)}` 
            };
          }
        }
      } catch (error) {
        continue;
      }
    }

    // Check URL for success indicators
    const currentUrl = page.url();
    if (currentUrl.includes('thank') || 
        currentUrl.includes('success') || 
        currentUrl.includes('complete') ||
        currentUrl.includes('confirmation')) {
      return { 
        confirmed: true, 
        message: 'Success page detected in URL' 
      };
    }

    // Check page title
    const title = await page.title();
    if (title.toLowerCase().includes('thank') || 
        title.toLowerCase().includes('success') ||
        title.toLowerCase().includes('complete')) {
      return { 
        confirmed: true, 
        message: `Success indicated in page title: ${title}` 
      };
    }

    return { 
      confirmed: false, 
      message: 'Could not confirm submission success' 
    };
  }
}

class GreenhouseHandler extends PlatformHandler {
  async apply(page: Page, data: ApplicationData): Promise<ApplicationResult> {
    try {
      // Wait for Greenhouse form to load with retry
      let formFound = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await page.waitForSelector('.application-form, form[data-qa="application-form"], form', { timeout: 10000 });
          formFound = true;
          break;
        } catch (error) {
          if (attempt === 2) throw error;
          await page.waitForTimeout(2000);
        }
      }

      if (!formFound) {
        throw new Error('Application form not found');
      }

      // Fill basic fields with validation
      const fieldResults = await this.fillBasicFields(page, data.profile);
      
      if (!fieldResults.nameField || !fieldResults.emailField) {
        return {
          success: false,
          message: 'Failed to fill required fields',
          errorDetails: `Name: ${fieldResults.nameField}, Email: ${fieldResults.emailField}, Phone: ${fieldResults.phoneField}`,
          retryable: true
        };
      }

      // Save resume file temporarily
      const resumePath = await this.saveFileTemporarily(data.resumeFile);

      try {
        // Upload resume with retry
        let resumeUploaded = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          resumeUploaded = await this.uploadResume(page, resumePath);
          if (resumeUploaded) break;
          await page.waitForTimeout(1000);
        }

        if (!resumeUploaded) {
          return {
            success: false,
            message: 'Failed to upload resume after multiple attempts',
            retryable: true
          };
        }

        // Wait for file processing
        await page.waitForTimeout(3000);

        // Find and click submit button with better selectors
        const submitSelectors = [
          'button[type="submit"]:visible',
          'input[type="submit"]:visible',
          'button[data-qa="submit-application"]',
          'button:has-text("Submit Application")',
          'button:has-text("Apply")',
          '.btn-submit:visible'
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
          try {
            const elements = await page.$$(selector);
            for (const element of elements) {
              if (await element.isVisible() && await element.isEnabled()) {
                await element.scrollIntoViewIfNeeded();
                await element.click();
                submitted = true;
                break;
              }
            }
            if (submitted) break;
          } catch (error) {
            continue;
          }
        }

        if (!submitted) {
          return {
            success: false,
            message: 'Could not find or click submit button',
            retryable: false
          };
        }

        // Verify submission success
        const verification = await this.verifySubmissionSuccess(page);
        
        return {
          success: true,
          message: verification.confirmed ? verification.message : 'Application submitted (confirmation pending)',
          submissionConfirmed: verification.confirmed,
          retryable: false
        };

      } finally {
        await this.cleanupFile(resumePath);
      }

    } catch (error) {
      return {
        success: false,
        message: 'Failed to submit application on Greenhouse',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      };
    }
  }
}

class LeverHandler extends PlatformHandler {
  async apply(page: Page, data: ApplicationData): Promise<ApplicationResult> {
    try {
      // Wait for Lever form to load with retry
      let formFound = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await page.waitForSelector('.application-form, form.application, form', { timeout: 10000 });
          formFound = true;
          break;
        } catch (error) {
          if (attempt === 2) throw error;
          await page.waitForTimeout(2000);
        }
      }

      if (!formFound) {
        throw new Error('Application form not found');
      }

      // Fill basic fields with validation
      const fieldResults = await this.fillBasicFields(page, data.profile);
      
      if (!fieldResults.nameField || !fieldResults.emailField) {
        return {
          success: false,
          message: 'Failed to fill required fields',
          errorDetails: `Name: ${fieldResults.nameField}, Email: ${fieldResults.emailField}, Phone: ${fieldResults.phoneField}`,
          retryable: true
        };
      }

      const resumePath = await this.saveFileTemporarily(data.resumeFile);

      try {
        // Upload resume with retry
        let resumeUploaded = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          resumeUploaded = await this.uploadResume(page, resumePath);
          if (resumeUploaded) break;
          await page.waitForTimeout(1000);
        }

        if (!resumeUploaded) {
          return {
            success: false,
            message: 'Failed to upload resume after multiple attempts',
            retryable: true
          };
        }

        await page.waitForTimeout(3000);

        // Submit application with better button detection
        const submitSelectors = [
          'button[type="submit"]:visible',
          'button:has-text("Submit")',
          'button:has-text("Apply")',
          '.submit-btn:visible'
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
          try {
            const element = await page.$(selector);
            if (element && await element.isVisible() && await element.isEnabled()) {
              await element.scrollIntoViewIfNeeded();
              await element.click();
              submitted = true;
              break;
            }
          } catch (error) {
            continue;
          }
        }

        if (!submitted) {
          return {
            success: false,
            message: 'Could not find or click submit button',
            retryable: false
          };
        }

        // Verify submission success
        const verification = await this.verifySubmissionSuccess(page);
        
        return {
          success: true,
          message: verification.confirmed ? verification.message : 'Application submitted (confirmation pending)',
          submissionConfirmed: verification.confirmed,
          retryable: false
        };

      } finally {
        await this.cleanupFile(resumePath);
      }

    } catch (error) {
      return {
        success: false,
        message: 'Failed to submit application on Lever',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
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
