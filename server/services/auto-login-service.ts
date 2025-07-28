import { Page } from 'playwright';

export interface LoginCredentials {
  email?: string;
  password?: string;
  method: 'email' | 'google' | 'linkedin' | 'manual';
}

export class AutoLoginService {
  
  async performAutoLogin(page: Page, credentials: LoginCredentials, jobUrl: string): Promise<boolean> {
    try {
      const domain = new URL(jobUrl).hostname;
      
      // Check if already logged in
      if (await this.isAlreadyLoggedIn(page)) {
        console.log('✅ Already logged in');
        return true;
      }

      // Look for login buttons or links
      const loginSelectors = [
        'a[href*="login"]',
        'a[href*="signin"]', 
        'button:has-text("Sign In")',
        'button:has-text("Log In")',
        'button:has-text("Login")',
        '[data-testid*="login"]',
        '[class*="login"]',
        '[id*="login"]'
      ];

      let loginFound = false;
      for (const selector of loginSelectors) {
        try {
          const loginElement = await page.locator(selector).first();
          if (await loginElement.isVisible({ timeout: 2000 })) {
            console.log(`🔍 Found login element: ${selector}`);
            await loginElement.click();
            loginFound = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!loginFound) {
        console.log('❌ No login element found');
        return false;
      }

      // Wait for login page to load
      await page.waitForTimeout(2000);

      // Handle different login methods
      switch (credentials.method) {
        case 'google':
          return await this.handleGoogleLogin(page, credentials.email!, credentials.password!);
        case 'linkedin':
          return await this.handleLinkedInLogin(page, credentials.email!, credentials.password!);
        case 'email':
        default:
          return await this.handleEmailPasswordLogin(page, credentials.email!, credentials.password!);
      }

    } catch (error) {
      console.error('Auto-login error:', error);
      return false;
    }
  }

  private async isAlreadyLoggedIn(page: Page): Promise<boolean> {
    // Common indicators of being logged in
    const loggedInSelectors = [
      '[data-testid*="user"]',
      '[class*="user-menu"]',
      '[class*="profile"]',
      'button:has-text("Profile")',
      'button:has-text("Account")',
      'a:has-text("Dashboard")',
      'a:has-text("My Account")',
      '[class*="avatar"]',
      '[data-testid*="avatar"]'
    ];

    for (const selector of loggedInSelectors) {
      try {
        if (await page.locator(selector).first().isVisible({ timeout: 1000 })) {
          return true;
        }
      } catch (e) {
        // Continue checking
      }
    }
    return false;
  }

  private async handleEmailPasswordLogin(page: Page, email: string, password: string): Promise<boolean> {
    try {
      // Find email field
      const emailSelectors = [
        'input[type="email"]',
        'input[name*="email"]',
        'input[id*="email"]',
        'input[placeholder*="email" i]',
        'input[name*="username"]',
        'input[id*="username"]'
      ];

      let emailField = null;
      for (const selector of emailSelectors) {
        try {
          emailField = page.locator(selector).first();
          if (await emailField.isVisible({ timeout: 2000 })) {
            break;
          }
        } catch (e) {
          emailField = null;
        }
      }

      if (!emailField) {
        console.log('❌ Email field not found');
        return false;
      }

      await emailField.fill(email);
      console.log('✅ Email filled');

      // Find password field
      const passwordSelectors = [
        'input[type="password"]',
        'input[name*="password"]',
        'input[id*="password"]',
        'input[placeholder*="password" i]'
      ];

      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = page.locator(selector).first();
          if (await passwordField.isVisible({ timeout: 2000 })) {
            break;
          }
        } catch (e) {
          passwordField = null;
        }
      }

      if (!passwordField) {
        console.log('❌ Password field not found');
        return false;
      }

      await passwordField.fill(password);
      console.log('✅ Password filled');

      // Find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Sign In")',
        'button:has-text("Log In")',
        'button:has-text("Login")',
        '[data-testid*="submit"]',
        '[data-testid*="login"]'
      ];

      for (const selector of submitSelectors) {
        try {
          const submitButton = page.locator(selector).first();
          if (await submitButton.isVisible({ timeout: 2000 })) {
            await submitButton.click();
            console.log('✅ Login form submitted');
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Wait for login to complete
      await page.waitForTimeout(3000);
      
      // Check if login was successful
      return await this.isAlreadyLoggedIn(page);

    } catch (error) {
      console.error('Email/password login error:', error);
      return false;
    }
  }

  private async handleGoogleLogin(page: Page, email: string, password: string): Promise<boolean> {
    try {
      // Look for Google login button
      const googleSelectors = [
        'button:has-text("Sign in with Google")',
        'button:has-text("Continue with Google")',
        'a:has-text("Sign in with Google")',
        '[data-testid*="google"]',
        '[class*="google"]'
      ];

      let googleButton = null;
      for (const selector of googleSelectors) {
        try {
          googleButton = page.locator(selector).first();
          if (await googleButton.isVisible({ timeout: 2000 })) {
            break;
          }
        } catch (e) {
          googleButton = null;
        }
      }

      if (!googleButton) {
        console.log('❌ Google login button not found');
        return false;
      }

      await googleButton.click();
      console.log('✅ Google login button clicked');

      // Wait for Google OAuth popup or redirect
      await page.waitForTimeout(3000);

      // Handle Google OAuth flow (simplified)
      const currentUrl = page.url();
      if (currentUrl.includes('accounts.google.com')) {
        // Fill in Google login form
        try {
          await page.fill('input[type="email"]', email);
          await page.click('button:has-text("Next")');
          await page.waitForTimeout(2000);
          
          await page.fill('input[type="password"]', password);
          await page.click('button:has-text("Next")');
          await page.waitForTimeout(3000);
        } catch (e) {
          console.log('Google OAuth flow error:', e);
        }
      }

      // Return to original site and check login status
      if (!page.url().includes(new URL(page.url()).hostname)) {
        await page.waitForNavigation({ timeout: 10000 });
      }

      return await this.isAlreadyLoggedIn(page);

    } catch (error) {
      console.error('Google login error:', error);
      return false;
    }
  }

  private async handleLinkedInLogin(page: Page, email: string, password: string): Promise<boolean> {
    try {
      // Look for LinkedIn login button
      const linkedinSelectors = [
        'button:has-text("Sign in with LinkedIn")',
        'button:has-text("Continue with LinkedIn")',
        'a:has-text("Sign in with LinkedIn")',
        '[data-testid*="linkedin"]',
        '[class*="linkedin"]'
      ];

      let linkedinButton = null;
      for (const selector of linkedinSelectors) {
        try {
          linkedinButton = page.locator(selector).first();
          if (await linkedinButton.isVisible({ timeout: 2000 })) {
            break;
          }
        } catch (e) {
          linkedinButton = null;
        }
      }

      if (!linkedinButton) {
        console.log('❌ LinkedIn login button not found');
        return false;
      }

      await linkedinButton.click();
      await page.waitForTimeout(3000);

      // Handle LinkedIn OAuth flow
      const currentUrl = page.url();
      if (currentUrl.includes('linkedin.com/oauth')) {
        try {
          await page.fill('input[name="session_key"]', email);
          await page.fill('input[name="session_password"]', password);
          await page.click('button[type="submit"]');
          await page.waitForTimeout(3000);
        } catch (e) {
          console.log('LinkedIn OAuth flow error:', e);
        }
      }

      return await this.isAlreadyLoggedIn(page);

    } catch (error) {
      console.error('LinkedIn login error:', error);
      return false;
    }
  }

  async detectCaptcha(page: Page): Promise<boolean> {
    const captchaSelectors = [
      '[class*="captcha"]',
      '[id*="captcha"]',
      'iframe[src*="recaptcha"]',
      '.g-recaptcha',
      '[data-testid*="captcha"]',
      'img[alt*="captcha" i]'
    ];

    for (const selector of captchaSelectors) {
      try {
        if (await page.locator(selector).first().isVisible({ timeout: 1000 })) {
          console.log('🤖 CAPTCHA detected');
          return true;
        }
      } catch (e) {
        // Continue checking
      }
    }
    return false;
  }
}