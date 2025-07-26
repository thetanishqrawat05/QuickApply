import nodemailer from 'nodemailer';
import { ComprehensiveProfile, ApplicationSessionRecord } from '@shared/schema';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter (you'll need to set up SMTP credentials)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendReviewEmail(session: ApplicationSessionRecord, filledData: any): Promise<boolean> {
    try {
      const profile = session.profileData as ComprehensiveProfile;
      const approvalUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/approve-application/${session.approvalToken}`;
      
      const htmlContent = this.generateReviewEmailHTML(session, profile, filledData, approvalUrl);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Auto Job Applier" <noreply@autojobapplier.com>',
        to: profile.email,
        subject: `📝 Job Application Ready for Your Approval - ${session.jobTitle || 'Position'} at ${session.company || 'Company'}`,
        html: htmlContent,
      });

      return true;
    } catch (error) {
      console.error('Failed to send review email:', error);
      return false;
    }
  }

  async sendConfirmationEmail(session: ApplicationSessionRecord, success: boolean): Promise<boolean> {
    try {
      const profile = session.profileData as ComprehensiveProfile;
      const subject = success 
        ? `✅ Application Submitted Successfully - ${session.jobTitle || 'Position'}`
        : `❌ Application Failed - ${session.jobTitle || 'Position'}`;
      
      const htmlContent = this.generateConfirmationEmailHTML(session, success);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Auto Job Applier" <noreply@autojobapplier.com>',
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
}