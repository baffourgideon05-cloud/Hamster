/**
 * Brevo (Sendinblue) Transactional Email Service
 * Integrates directly with Brevo REST API v3: https://api.brevo.com/v3/smtp/email
 * Uses customizable site-synced templates from emailTemplates.ts
 */

import {
  BrevoConfig,
  EmailLog,
  EmailTemplatesConfig,
  FooterConfig,
  Order,
  SiteBranding
} from '../types/index.ts';
import { DEFAULT_EMAIL_TEMPLATES, renderCustomEmailHtml } from './emailTemplates.ts';

const FALLBACK_BRANDING: SiteBranding = {
  siteTitle: 'AdPulse Global | Meta Advertising Agency & Campaign Platform',
  siteShortName: 'AdPulse Global',
  logoUrl: '',
  logoBadgeText: 'AP',
  adminGoogleEmail: 'baffourgideon05@gmail.com'
};

const FALLBACK_FOOTER: FooterConfig = {
  phone: '+233 30 299 4411',
  email: 'hello@adpulse.agency',
  address: 'Floor 7, Heritage Tower, Ambassadorial Enclave, Ridge, Accra, Ghana',
  businessHours: 'Monday – Friday: 8:00 AM – 6:00 PM GMT',
  whatsappNumber: '+233 24 555 0192',
  aboutText: 'Done-For-You Facebook & Instagram Advertising Agency.',
  copyrightNotice: `© ${new Date().getFullYear()} AdPulse Global Advertising Ltd. All rights reserved.`
};

export class BrevoEmailService {
  private config: BrevoConfig;
  private branding: SiteBranding = FALLBACK_BRANDING;
  private footerConfig: FooterConfig = FALLBACK_FOOTER;
  private emailTemplates: EmailTemplatesConfig = DEFAULT_EMAIL_TEMPLATES;
  private logs: EmailLog[] = [];

  constructor(initialConfig: BrevoConfig) {
    this.config = initialConfig;
  }

