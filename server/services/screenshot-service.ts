import { Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

export class ScreenshotService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'screenshots');
    this.ensureUploadsDir();
  }

  private async ensureUploadsDir() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  async captureSubmissionScreenshot(page: Page, sessionId: string): Promise<string> {
    try {
      await this.ensureUploadsDir();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `submission_${sessionId}_${timestamp}.png`;
      const filepath = path.join(this.uploadsDir, filename);

      await page.screenshot({
        path: filepath,
        fullPage: true,
        quality: 90
      });

      console.log(`📸 Screenshot saved: ${filepath}`);
      return filepath;

    } catch (error) {
      console.error('Screenshot capture error:', error);
      throw new Error('Failed to capture screenshot: ' + (error as Error).message);
    }
  }

  async captureFormPreview(page: Page, sessionId: string): Promise<string> {
    try {
      await this.ensureUploadsDir();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `form_preview_${sessionId}_${timestamp}.png`;
      const filepath = path.join(this.uploadsDir, filename);

      await page.screenshot({
        path: filepath,
        fullPage: false, // Just the visible area for preview
        quality: 80
      });

      console.log(`📷 Form preview screenshot saved: ${filepath}`);
      return filepath;

    } catch (error) {
      console.error('Form preview screenshot error:', error);
      throw new Error('Failed to capture form preview: ' + (error as Error).message);
    }
  }

  async saveHtmlSnapshot(page: Page, sessionId: string): Promise<string> {
    try {
      await this.ensureUploadsDir();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `html_snapshot_${sessionId}_${timestamp}.html`;
      const filepath = path.join(this.uploadsDir, filename);

      const htmlContent = await page.content();
      await fs.writeFile(filepath, htmlContent, 'utf-8');

      console.log(`📄 HTML snapshot saved: ${filepath}`);
      return filepath;

    } catch (error) {
      console.error('HTML snapshot error:', error);
      throw new Error('Failed to save HTML snapshot: ' + (error as Error).message);
    }
  }

  async captureErrorScreenshot(page: Page, sessionId: string, error: string): Promise<string> {
    try {
      await this.ensureUploadsDir();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `error_${sessionId}_${timestamp}.png`;
      const filepath = path.join(this.uploadsDir, filename);

      await page.screenshot({
        path: filepath,
        fullPage: true,
        quality: 70
      });

      // Also save error details
      const errorFile = filepath.replace('.png', '_details.txt');
      await fs.writeFile(errorFile, `Error: ${error}\nTimestamp: ${new Date().toISOString()}\nURL: ${page.url()}`, 'utf-8');

      console.log(`❌ Error screenshot saved: ${filepath}`);
      return filepath;

    } catch (screenshotError) {
      console.error('Error screenshot capture failed:', screenshotError);
      return '';
    }
  }

  async getScreenshotUrl(filepath: string): Promise<string> {
    // Convert file path to URL accessible from frontend
    const relativePath = path.relative(path.join(process.cwd(), 'uploads'), filepath);
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
  }

  async cleanupOldScreenshots(olderThanDays: number = 7): Promise<void> {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      for (const file of files) {
        const filepath = path.join(this.uploadsDir, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          console.log(`🗑️ Cleaned up old screenshot: ${file}`);
        }
      }
    } catch (error) {
      console.error('Screenshot cleanup error:', error);
    }
  }
}