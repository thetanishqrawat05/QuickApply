import { Page } from 'playwright';

export interface LoginCredentials {
  email: string;
  password: string;
  method: 'email' | 'google' | 'linkedin' | 'manual';
}

export class EnhancedAutoLoginService {
  async performAutoLogin(page: Page, credentials: LoginCredentials, jobUrl: string): Promise<boolean> {
    console.log('🔑 Starting enhanced auto-login process...');
    
    try {
      // First, check if we're already logged in
      if (await this.isAlreadyLoggedIn(page)) {
        console.log('✅ Already logged in, proceeding...');
        return true;
      }

      // Look for login entry points
      const loginSuccess = await this.findAndClickLoginButton(page);
      if (!loginSuccess) {
        console.log('❌ Could not find login button');
        return false;
      }

      await page.waitForTimeout(2000);

      // Handle different login methods
      switch (credentials.method) {
        case 'google':
          return await this.handleGoogleLogin(page, credentials);
        case 'linkedin':
          return await this.handleLinkedInLogin(page, credentials);
        default:
          return await this.handleEmailPasswordLogin(page, credentials);
      }
    } catch (error) {
      console.log('Login error:', error);
      return false;
    }
  }

  private async isAlreadyLoggedIn(page: Page): Promise<boolean> {
    const loggedInIndicators = [
      ':has-text("Sign out")',
      ':has-text("Logout")',
      ':has-text("Profile")',
      ':has-text("Dashboard")',
      '[data-testid*="user-menu"]',
      '.user-avatar',
      '.profile-image'
    ];

    for (const indicator of loggedInIndicators) {
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

  private async findAndClickLoginButton(page: Page): Promise<boolean> {
    const loginSelectors = [
      'button:has-text("Sign in")',
      'a:has-text("Sign in")',
      'button:has-text("Log in")',
      'a:has-text("Log in")',
      'button:has-text("Login")',
      'a:has-text("Login")',
      'button:has-text("Get started")',
      'a:has-text("Get started")',
      '[data-testid*="signin"]',
      '[data-testid*="login"]',
      '.signin-btn',
      '.login-btn',
      '#signin',
      '#login'
    ];

    for (const selector of loginSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`Found login button: ${selector}`);
          await element.click();
          return true;
        }
      } catch (e) {
        // Continue
      }
    }
    return false;
  }

  private async handleEmailPasswordLogin(page: Page, credentials: LoginCredentials): Promise<boolean> {
    console.log('📧 Handling email/password login...');
    
    // Fill email field
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email" i]',
      'input[name="username"]',
      'input[id="username"]'
    ];

    let emailFilled = false;
    for (const selector of emailSelectors) {
      try {
        const emailField = page.locator(selector).first();
        if (await emailField.isVisible({ timeout: 2000 })) {
          await emailField.fill(credentials.email);
          emailFilled = true;
          console.log('✅ Email filled');
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    if (!emailFilled) {
      console.log('❌ Could not find email field');
      return false;
    }

    // Fill password field
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
      'input[placeholder*="password" i]'
    ];

    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        const passwordField = page.locator(selector).first();
        if (await passwordField.isVisible({ timeout: 2000 })) {
          await passwordField.fill(credentials.password);
          passwordFilled = true;
          console.log('✅ Password filled');
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    if (!passwordFilled) {
      console.log('❌ Could not find password field');
      return false;
    }

    // Click login/submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Log in")',
      'button:has-text("Login")',
      'button:has-text("Continue")',
      '[data-testid*="submit"]',
      '.submit-btn',
      '.login-submit'
    ];

    for (const selector of submitSelectors) {
      try {
        const submitButton = page.locator(selector).first();
        if (await submitButton.isVisible({ timeout: 1000 })) {
          await submitButton.click();
          console.log('✅ Login submitted');
          
          // Wait for login to complete
          await page.waitForTimeout(3000);
          return await this.verifyLoginSuccess(page);
        }
      } catch (e) {
        // Continue
      }
    }

    return false;
  }

  private async handleGoogleLogin(page: Page, credentials: LoginCredentials): Promise<boolean> {
    console.log('🔍 Handling Google OAuth login...');
    
    const googleSelectors = [
      'button:has-text("Continue with Google")',
      'button:has-text("Sign in with Google")',
      'a:has-text("Continue with Google")',
      'a:has-text("Sign in with Google")',
      '[data-testid*="google"]',
      '.google-signin-btn'
    ];

    for (const selector of googleSelectors) {
      try {
        const googleButton = page.locator(selector).first();
        if (await googleButton.isVisible({ timeout: 1000 })) {
          await googleButton.click();
          console.log('✅ Google login button clicked');
          
          // Handle Google OAuth popup or redirect
          await page.waitForTimeout(2000);
          
          // If redirected to Google, fill credentials
          if (page.url().includes('accounts.google.com')) {
            return await this.handleGoogleOAuthFlow(page, credentials);
          }
          
          return true;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Fallback to email/password if Google OAuth not available
    return await this.handleEmailPasswordLogin(page, credentials);
  }

  private async handleGoogleOAuthFlow(page: Page, credentials: LoginCredentials): Promise<boolean> {
    try {
      // Fill Google email
      const emailField = page.locator('input[type="email"]').first();
      if (await emailField.isVisible({ timeout: 3000 })) {
        await emailField.fill(credentials.email);
        await page.locator('button:has-text("Next")').click();
        await page.waitForTimeout(2000);
      }

      // Fill Google password
      const passwordField = page.locator('input[type="password"]').first();
      if (await passwordField.isVisible({ timeout: 3000 })) {
        await passwordField.fill(credentials.password);
        await page.locator('button:has-text("Next")').click();
        await page.waitForTimeout(3000);
      }

      return true;
    } catch (error) {
      console.log('Google OAuth flow error:', error);
      return false;
    }
  }

  private async handleLinkedInLogin(page: Page, credentials: LoginCredentials): Promise<boolean> {
    console.log('💼 Handling LinkedIn login...');
    
    const linkedinSelectors = [
      'button:has-text("Continue with LinkedIn")',
      'button:has-text("Sign in with LinkedIn")',
      'a:has-text("Continue with LinkedIn")',
      'a:has-text("Sign in with LinkedIn")',
      '[data-testid*="linkedin"]',
      '.linkedin-signin-btn'
    ];

    for (const selector of linkedinSelectors) {
      try {
        const linkedinButton = page.locator(selector).first();
        if (await linkedinButton.isVisible({ timeout: 1000 })) {
          await linkedinButton.click();
          console.log('✅ LinkedIn login button clicked');
          await page.waitForTimeout(3000);
          return true;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Fallback to email/password
    return await this.handleEmailPasswordLogin(page, credentials);
  }

  private async verifyLoginSuccess(page: Page): Promise<boolean> {
    // Wait a bit for redirect/page changes
    await page.waitForTimeout(2000);
    
    const successIndicators = [
      ':has-text("Welcome")',
      ':has-text("Dashboard")',
      ':has-text("Profile")',
      ':has-text("Sign out")',
      ':has-text("Logout")',
      '.user-menu',
      '.profile-dropdown'
    ];

    for (const indicator of successIndicators) {
      try {
        if (await page.locator(indicator).first().isVisible({ timeout: 2000 })) {
          console.log('✅ Login verified successful');
          return true;
        }
      } catch (e) {
        // Continue
      }
    }

    // Check if we're no longer on a login page
    const currentUrl = page.url().toLowerCase();
    if (!currentUrl.includes('login') && !currentUrl.includes('signin') && !currentUrl.includes('auth')) {
      console.log('✅ Login appears successful (redirected away from login page)');
      return true;
    }

    console.log('❓ Login success unclear');
    return true; // Assume success and continue
  }
}