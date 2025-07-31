import nodemailer from 'nodemailer';
import { ComprehensiveProfile, ApplicationSessionRecord } from '@shared/schema';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure Gmail SMTP transporter
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS, // Gmail app password
        },
      });
    } else {
      console.warn('⚠️ Email credentials not configured. Emails will be skipped.');
      // Create a test transporter that doesn't actually send emails
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
    }
  }

  async sendReviewEmail(session: ApplicationSessionRecord, filledData: any): Promise<boolean> {
    try {
      // Skip email sending if credentials not configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Email credentials not configured. Skipping review email. Use manual approval URL:');
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : process.env.BASE_URL || 'http://localhost:5000';
        const approvalUrl = `${baseUrl}/api/approve-application/${session.approvalToken}`;
        console.log(`🔗 Manual approval URL: ${approvalUrl}`);
        return true; // Return true to continue workflow
      }

      const profile = session.profileData as ComprehensiveProfile;
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : process.env.BASE_URL || 'http://localhost:5000';
      const approvalUrl = `${baseUrl}/api/approve-application/${session.approvalToken}`;
      
      const htmlContent = this.generateReviewEmailHTML(session, profile, filledData, approvalUrl);
      
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER, // Use the same email as sender
        to: profile.email,
        subject: `📝 Job Application Ready for Your Approval - ${session.jobTitle || 'Position'} at ${session.company || 'Company'}`,
        html: htmlContent,
      });

      console.log('✅ Review email sent successfully to:', profile.email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send review email:', error);
      return false;
    }
  }

  async sendSecureLoginEmail(params: {
    to: string;
    platformName: string;
    jobUrl: string;
    loginLink: string;
    expiresAt: Date;
  }): Promise<boolean> {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Email credentials not configured. Skipping secure login email.');
        console.log(`🔗 Manual login link: ${params.loginLink}`);
        return true;
      }

      const htmlContent = this.generateSecureLoginEmailHTML(params);

      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: params.to,
        subject: `🔐 Secure Login Required - ${params.platformName} Job Application`,
        html: htmlContent,
      });

      console.log(`✅ Secure login email sent to: ${params.to}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send secure login email:', error);
      return false;
    }
  }

  async sendManualLoginEmail(params: {
    userEmail: string;
    userName: string;
    jobTitle: string;
    company: string;
    jobUrl: string;
    sessionId: string;
  }): Promise<boolean> {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Email credentials not configured. Skipping manual login email.');
        console.log(`🔗 Manual login required for job: ${params.jobUrl}`);
        return true;
      }

      const htmlContent = this.generateManualLoginEmailHTML(params);

      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: params.userEmail,
        subject: `🔐 Login Required: ${params.jobTitle} at ${params.company}`,
        html: htmlContent,
      });

      console.log(`✅ Manual login email sent to: ${params.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send manual login email:', error);
      return false;
    }
  }

  async sendJobApplicationReview(
    email: string,
    jobTitle: string,
    companyName: string,
    approvalUrl: string,
    rejectUrl: string
  ): Promise<boolean> {
    try {
      // Skip email sending if credentials not configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Email credentials not configured. Skipping review email.');
        console.log(`🔗 Manual approval URL: ${approvalUrl}`);
        return true; // Return true to continue workflow
      }

      const subject = `📝 Job Application Ready for Review - ${jobTitle} at ${companyName}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Job Application Review</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .approval-section { background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .approve-btn { 
              display: inline-block; 
              background: #10b981; 
              color: white; 
              padding: 15px 30px; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: bold;
              margin: 10px;
            }
            .reject-btn { 
              display: inline-block; 
              background: #ef4444; 
              color: white; 
              padding: 15px 30px; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: bold;
              margin: 10px;
            }
            .footer { background: #1f2937; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Job Application Ready for Review</h1>
              <p>${jobTitle} at ${companyName}</p>
            </div>
            
            <div class="content">
              <p>Your job application has been automatically filled and is ready for submission.</p>
              <p><strong>Please review and choose one of the following actions:</strong></p>
            </div>

            <div class="approval-section">
              <h3>Ready to Submit?</h3>
              <p>If everything looks correct, click "Approve & Submit" to submit your application.</p>
              
              <a href="${approvalUrl}" class="approve-btn">✅ Approve & Submit</a>
              <a href="${rejectUrl}" class="reject-btn">❌ Cancel Application</a>
              
              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                ⏰ Auto-submit in 8 seconds if no response
              </p>
            </div>

            <div class="footer">
              <p>Auto Job Applier - Manual Login Automation</p>
              <p style="font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        html: htmlContent,
      });

      console.log('✅ Job application review email sent successfully to:', email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send job application review email:', error);
      return false;
    }
  }

  async sendConfirmationEmail(session: ApplicationSessionRecord, success: boolean): Promise<boolean> {
    try {
      // Skip email sending if credentials not configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Email credentials not configured. Skipping confirmation email.');
        return true; // Return true to continue workflow
      }

      const profile = session.profileData as ComprehensiveProfile;
      const subject = success 
        ? `✅ Application Submitted Successfully - ${session.jobTitle || 'Position'}`
        : `❌ Application Failed - ${session.jobTitle || 'Position'}`;
      
      const htmlContent = this.generateConfirmationEmailHTML(session, success);
      
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER, // Use the same email as sender
        to: profile.email,
        subject,
        html: htmlContent,
      });

      return true;
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      return false;
    }
  }

  private generateReviewEmailHTML(
    session: ApplicationSessionRecord, 
    profile: ComprehensiveProfile, 
    filledData: any,
    approvalUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Application Review</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .section { margin-bottom: 20px; }
          .section h3 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }
          .field-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .field-label { font-weight: bold; color: #4b5563; }
          .field-value { color: #1f2937; }
          .approval-section { background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .approve-btn { 
            display: inline-block; 
            background: #10b981; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: bold;
            margin: 10px;
          }
          .reject-btn { 
            display: inline-block; 
            background: #ef4444; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: bold;
            margin: 10px;
          }
          .footer { background: #1f2937; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Job Application Ready for Review</h1>
            <p>${session.jobTitle || 'Position'} at ${session.company || 'Company'}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h3>Job Details</h3>
              <div class="field-row">
                <span class="field-label">Position:</span>
                <span class="field-value">${session.jobTitle || 'Not specified'}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Company:</span>
                <span class="field-value">${session.company || 'Not specified'}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Platform:</span>
                <span class="field-value">${session.platform}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Job URL:</span>
                <span class="field-value"><a href="${session.jobUrl}" target="_blank">View Job Posting</a></span>
              </div>
            </div>

            <div class="section">
              <h3>Your Information</h3>
              <div class="field-row">
                <span class="field-label">Name:</span>
                <span class="field-value">${profile.name}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Email:</span>
                <span class="field-value">${profile.email}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Phone:</span>
                <span class="field-value">${profile.phone}</span>
              </div>
              ${profile.address ? `
              <div class="field-row">
                <span class="field-label">Address:</span>
                <span class="field-value">${profile.address}, ${profile.city || ''} ${profile.state || ''} ${profile.zipCode || ''}</span>
              </div>
              ` : ''}
              ${profile.workAuthorization ? `
              <div class="field-row">
                <span class="field-label">Work Authorization:</span>
                <span class="field-value">${profile.workAuthorization}</span>
              </div>
              ` : ''}
              ${profile.desiredSalary ? `
              <div class="field-row">
                <span class="field-label">Desired Salary:</span>
                <span class="field-value">${profile.desiredSalary}</span>
              </div>
              ` : ''}
            </div>

            ${Object.keys(filledData || {}).length > 0 ? `
            <div class="section">
              <h3>Form Fields to be Submitted</h3>
              ${Object.entries(filledData).map(([key, value]) => `
                <div class="field-row">
                  <span class="field-label">${key}:</span>
                  <span class="field-value">${value}</span>
                </div>
              `).join('')}
            </div>
            ` : ''}
          </div>

          <div class="approval-section">
            <h3>Review Complete - Ready to Submit?</h3>
            <p>Please review all the information above. If everything looks correct, click "Approve & Submit" to automatically submit your application.</p>
            
            <a href="${approvalUrl}?action=approve" class="approve-btn">✅ Approve & Submit</a>
            <a href="${approvalUrl}?action=reject" class="reject-btn">❌ Cancel Application</a>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              This approval link expires in 24 hours for security.
            </p>
          </div>

          <div class="footer">
            <p>Auto Job Applier - Automated Job Application Assistant</p>
            <p style="font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendCustomEmail(
    email: string,
    subject: string,
    htmlContent: string
  ): Promise<boolean> {
    try {
      // Skip email sending if credentials not configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Email credentials not configured. Skipping custom email.');
        return true; // Return true to continue workflow
      }

      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        html: htmlContent,
      });

      console.log('✅ Custom email sent successfully to:', email);
      return true;
    } catch (error) {
      console.error('❌ Failed to send custom email:', error);
      return false;
    }
  }

  private generateConfirmationEmailHTML(session: ApplicationSessionRecord, success: boolean): string {
    const profile = session.profileData as ComprehensiveProfile;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application ${success ? 'Submitted' : 'Failed'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: ${success ? '#10b981' : '#ef4444'}; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0; 
          }
          .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .footer { background: #1f2937; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${success ? '✅' : '❌'} Application ${success ? 'Submitted Successfully' : 'Failed'}</h1>
            <p>${session.jobTitle || 'Position'} at ${session.company || 'Company'}</p>
          </div>
          
          <div class="content">
            ${success ? `
              <p>Great news! Your job application has been successfully submitted.</p>
              <p><strong>What happens next:</strong></p>
              <ul>
                <li>The employer will review your application</li>
                <li>You may receive a confirmation email from the company</li>
                <li>Keep an eye on your email for next steps</li>
              </ul>
            ` : `
              <p>Unfortunately, there was an issue submitting your application.</p>
              <p>You can try applying manually at: <a href="${session.jobUrl}">${session.jobUrl}</a></p>
            `}
            
            <p><strong>Application Details:</strong></p>
            <ul>
              <li><strong>Position:</strong> ${session.jobTitle || 'Not specified'}</li>
              <li><strong>Company:</strong> ${session.company || 'Not specified'}</li>
              <li><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Job Link:</strong> <a href="${session.jobUrl}">View Original Posting</a></li>
            </ul>
          </div>

          <div class="footer">
            <p>Auto Job Applier - Automated Job Application Assistant</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateSecureLoginEmailHTML(params: {
    to: string;
    platformName: string;
    jobUrl: string;
    loginLink: string;
    expiresAt: Date;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Secure Login Required</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .login-section { background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px solid #3b82f6; }
          .login-btn { 
            display: inline-block; 
            background: #3b82f6; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: bold;
            margin: 10px;
          }
          .footer { background: #1f2937; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Secure Login Required</h1>
            <p>Job Application for ${params.platformName}</p>
          </div>
          
          <div class="content">
            <h3>Login Required for Job Application</h3>
            <p>Your job application is ready to submit, but ${params.platformName} requires you to log in first.</p>
            
            <p><strong>Job URL:</strong> <a href="${params.jobUrl}" target="_blank">${params.jobUrl}</a></p>
            
            <div class="login-section">
              <h3>Click to Login Securely</h3>
              <p>This secure link will open ${params.platformName} for you to log in. After successful login, your application will automatically continue.</p>
              
              <a href="${params.loginLink}" class="login-btn">🔐 Login to ${params.platformName}</a>
              
              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                This secure link expires on ${params.expiresAt.toLocaleString()} for security.
              </p>
            </div>
            
            <h3>What happens next?</h3>
            <ol>
              <li>Click the secure login button above</li>
              <li>Log in to ${params.platformName} using your credentials</li>
              <li>Our system will detect successful login</li>
              <li>Your application will automatically be submitted</li>
            </ol>
            
            <p><strong>Security Note:</strong> This is a secure, encrypted link that only works for your specific application session.</p>
          </div>

          <div class="footer">
            <p>Auto Job Applier - Secure Login Assistant</p>
            <p style="font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendApplicationConfirmation(params: {
    userEmail: string;
    userName: string;
    jobTitle: string;
    company: string;
    jobUrl: string;
    status: 'submitted' | 'failed';
    sessionId: string;
  }): Promise<boolean> {
    const subject = params.status === 'submitted' 
      ? `✅ Application Submitted - ${params.jobTitle} at ${params.company}`
      : `❌ Application Failed - ${params.jobTitle} at ${params.company}`;

    const htmlContent = this.generateApplicationConfirmationEmailHTML(params);

    return await this.sendCustomEmail(params.userEmail, subject, htmlContent);
  }

  private generateApplicationConfirmationEmailHTML(params: {
    userEmail: string;
    userName: string;
    jobTitle: string;
    company: string;
    jobUrl: string;
    status: 'submitted' | 'failed';
    sessionId: string;
  }): string {
    const isSuccess = params.status === 'submitted';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application ${isSuccess ? 'Submitted' : 'Failed'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: ${isSuccess ? '#10b981' : '#ef4444'}; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0; 
          }
          .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .footer { background: #1f2937; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isSuccess ? '✅' : '❌'} Application ${isSuccess ? 'Submitted Successfully' : 'Failed'}</h1>
            <p>${params.jobTitle} at ${params.company}</p>
          </div>
          
          <div class="content">
            <p>Hi ${params.userName},</p>
            
            ${isSuccess ? `
              <p>Great news! Your job application has been successfully submitted.</p>
              <p><strong>What happens next:</strong></p>
              <ul>
                <li>The employer will review your application</li>
                <li>You may receive a confirmation email from the company</li>
                <li>Keep an eye on your email for next steps</li>
              </ul>
            ` : `
              <p>Unfortunately, there was an issue submitting your application.</p>
              <p>You can try applying manually at: <a href="${params.jobUrl}" target="_blank">Apply Here</a></p>
            `}
            
            <p><strong>Application Details:</strong></p>
            <ul>
              <li><strong>Position:</strong> ${params.jobTitle}</li>
              <li><strong>Company:</strong> ${params.company}</li>
              <li><strong>Session ID:</strong> ${params.sessionId}</li>
              <li><strong>Status:</strong> ${isSuccess ? 'Successfully Submitted' : 'Failed'}</li>
            </ul>
          </div>

          <div class="footer">
            <p>Auto Job Applier - Application Status Update</p>
            <p style="font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateManualLoginEmailHTML(params: {
    userEmail: string;
    userName: string;
    jobTitle: string;
    company: string;
    jobUrl: string;
    sessionId: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Required - Job Application</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .login-section { background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px solid #f59e0b; }
          .login-btn { 
            display: inline-block; 
            background: #f59e0b; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: bold;
            margin: 10px;
          }
          .footer { background: #1f2937; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Login Required</h1>
            <p>Job Application: ${params.jobTitle} at ${params.company}</p>
          </div>
          
          <div class="content">
            <p>Hi ${params.userName},</p>
            
            <p>Your job application is being processed, but the job portal requires you to log in first.</p>
            
            <div class="login-section">
              <h3>Action Required: Please Log In</h3>
              <p>Click the button below to log into the job portal. Once you're logged in, we'll automatically continue with your application.</p>
              
              <a href="${params.jobUrl}" class="login-btn" target="_blank">🔐 Login to Apply</a>
              
              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                After logging in, the application will continue automatically.
              </p>
            </div>
            
            <h3>What to do:</h3>
            <ol>
              <li>Click the login button above</li>
              <li>Log into the job portal using your credentials</li>
              <li>Keep the browser tab open</li>
              <li>The application will continue automatically</li>
            </ol>
            
            <p><strong>Job Details:</strong></p>
            <ul>
              <li><strong>Position:</strong> ${params.jobTitle}</li>
              <li><strong>Company:</strong> ${params.company}</li>
              <li><strong>Session ID:</strong> ${params.sessionId}</li>
            </ul>
          </div>

          <div class="footer">
            <p>Auto Job Applier - Manual Login Assistant</p>
            <p style="font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}