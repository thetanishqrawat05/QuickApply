import { chromium, Browser, Page } from 'playwright';

export class RobustBrowserService {
  private browser: Browser | null = null;

  async launchBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    try {
      // Try with minimal dependencies first
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
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-component-extensions-with-background-pages',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--disable-features=TranslateUI',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-software-rasterizer',
          '--disable-sync',
          '--disable-web-security',
          '--enable-automation',
          '--enable-blink-features=IdleDetection',
          '--export-tagged-pdf',
          '--generate-pdf-document-outline',
          '--no-pings',
          '--password-store=basic',
          '--use-mock-keychain'
        ],
        chromiumSandbox: false,
        timeout: 30000
      });

      console.log('✅ Browser launched successfully');
      return this.browser;

    } catch (error) {
      console.error('Failed to launch browser:', error);
      
      // Try alternative launch with even more permissive settings
      try {
        this.browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          chromiumSandbox: false,
          timeout: 60000
        });
        
        console.log('✅ Browser launched with fallback settings');
        return this.browser;
        
      } catch (fallbackError) {
        console.error('Browser launch failed completely:', fallbackError);
        throw new Error('BROWSER_UNAVAILABLE: Cannot launch browser in this environment');
      }
    }
  }

  async createPage(): Promise<Page> {
    const browser = await this.launchBrowser();
    const page = await browser.newPage();
    
    // Set realistic user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Set viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    return page;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('✅ Browser closed');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.launchBrowser();
      return true;
    } catch (error) {
      return false;
    }
  }
}