import { ComprehensiveProfile, ApplicationSessionRecord } from '@shared/schema';
import { storage } from '../storage';
import { EmailService } from './email-service';
import { v4 as uuidv4 } from 'uuid';

export class MockAutomationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async startJobApplicationProcess(
    jobUrl: string, 
    profile: ComprehensiveProfile,
    resumeFile?: Buffer,
    coverLetterFile?: Buffer
  ): Promise<{ success: boolean; sessionId?: string; message: string }> {
    try {
      // Create user if doesn't exist
      let user = await storage.getUserByEmail(profile.email);
      if (!user) {
        user = await storage.createUser({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          resumeFileName: profile.resumeFileName,
          coverLetterFileName: profile.coverLetterFileName,
        });
      }

      // Create application session
      const sessionId = uuidv4();
      const approvalToken = uuidv4().replace(/-/g, ''); // Clean token for URLs
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const session = await storage.createApplicationSession({
        id: sessionId,
        userId: user.id,
        jobUrl,
        platform: this.detectPlatform(jobUrl),
        status: 'pending_review',
        profileData: profile,
        approvalToken,
        expiresAt,
        reviewEmailSent: false,
      });

      // Mock form analysis instead of browser automation
      const mockFilledData = this.createMockFormData(jobUrl, profile);
      
      // Update session with mock form data
      await storage.updateApplicationSession(sessionId, {
        filledFormData: mockFilledData,
      });

      // Send review email
      const emailSent = await this.emailService.sendReviewEmail(
        { ...session, filledFormData: mockFilledData } as ApplicationSessionRecord, 
        mockFilledData
      );

      if (emailSent) {
        await storage.updateApplicationSession(sessionId, {
          reviewEmailSent: true,
        });
      }

      return {
        success: true,
        sessionId,
        message: `✨ Application prepared successfully! Review email sent to ${profile.email}. Please check your email to approve and submit the application.`
      };

    } catch (error) {
      console.error('Mock automation error:', error);
      return {
        success: false,
        message: `Failed to start application process: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async approveAndSubmitApplication(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const session = await storage.getApplicationSessionByToken(token);
      if (!session) {
        return { success: false, message: 'Invalid or expired approval token' };
      }

      if (new Date() > session.expiresAt) {
        return { success: false, message: 'Approval link has expired' };
      }

      if (session.status !== 'pending_review') {
        return { success: false, message: 'Application has already been processed' };
      }

      // Update status to approved
      await storage.updateApplicationSession(session.id, {
        status: 'approved',
      });

      // Mock submission process
      const submissionResult = { 
        success: true, 
        message: 'Application submitted successfully (simulated)',
        details: {
          finalUrl: session.jobUrl,
          submissionTime: new Date().toISOString(),
          simulationMode: true
        }
      };

      // Update final status
      const finalStatus = submissionResult.success ? 'submitted' : 'failed';
      await storage.updateApplicationSession(session.id, {
        status: finalStatus,
      });

      // Create job application record
      await storage.createJobApplication({
        userId: session.userId,
        jobUrl: session.jobUrl,
        platform: session.platform,
        jobTitle: session.jobTitle,
        company: session.company,
        status: submissionResult.success ? 'applied' : 'failed',
        errorMessage: submissionResult.success ? undefined : submissionResult.message,
        submissionConfirmed: submissionResult.success,
        applicationData: {
          sessionId: session.id,
          profileData: session.profileData,
          submissionDetails: submissionResult.details,
        },
      });

      // Send confirmation email
      await this.emailService.sendConfirmationEmail(session, submissionResult.success);

      return {
        success: submissionResult.success,
        message: submissionResult.message
      };

    } catch (error) {
      console.error('Mock approval submission error:', error);
      return {
        success: false,
        message: `Failed to submit application: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private createMockFormData(jobUrl: string, profile: ComprehensiveProfile): any {
    return {
      jobDetails: {
        title: 'Software Engineer', // Mock title
        company: this.extractCompanyFromUrl(jobUrl),
        location: 'Remote',
        type: 'Full-time'
      },
      filledFields: {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        workAuthorization: profile.workAuthorization,
        desiredSalary: profile.desiredSalary,
        startDate: profile.startDate,
        resumeUploaded: true,
        coverLetterUploaded: !!profile.coverLetterFileName
      },
      formReady: true,
      timestamp: new Date().toISOString(),
      simulationMode: true
    };
  }

  private extractCompanyFromUrl(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      const parts = hostname.split('.');
      
      // Remove common prefixes and suffixes
      const filtered = parts.filter(part => 
        !['www', 'jobs', 'careers', 'apply', 'com', 'org', 'net'].includes(part)
      );
      
      return filtered.length > 0 ? 
        filtered[0].charAt(0).toUpperCase() + filtered[0].slice(1) : 
        'Unknown Company';
    } catch {
      return 'Unknown Company';
    }
  }

  private detectPlatform(jobUrl: string): string {
    const url = jobUrl.toLowerCase();
    
    if (url.includes('greenhouse')) return 'Greenhouse';
    if (url.includes('lever')) return 'Lever';
    if (url.includes('workday')) return 'Workday';
    if (url.includes('bamboohr')) return 'BambooHR';
    if (url.includes('smartrecruiters')) return 'SmartRecruiters';
    if (url.includes('icims')) return 'iCIMS';
    if (url.includes('jobvite')) return 'Jobvite';
    if (url.includes('taleo')) return 'Taleo';
    if (url.includes('successfactors')) return 'SuccessFactors';
    
    return 'Custom ATS';
  }

  async rejectApplication(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const session = await storage.getApplicationSessionByToken(token);
      if (!session) {
        return { success: false, message: 'Invalid or expired approval token' };
      }

      if (new Date() > session.expiresAt) {
        return { success: false, message: 'Approval link has expired' };
      }

      // Update status to rejected
      await storage.updateApplicationSession(session.id, {
        status: 'rejected',
      });

      return {
        success: true,
        message: 'Application has been rejected and will not be submitted'
      };

    } catch (error) {
      console.error('Rejection error:', error);
      return {
        success: false,
        message: 'Failed to reject application'
      };
    }
  }

  async close(): Promise<void> {
    // No browser to close in mock mode
  }
}