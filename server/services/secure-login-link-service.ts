import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { EmailService } from './email-service';
import { WhatsAppService } from './whatsapp-service';
import type { InsertLoginSession, LoginSessionRecord } from '@shared/schema';

interface LoginLinkRequest {
  sessionId: string;
  userId: number;
  userEmail: string;
  jobUrl: string;
  platform: string;
  loginUrl: string;
  authMethod: 'manual' | 'google' | 'linkedin';
  enableWhatsApp?: boolean;
  whatsappNumber?: string;
}

export class SecureLoginLinkService {
  private emailService: EmailService;
  private whatsAppService: WhatsAppService;
  private readonly jwtSecret: string;

  constructor() {
    this.emailService = new EmailService();
    this.whatsAppService = new WhatsAppService();
    this.jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';
  }

  /**
   * Creates a secure login session and sends login link via email/WhatsApp
   */
  async createSecureLoginSession(request: LoginLinkRequest): Promise<LoginSessionRecord> {
    const secureToken = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const loginSession: InsertLoginSession = {
      id: nanoid(),
      userId: request.userId,
      sessionId: request.sessionId,
      platform: request.platform,
      loginUrl: request.loginUrl,
      jobUrl: request.jobUrl,
      secureToken,
      userEmail: request.userEmail,
      authMethod: request.authMethod,
      loginStatus: 'pending',
      expiresAt,
    };

    const createdSession = await storage.createLoginSession(loginSession);
    
    // Send notifications
    await this.sendLoginNotifications(createdSession, request);
    
    return createdSession;
  }

  /**
   * Sends secure login link via email and optionally WhatsApp
   */
  private async sendLoginNotifications(
    session: LoginSessionRecord, 
    request: LoginLinkRequest
  ): Promise<void> {
    const loginLink = this.generateSecureLoginLink(session.secureToken);
    const platformName = this.getPlatformDisplayName(session.platform);
    
    // Send email notification
    const emailSent = await this.emailService.sendSecureLoginEmail({
      to: session.userEmail,
      platformName,
      jobUrl: session.jobUrl,
      loginLink,
      expiresAt: session.expiresAt,
    });

    // Send WhatsApp notification if enabled
    if (request.enableWhatsApp && request.whatsappNumber) {
      await this.whatsAppService.sendSecureLoginNotification(
        request.whatsappNumber,
        platformName,
        loginLink
      );
    }

    console.log(`🔐 Secure login link sent to ${session.userEmail} for ${platformName}`);
  }

  /**
   * Generates a secure JWT token for login authentication
   */
  private generateSecureToken(): string {
    const payload = {
      id: nanoid(),
      timestamp: Date.now(),
      purpose: 'secure_login'
    };
    
    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn: '24h',
      algorithm: 'HS256'
    });
  }

  /**
   * Generates the secure login link URL
   */
  private generateSecureLoginLink(secureToken: string): string {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    
    return `${baseUrl}/secure-login/${encodeURIComponent(secureToken)}`;
  }

  /**
   * Validates and processes a secure login attempt
   */
  async processSecureLogin(
    secureToken: string, 
    browserSessionData?: any
  ): Promise<{ success: boolean; message: string; sessionId?: string }> {
    try {
      // Verify JWT token
      jwt.verify(secureToken, this.jwtSecret);
      
      // Get login session
      const session = await storage.getLoginSessionByToken(secureToken);
      if (!session) {
        return { success: false, message: 'Invalid or expired login link' };
      }

      // Check expiration
      if (new Date() > session.expiresAt) {
        await storage.updateLoginSession(session.id, { loginStatus: 'expired' });
        return { success: false, message: 'Login link has expired' };
      }

      // Check if already completed
      if (session.loginStatus === 'completed') {
        return { 
          success: true, 
          message: 'Login already completed. Redirecting to continue application...',
          sessionId: session.sessionId
        };
      }

      // Update session as completed
      await storage.updateLoginSession(session.id, {
        loginStatus: 'completed',
        loginCompletedAt: new Date(),
        browserSessionData
      });

      console.log(`✅ Secure login completed for session ${session.sessionId}`);
      
      return { 
        success: true, 
        message: 'Login successful! Continuing with job application...',
        sessionId: session.sessionId
      };
      
    } catch (error) {
      console.error('Secure login processing error:', error);
      return { success: false, message: 'Invalid login link' };
    }
  }

  /**
   * Monitors login session status for automation
   */
  async monitorLoginStatus(sessionId: string): Promise<{
    isAuthenticated: boolean;
    browserSessionData?: any;
    loginSession?: LoginSessionRecord;
  }> {
    const loginSessions = await storage.getLoginSessionsByApplicationSessionId(sessionId);
    
    for (const session of loginSessions) {
      if (session.loginStatus === 'completed' && session.browserSessionData) {
        return {
          isAuthenticated: true,
          browserSessionData: session.browserSessionData,
          loginSession: session
        };
      }
    }
    
    return { isAuthenticated: false };
  }

  /**
   * Cleans up expired login sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    const expiredSessions = await storage.getExpiredLoginSessions();
    
    for (const session of expiredSessions) {
      await storage.updateLoginSession(session.id, { loginStatus: 'expired' });
    }
    
    console.log(`🧹 Cleaned up ${expiredSessions.length} expired login sessions`);
  }

  /**
   * Gets user-friendly platform display name
   */
  private getPlatformDisplayName(platform: string): string {
    const platformNames: Record<string, string> = {
      'google': 'Google Careers',
      'linkedin': 'LinkedIn Jobs',
      'workday': 'Workday',
      'greenhouse': 'Greenhouse',
      'lever': 'Lever',
      'bamboohr': 'BambooHR',
      'smartrecruiters': 'SmartRecruiters',
      'icims': 'iCIMS',
      'walmart': 'Walmart Careers',
      'amazon': 'Amazon Jobs',
      'microsoft': 'Microsoft Careers',
      'meta': 'Meta Careers'
    };
    
    return platformNames[platform.toLowerCase()] || platform;
  }

  /**
   * Creates login dashboard data for tracking
   */
  async getLoginDashboardData(userId: number): Promise<{
    pendingLogins: LoginSessionRecord[];
    completedLogins: LoginSessionRecord[];
    expiredLogins: LoginSessionRecord[];
  }> {
    const allSessions = await storage.getLoginSessionsByUserId(userId);
    
    const pendingLogins = allSessions.filter(s => s.loginStatus === 'pending');
    const completedLogins = allSessions.filter(s => s.loginStatus === 'completed');
    const expiredLogins = allSessions.filter(s => s.loginStatus === 'expired');
    
    return {
      pendingLogins,
      completedLogins, 
      expiredLogins
    };
  }
}