  public updateConfig(newConfig: Partial<BrevoConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public setSiteContext(params: {
    branding?: SiteBranding;
    footerConfig?: FooterConfig;
    emailTemplates?: EmailTemplatesConfig;
  }) {
    if (params.branding) this.branding = params.branding;
    if (params.footerConfig) this.footerConfig = params.footerConfig;
    if (params.emailTemplates) this.emailTemplates = params.emailTemplates;
  }

  public getConfig(): BrevoConfig {
    return { ...this.config };
  }

  public getLogs(): EmailLog[] {
    return [...this.logs];
  }

  /**
   * Core dispatch method to Brevo v3 SMTP API
   */
  public async sendEmail(params: {
    toEmail: string;
    toName?: string;
    subject: string;
    htmlContent: string;
    type: 'order_receipt' | 'admin_order_notification' | 'password_reset' | 'test';
  }): Promise<{ success: boolean; messageId?: string; isSimulated?: boolean; error?: string }> {
    const { toEmail, toName, subject, htmlContent, type } = params;

    const apiKey = this.config.apiKey || process.env.BREVO_API_KEY || '';
    const senderEmail = this.config.senderEmail || process.env.BREVO_SENDER_EMAIL || 'baffourgideon05@gmail.com';
    const senderName =
      this.config.senderName ||
      process.env.BREVO_SENDER_NAME ||
      this.branding.siteShortName ||
      'AdPulse Global';

    const logEntry: EmailLog = {
      id: `email-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      recipientEmail: toEmail,
      recipientName: toName,
      subject,
      type,
      sentAt: new Date().toISOString(),
      status: 'simulated'
    };

    if (apiKey && apiKey.trim().length > 10 && !apiKey.includes('YOUR_BREVO')) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': apiKey.trim(),
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: {
              name: senderName,
              email: senderEmail
            },
            to: [
              {
                email: toEmail,
                name: toName || toEmail.split('@')[0]
              }
            ],
            subject,
            htmlContent
          })
        });

        const data: any = await response.json();

        if (response.ok && data.messageId) {
          logEntry.status = 'sent';
          logEntry.messageId = data.messageId;
          this.logs.unshift(logEntry);
          if (this.logs.length > 50) this.logs.pop();

          return {
            success: true,
            messageId: data.messageId,
            isSimulated: false
          };
        } else {
          const errMsg = data.message || data.error || `Brevo HTTP ${response.status}`;
          logEntry.status = 'failed';
          logEntry.error = errMsg;
          this.logs.unshift(logEntry);

          return {
            success: false,
            error: errMsg
          };
        }
      } catch (err: any) {
        logEntry.status = 'failed';
        logEntry.error = err.message || 'Brevo network error';
        this.logs.unshift(logEntry);

        return {
          success: false,
          error: err.message || 'Brevo dispatch error'
        };
      }
    }

    logEntry.status = 'simulated';
    logEntry.messageId = `sim_brevo_${Date.now()}`;
    this.logs.unshift(logEntry);
    if (this.logs.length > 50) this.logs.pop();

    return {
      success: true,
      messageId: logEntry.messageId,
      isSimulated: true
    };
  }

  /**
   * Send Customer Order Confirmation & Receipt using live site-synced template
   */
  public async sendOrderReceiptEmail(
    order: Order,
    siteContext?: {
      branding?: SiteBranding;
      footerConfig?: FooterConfig;
      emailTemplates?: EmailTemplatesConfig;
    }
  ): Promise<any> {
    if (siteContext) this.setSiteContext(siteContext);

    const { subject, htmlContent } = renderCustomEmailHtml({
      templateKey: 'orderReceipt',
      emailTemplates: this.emailTemplates,
      branding: this.branding,
      footerConfig: this.footerConfig,
      order,
      recipientEmail: order.customerEmail,
      recipientName: order.customerName
    });

    return this.sendEmail({
      toEmail: order.customerEmail,
      toName: order.customerName,
      subject,
      htmlContent,
      type: 'order_receipt'
    });
  }

  /**
   * Send New Paid Order Alert to Admin using live site-synced template
   */
  public async sendAdminOrderNotificationEmail(
    order: Order,
    siteContext?: {
      branding?: SiteBranding;
      footerConfig?: FooterConfig;
      emailTemplates?: EmailTemplatesConfig;
    }
  ): Promise<any> {
    if (siteContext) this.setSiteContext(siteContext);

    const adminEmail =
      this.config.adminNotifyEmail ||
      this.branding.adminGoogleEmail ||
      'baffourgideon05@gmail.com';

    const { subject, htmlContent } = renderCustomEmailHtml({
      templateKey: 'adminOrderAlert',
      emailTemplates: this.emailTemplates,
      branding: this.branding,
      footerConfig: this.footerConfig,
      order,
      recipientEmail: adminEmail,
      recipientName: 'Administrator'
    });

    return this.sendEmail({
      toEmail: adminEmail,
      toName: this.branding.siteShortName || 'Administrator',
      subject,
      htmlContent,
      type: 'admin_order_notification'
    });
  }

  /**
   * Send Password Reset Email via Brevo using live site-synced template
   */
  public async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    temporaryPassword: string,
    siteContext?: {
      branding?: SiteBranding;
      footerConfig?: FooterConfig;
      emailTemplates?: EmailTemplatesConfig;
    }
  ): Promise<any> {
    if (siteContext) this.setSiteContext(siteContext);

    const { subject, htmlContent } = renderCustomEmailHtml({
      templateKey: 'passwordReset',
      emailTemplates: this.emailTemplates,
      branding: this.branding,
      footerConfig: this.footerConfig,
      temporaryPassword,
      recipientEmail: userEmail,
      recipientName: userName
    });

    return this.sendEmail({
      toEmail: userEmail,
      toName: userName,
      subject,
      htmlContent,
      type: 'password_reset'
    });
  }

  /**
   * Send Test Email via Brevo synced with current site branding & template
   */
  public async sendTestEmail(
    targetEmail: string,
    targetName?: string,
    siteContext?: {
      branding?: SiteBranding;
      footerConfig?: FooterConfig;
      emailTemplates?: EmailTemplatesConfig;
    },
    templateKey: 'orderReceipt' | 'adminOrderAlert' | 'passwordReset' = 'orderReceipt'
  ): Promise<any> {
    if (siteContext) this.setSiteContext(siteContext);

    const sampleOrder: Order = {
      id: 'ORD-TEST-001',
      customerId: 'test',
      customerEmail: targetEmail,
      customerName: targetName || 'Site Administrator',
      customerPhone: this.footerConfig.whatsappNumber || '+233 24 555 0192',
      serviceId: 'srv-whatsapp',
      serviceName: 'Direct WhatsApp Inbound Ad Funnel',
      packageId: 'pkg-lite',
      packageName: 'QUICK START - LITE (2 Days)',
      fundingArrangement: 'COMBINED',
      pricingCurrency: 'USD',
      adBudgetUSD: 4,
      agencyFeeUSD: 2.5,
      taxUSD: 0,
      totalUSD: 6.5,
      paymentCurrency: 'GHS',
      appliedExchangeRate: 15.45,
      exchangeRateMarginPercent: 2,
      paymentAdBudget: 60,
      paymentAgencyFee: 40,
      paymentTax: 0,
      paymentTotal: 100,
      rateSnapshot: {
        rateVsUSD: 15.45,
        timestamp: new Date().toISOString(),
        expiresAt: new Date().toISOString()
      },
      paymentStatus: 'PAID',
      paymentReference: 'pstk_test_template_preview',
      campaignBrief: {
        businessName: this.branding.siteShortName || 'AdPulse Global',
        platform: 'both',
        objective: 'WhatsApp Conversations',
        targetLocations: 'Ghana',
        targetAge: '20 - 55',
        targetInterests: 'Buyers',
        headline: 'Sample Ad Headline',
        primaryText: 'Sample Ad Copy',
        callToAction: 'Send WhatsApp Message',
        destinationUrl: 'https://wa.me/'
      },
      campaignStatus: 'SUBMITTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { subject, htmlContent } = renderCustomEmailHtml({
      templateKey,
      emailTemplates: this.emailTemplates,
      branding: this.branding,
      footerConfig: this.footerConfig,
      order: sampleOrder,
      temporaryPassword: 'TempPreviewKey2026!',
      recipientEmail: targetEmail,
      recipientName: targetName
    });

    return this.sendEmail({
      toEmail: targetEmail,
      toName: targetName || 'Administrator',
      subject: `[TEST] ${subject}`,
      htmlContent,
      type: 'test'
    });
  }
}
