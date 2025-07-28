import twilio from 'twilio';

export class WhatsAppService {
  private twilio: twilio.Twilio | null = null;
  private fromNumber: string = '';

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('Twilio credentials not provided. WhatsApp notifications will be disabled.');
      return;
    }

    this.twilio = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
  }

  async sendJobApplicationReview(
    toNumber: string,
    jobTitle: string,
    companyName: string,
    approvalUrl: string,
    rejectUrl: string
  ): Promise<boolean> {
    if (!this.twilio) {
      console.log('WhatsApp service not configured, skipping notification');
      return false;
    }

    const message = `
🚀 *Job Application Ready for Review*

*Position:* ${jobTitle}
*Company:* ${companyName}

Your job application has been prepared and is ready for submission. Please review and approve:

✅ *Approve & Submit:* ${approvalUrl}
❌ *Reject:* ${rejectUrl}

⏰ *Auto-submit in 60 seconds* if no response

Reply STOP to opt out of notifications.
    `.trim();

    try {
      await this.twilio.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${toNumber}`,
        body: message
      });

      console.log(`WhatsApp review notification sent to ${toNumber}`);
      return true;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return false;
    }
  }

  async sendJobApplicationConfirmation(
    toNumber: string,
    jobTitle: string,
    companyName: string,
    status: 'success' | 'failed',
    submissionMethod: 'auto' | 'manual',
    errorMessage?: string
  ): Promise<boolean> {
    if (!this.twilio) {
      console.log('WhatsApp service not configured, skipping notification');
      return false;
    }

    const statusEmoji = status === 'success' ? '✅' : '❌';
    const methodText = submissionMethod === 'auto' ? 'automatically' : 'manually';
    
    let message = `
${statusEmoji} *Job Application ${status === 'success' ? 'Submitted' : 'Failed'}*

*Position:* ${jobTitle}
*Company:* ${companyName}
*Method:* Submitted ${methodText}
*Time:* ${new Date().toLocaleString()}
`;

    if (status === 'failed' && errorMessage) {
      message += `\n*Error:* ${errorMessage}`;
    }

    if (status === 'success') {
      message += '\n\n🎉 Your application has been successfully submitted! Good luck!';
    } else {
      message += '\n\n💡 You can try applying again or contact support for help.';
    }

    try {
      await this.twilio.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${toNumber}`,
        body: message
      });

      console.log(`WhatsApp confirmation sent to ${toNumber}`);
      return true;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return false;
    }
  }

  async sendBulkApplicationSummary(
    toNumber: string,
    results: Array<{
      jobTitle: string;
      companyName: string;
      status: 'success' | 'failed';
    }>
  ): Promise<boolean> {
    if (!this.twilio) {
      return false;
    }

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    const message = `
📊 *Bulk Application Summary*

*Total Applications:* ${results.length}
✅ *Successful:* ${successful}
❌ *Failed:* ${failed}

*Successful Applications:*
${results.filter(r => r.status === 'success').map(r => `• ${r.jobTitle} at ${r.companyName}`).join('\n')}

${failed > 0 ? `*Failed Applications:*\n${results.filter(r => r.status === 'failed').map(r => `• ${r.jobTitle} at ${r.companyName}`).join('\n')}` : ''}

🎯 Keep applying and stay positive!
`;

    try {
      await this.twilio.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${toNumber}`,
        body: message
      });

      return true;
    } catch (error) {
      console.error('WhatsApp bulk summary error:', error);
      return false;
    }
  }
}