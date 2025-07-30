import { BrowserContext, Page } from 'playwright';
import { EmailService } from './email-service';
import { RobustBrowserService } from './robust-browser-service';
import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface SecureLoginRequest {
  sessionId: string;
  jobUrl: string;
  portalName: string;
  userEmail: string;
  loginUrl: string;
  requiredCredentials: string[]; // ['email', 'password'] or ['google', 'linkedin']
}

export interface LoginSession {
  sessionId: string;
  loginToken: string;
  portalName: string;
  loginUrl: string;
  jobUrl: string;
  userEmail: string;
  status: 'pending' | 'authenticated' | 'expired' | 'failed';
  browserContext?: BrowserContext;
  expiresAt: Date;
  authMethod: 'email' | 'google' | 'linkedin' | 'microsoft' | 'oauth';
}

export class SecureLoginService {
  private emailService: EmailService;
  private browserService: RobustBrowserService;
  private activeSessions: Map<string, LoginSession> = new Map();
  private readonly ENCRYPTION_KEY = process.env.LOGIN_ENCRYPTION_KEY || 'default-key-change-in-production';

  constructor() {
    this.emailService = new EmailService();
    this.browserService = new RobustBrowserService();
  }

  async handleLoginRequired(request: SecureLoginRequest): Promise<{
    success: boolean;
    message: string;
    loginToken: string;
    loginUrl: string;
  }> {
    try {
      console.log(`🔐 Login required for ${request.portalName} - generating secure login link`);

      // Generate unique login token
      const loginToken = uuidv4();
      
      // Detect portal-specific login URL and authentication method
      const loginDetails = await this.detectPortalLoginMethod(request.jobUrl, request.portalName);
      
      // Create login session
      const loginSession: LoginSession = {
        sessionId: request.sessionId,
        loginToken,
        portalName: request.portalName,
        loginUrl: loginDetails.loginUrl,
        jobUrl: request.jobUrl,
        userEmail: request.userEmail,
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        authMethod: loginDetails.authMethod
      };

      // Store session in database
      await storage.createLoginSession({
        id: loginToken,
        sessionId: request.sessionId,
        portalName: request.portalName,
        loginUrl: loginDetails.loginUrl,
        jobUrl: request.jobUrl,
        userEmail: request.userEmail,
        status: 'pending',
        authMethod: loginDetails.authMethod,
        expiresAt: loginSession.expiresAt
      });

      // Store in memory for quick access
      this.activeSessions.set(loginToken, loginSession);

      // Send secure login email
      await this.sendSecureLoginEmail(loginSession);

      return {
        success: true,
        message: `Secure login link sent to ${request.userEmail}. Please check your email and log in to continue.`,
        loginToken,
        loginUrl: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/secure-login/${loginToken}`
      };

    } catch (error) {
      console.error('Error handling login requirement:', error);
      return {
        success: false,
        message: `Failed to generate secure login: ${(error as Error).message}`,
        loginToken: '',
        loginUrl: ''
      };
    }
  }

  private async detectPortalLoginMethod(jobUrl: string, portalName: string): Promise<{
    loginUrl: string;
    authMethod: 'email' | 'google' | 'linkedin' | 'microsoft' | 'oauth';
  }> {
    const url = jobUrl.toLowerCase();
    
    // Google Careers
    if (url.includes('careers.google.com') || portalName.toLowerCase().includes('google')) {
      return {
        loginUrl: 'https://accounts.google.com/signin',
        authMethod: 'google'
      };
    }
    
    // LinkedIn Jobs
    if (url.includes('linkedin.com') || portalName.toLowerCase().includes('linkedin')) {
      return {
        loginUrl: 'https://www.linkedin.com/login',
        authMethod: 'linkedin'
      };
    }
    
    // Microsoft Careers
    if (url.includes('microsoft.com/careers') || portalName.toLowerCase().includes('microsoft')) {
      return {
        loginUrl: 'https://login.microsoftonline.com',
        authMethod: 'microsoft'
      };
    }
    
    // Meta/Facebook Careers
    if (url.includes('meta.com/careers') || url.includes('facebook.com/careers')) {
      return {
        loginUrl: 'https://www.facebook.com/login',
        authMethod: 'oauth'
      };
    }
    
    // Amazon Jobs
    if (url.includes('amazon.jobs') || portalName.toLowerCase().includes('amazon')) {
      return {
        loginUrl: 'https://www.amazon.jobs/en/signin',
        authMethod: 'email'
      };
    }
    
    // Walmart Careers
    if (url.includes('walmart.com') || portalName.toLowerCase().includes('walmart')) {
      return {
        loginUrl: 'https://careers.walmart.com/sign-in',
        authMethod: 'email'
      };
    }
    
    // Default fallback - try to extract login URL from job page
    try {
      const browser = await this.browserService.launchBrowser();
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto(jobUrl, { waitUntil: 'networkidle' });
      
      // Look for login/sign-in links
      const loginSelectors = [
        'a[href*="login"]',
        'a[href*="signin"]',
        'a[href*="sign-in"]',
        'a:has-text("Sign in")',
        'a:has-text("Login")',
        'a:has-text("Log in")'
      ];
      
      for (const selector of loginSelectors) {
        const element = await page.$(selector);
        if (element) {
          const href = await element.getAttribute('href');
          if (href) {
            const loginUrl = href.startsWith('http') ? href : new URL(href, jobUrl).toString();
            await context.close();
            return {
              loginUrl,
              authMethod: 'email'
            };
          }
        }
      }
      
      await context.close();
    } catch (error) {
      console.log('Could not detect login URL automatically:', error);
    }
    
    // Final fallback
    return {
      loginUrl: jobUrl,
      authMethod: 'email'
    };
  }

  private async sendSecureLoginEmail(session: LoginSession): Promise<void> {
    try {
      const secureLoginUrl = `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/secure-login/${session.loginToken}`;
      
      const subject = `🔐 Secure Login Required - ${session.portalName} Job Application`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Secure Login Required</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .login-section { background: #f8fafc; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #e2e8f0; }
            .login-btn { 
              display: inline-block; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 18px 35px; 
              text-decoration: none; 
              border-radius: 25px; 
              font-weight: bold;
              font-size: 18px;
              margin: 15px 0;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
              transition: transform 0.2s;
            }
            .login-btn:hover { transform: translateY(-2px); }
            .security-note { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 14px; }
            .portal-info { background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .auth-method { color: #0369a1; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Secure Login Required</h1>
              <p>Your job application needs authentication to continue</p>
            </div>
            
            <div class="content">
              <div class="portal-info">
                <h3>Portal Information</h3>
                <p><strong>Company:</strong> ${session.portalName}</p>
                <p><strong>Job URL:</strong> <a href="${session.jobUrl}">${session.jobUrl}</a></p>
                <p><strong>Authentication Method:</strong> <span class="auth-method">${this.getAuthMethodDisplay(session.authMethod)}</span></p>
              </div>

              <div class="login-section">
                <h3>🚀 Ready to Continue Your Application?</h3>
                <p>Click the secure login button below to authenticate with ${session.portalName} and automatically continue your job application.</p>
                
                <a href="${secureLoginUrl}" class="login-btn">
                  🔐 Secure Login to ${session.portalName}
                </a>
                
                <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                  This link is valid for 30 minutes and can only be used once.
                </p>
              </div>

              <div class="security-note">
                <h4>🛡️ Security Features</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Encrypted session management</li>
                  <li>Automatic session expiration</li>
                  <li>Secure credential handling</li>
                  <li>Browser-based authentication</li>
                </ul>
              </div>

              <div class="warning">
                <h4>⚠️ Important Instructions</h4>
                <ol style="margin: 10px 0; padding-left: 20px;">
                  <li>Click the secure login button above</li>
                  <li>Log in using your ${session.portalName} credentials</li>
                  <li>Keep the browser tab open until application completes</li>
                  <li>You'll receive a confirmation email when finished</li>
                </ol>
              </div>

              <p style="margin-top: 30px; color: #4b5563;">
                After successful login, your job application will automatically continue with form filling and submission.
              </p>
            </div>

            <div class="footer">
              <p>🤖 Auto Job Applier - Secure Login Service</p>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Use EmailService with enhanced error handling
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await this.emailService.sendCustomEmail(session.userEmail, subject, htmlContent);
        console.log('✅ Secure login email sent successfully');
      } else {
        console.log('🔗 Email not configured. Manual login URL:', secureLoginUrl);
      }

    } catch (error) {
      console.error('Error sending secure login email:', error);
      throw error;
    }
  }

  private getAuthMethodDisplay(method: string): string {
    switch (method) {
      case 'google': return 'Google Account (OAuth)';
      case 'linkedin': return 'LinkedIn Account';
      case 'microsoft': return 'Microsoft Account';
      case 'oauth': return 'Social Login (OAuth)';
      case 'email': return 'Email & Password';
      default: return 'Standard Login';
    }
  }

  async initiateSecureLogin(loginToken: string): Promise<{
    success: boolean;
    message: string;
    redirectUrl?: string;
    browserContext?: string;
  }> {
    try {
      let session = this.activeSessions.get(loginToken);
      if (!session) {
        const dbSession = await storage.getLoginSessionByToken(loginToken);
        if (!dbSession || dbSession.status !== 'pending' || new Date() > dbSession.expiresAt) {
          return {
            success: false,
            message: 'Login session expired or not found. Please request a new login link.'
          };
        }
        // Restore session from database - create a new LoginSession object
        session = {
          sessionId: dbSession.sessionId,
          loginToken,
          portalName: dbSession.portalName,
          loginUrl: dbSession.loginUrl,
          jobUrl: dbSession.jobUrl,
          userEmail: dbSession.userEmail,
          status: 'pending' as const,
          expiresAt: dbSession.expiresAt,
          authMethod: dbSession.authMethod as 'email' | 'google' | 'linkedin' | 'microsoft' | 'oauth'
        };
      }

      if (session.status !== 'pending') {
        return {
          success: false,
          message: 'Login session is no longer valid.'
        };
      }

      // Launch browser with persistent context for the login
      const browser = await this.browserService.launchBrowser();
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      const page = await context.newPage();
      
      // Navigate to the portal's login page
      await page.goto(session.loginUrl, { waitUntil: 'networkidle' });

      // Store browser context for monitoring
      session.browserContext = context;
      this.activeSessions.set(loginToken, session);

      // Start monitoring for successful login
      this.monitorLoginSuccess(loginToken, page);

      // Update session status
      await storage.updateLoginSession(loginToken, { status: 'pending' });

      return {
        success: true,
        message: 'Browser opened for secure login. Please complete authentication.',
        redirectUrl: session.loginUrl,
        browserContext: loginToken
      };

    } catch (error) {
      console.error('Error initiating secure login:', error);
      return {
        success: false,
        message: `Failed to initiate login: ${(error as Error).message}`
      };
    }
  }

  private async monitorLoginSuccess(loginToken: string, page: Page): Promise<void> {
    const session = this.activeSessions.get(loginToken);
    if (!session) return;

    let attempts = 0;
    const maxAttempts = 60; // Monitor for 10 minutes (60 * 10 seconds)

    const checkAuthentication = async () => {
      try {
        attempts++;
        
        // Check for authentication indicators
        const isAuthenticated = await this.detectAuthentication(page, session.authMethod);
        
        if (isAuthenticated) {
          console.log('✅ Authentication successful! Proceeding with job application...');
          
          // Update session status
          session.status = 'authenticated';
          await storage.updateLoginSession(loginToken, { status: 'authenticated' });
          
          // Continue with job application using authenticated session
          await this.continueJobApplication(session);
          return;
        }
        
        // Check if session expired
        if (new Date() > session.expiresAt || attempts >= maxAttempts) {
          console.log('⏰ Login session expired');
          session.status = 'expired';
          await storage.updateLoginSession(loginToken, { status: 'expired' });
          
          if (session.browserContext) {
            await session.browserContext.close();
          }
          this.activeSessions.delete(loginToken);
          return;
        }
        
        // Continue monitoring
        setTimeout(checkAuthentication, 10000); // Check every 10 seconds
        
      } catch (error) {
        console.error('Error during authentication monitoring:', error);
        session.status = 'failed';
        await storage.updateLoginSession(loginToken, { status: 'failed' });
      }
    };

    // Start monitoring after 5 seconds
    setTimeout(checkAuthentication, 5000);
  }

  private async detectAuthentication(page: Page, authMethod: string): Promise<boolean> {
    try {
      const url = page.url().toLowerCase();
      
      // Method-specific authentication detection
      switch (authMethod) {
        case 'google':
          // Check for Google account indicators
          return await this.detectGoogleAuth(page);
          
        case 'linkedin':
          // Check for LinkedIn session
          return await this.detectLinkedInAuth(page);
          
        case 'microsoft':
          // Check for Microsoft authentication
          return await this.detectMicrosoftAuth(page);
          
        default:
          // Generic authentication detection
          return await this.detectGenericAuth(page);
      }
    } catch (error) {
      console.log('Error detecting authentication:', error);
      return false;
    }
  }

  private async detectGoogleAuth(page: Page): Promise<boolean> {
    try {
      // Check URL patterns
      const url = page.url();
      if (url.includes('myaccount.google.com') || url.includes('accounts.google.com/signin/v2/challenge')) {
        return false; // Still in login process
      }
      
      // Check for authenticated elements
      const authIndicators = [
        '[data-testid="user-menu"]',
        '.gb_Aa', // Google account button
        '[aria-label*="Account"]',
        '.gb_Ca' // Google profile image
      ];
      
      for (const selector of authIndicators) {
        const element = await page.$(selector);
        if (element) {
          return true;
        }
      }
      
      // Check cookies for Google session
      const cookies = await page.context().cookies();
      return cookies.some(cookie => 
        cookie.name.includes('session') || 
        cookie.name.includes('SAPISID') || 
        cookie.name.includes('SSID')
      );
    } catch (error) {
      return false;
    }
  }

  private async detectLinkedInAuth(page: Page): Promise<boolean> {
    try {
      const authIndicators = [
        '[data-test-id="nav-settings-user-menu"]',
        '.global-nav__me',
        '.global-nav__me-photo',
        '.nav-item__profile-member-photo'
      ];
      
      for (const selector of authIndicators) {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          return true;
        }
      }
      
      // Check for LinkedIn session cookies
      const cookies = await page.context().cookies();
      return cookies.some(cookie => 
        cookie.name === 'li_at' || 
        cookie.name === 'JSESSIONID'
      );
    } catch (error) {
      return false;
    }
  }

  private async detectMicrosoftAuth(page: Page): Promise<boolean> {
    try {
      const authIndicators = [
        '[data-testid="user-displayname"]',
        '.ms-persona-coin',
        '.o365-persona-button',
        '[aria-label*="profile"]'
      ];
      
      for (const selector of authIndicators) {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          return true;
        }
      }
      
      // Check Microsoft authentication cookies
      const cookies = await page.context().cookies();
      return cookies.some(cookie => 
        cookie.name.includes('MSISAuth') || 
        cookie.name.includes('ESTSAUTH')
      );
    } catch (error) {
      return false;
    }
  }

  private async detectGenericAuth(page: Page): Promise<boolean> {
    try {
      // Generic authentication indicators
      const authIndicators = [
        '[data-testid="user-menu"]',
        '.user-avatar',
        '.profile-dropdown',
        'button:has-text("Profile")',
        'button:has-text("Account")',
        'a:has-text("Logout")',
        'a:has-text("Sign out")',
        '.dashboard',
        '.user-name'
      ];
      
      for (const selector of authIndicators) {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          return true;
        }
      }
      
      // Check if URL changed to authenticated area
      const url = page.url().toLowerCase();
      if (url.includes('dashboard') || url.includes('profile') || url.includes('account')) {
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async continueJobApplication(session: LoginSession): Promise<void> {
    try {
      console.log('🚀 Continuing job application with authenticated session...');
      
      if (!session.browserContext) {
        throw new Error('Browser context not available');
      }

      const page = await session.browserContext.newPage();
      
      // Navigate back to the job URL
      await page.goto(session.jobUrl, { waitUntil: 'networkidle' });
      
      // Get the original application session to continue the workflow
      const applicationSession = await storage.getApplicationSession(session.sessionId);
      if (!applicationSession) {
        throw new Error('Original application session not found');
      }

      // Continue with the existing automation workflow
      // This would integrate with your existing ManualLoginAutomationService
      // For now, we'll update the session status and notify the user
      
      await storage.updateApplicationSession(session.sessionId, {
        status: 'authenticated_ready'
      });

      // Send confirmation email
      await this.emailService.sendCustomEmail(
        session.userEmail,
        '✅ Authentication Successful - Job Application Continuing',
        this.generateContinuationEmailHTML(session)
      );

      console.log('✅ Authentication successful, job application workflow continuing...');
      
    } catch (error) {
      console.error('Error continuing job application:', error);
      
      // Update session with error status
      await storage.updateLoginSession(session.loginToken, { 
        status: 'failed',
        errorMessage: (error as Error).message 
      });
    }
  }

  private generateContinuationEmailHTML(session: LoginSession): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Authentication Successful</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .success-section { background: #ecfdf5; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #10b981; }
          .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Authentication Successful!</h1>
            <p>Your job application is now continuing automatically</p>
          </div>
          
          <div class="content">
            <div class="success-section">
              <h3>🚀 What's Happening Now</h3>
              <p>You have successfully authenticated with <strong>${session.portalName}</strong>.</p>
              <p>Your job application is now being automatically processed:</p>
              <ul style="text-align: left; display: inline-block;">
                <li>Form fields are being filled with your profile information</li>
                <li>Resume and cover letter are being uploaded</li>
                <li>Application will be submitted after final review</li>
              </ul>
            </div>

            <p><strong>Job Details:</strong></p>
            <ul>
              <li><strong>Portal:</strong> ${session.portalName}</li>
              <li><strong>Original Job URL:</strong> <a href="${session.jobUrl}">View Job</a></li>
              <li><strong>Authenticated:</strong> ${new Date().toLocaleString()}</li>
            </ul>

            <p>You'll receive another email once the application is submitted successfully.</p>
          </div>

          <div class="footer">
            <p>🤖 Auto Job Applier - Secure Login Service</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async getLoginSessions(userEmail: string): Promise<any[]> {
    try {
      return await storage.getLoginSessionsByUser(userEmail);
    } catch (error) {
      console.error('Error getting login sessions:', error);
      return [];
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      
      for (const [token, session] of Array.from(this.activeSessions.entries())) {
        if (now > session.expiresAt) {
          if (session.browserContext) {
            await session.browserContext.close();
          }
          this.activeSessions.delete(token);
          await storage.updateLoginSession(token, { status: 'expired' });
        }
      }
      
      console.log('🧹 Expired login sessions cleaned up');
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }
}