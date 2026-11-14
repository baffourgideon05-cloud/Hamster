import {
  EmailTemplatesConfig,
  SiteBranding,
  FooterConfig,
  Order
} from '../types/index.ts';

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplatesConfig = {
  accentColor: '#059669',
  includeLogo: true,
  orderReceipt: {
    subject: 'Order Confirmed: {{packageName}} (#{{orderId}}) — {{siteShortName}}',
    heading: 'Payment Received & Verified',
    subheading: 'Your Done-For-You Campaign Setup Has Begun',
    bodyIntro:
      'Hello {{customerName}}, thank you for choosing {{siteShortName}}. We have verified your payment for your Facebook & Instagram advertising campaign.',
    highlightTitle: '100% Done-For-You Campaign Launch',
    highlightBody:
      'Our specialists are configuring your audience targeting, ad creative, and routing incoming buyer messages straight to {{customerPhone}}.',
    footerNote:
      'You can sign in to your Client Portal using {{customerEmail}} anytime to track impressions, clicks, and campaign updates. Need help? Call {{agencyPhone}} or WhatsApp {{whatsappNumber}}.',
    signOff: 'Warm regards,\nThe {{siteShortName}} Campaign Team'
  },
  adminOrderAlert: {
    subject: 'New Paid Order: {{packageName}} — {{totalPaid}} ({{customerName}}) | {{siteShortName}}',
    heading: 'New Campaign Order Paid',
    subheading: 'Verified Paystack Checkout Alert · {{siteShortName}}',
    bodyIntro:
      'A new customer order has just been verified on Paystack for {{siteShortName}}. Please launch the Meta campaign within 24 hours.',
    highlightTitle: 'Verified Settlement Summary',
    highlightBody:
      'Customer {{customerName}} ({{customerEmail}}) paid {{totalPaid}} for {{packageName}}. Target WhatsApp: {{customerPhone}}.',
    footerNote:
      'Open the {{siteShortName}} Management Suite to assign staff and update live campaign delivery status.',
    signOff: 'Automated Billing Desk · {{siteShortName}}'
  },
  passwordReset: {
    subject: 'Account Password Reset Key — {{siteShortName}}',
    heading: 'Password Reset Instructions',
    subheading: '{{siteShortName}} Security Verification Desk',
    bodyIntro:
      'Hello {{customerName}}, a password reset was authorized for your {{siteShortName}} account ({{customerEmail}}). Use the temporary key below to sign in:',
    highlightTitle: 'Temporary Access Key',
    highlightBody: '{{temporaryPassword}}',
    footerNote:
      'If you did not request this reset, contact {{agencyEmail}} or {{agencyPhone}} immediately.',
    signOff: 'Security Desk · {{siteShortName}}'
  }
};

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function substituteEmailTokens(
  input: string,
  tokens: Record<string, string>
): string {
  let output = String(input || '');
  for (const [key, val] of Object.entries(tokens)) {
    const safeVal = val ?? '';
    output = output.split(`{{${key}}}`).join(safeVal);
  }
  return output;
}

export function buildTokenMap(params: {
  branding: SiteBranding;
  footerConfig: FooterConfig;
  order?: Order;
  temporaryPassword?: string;
  recipientEmail?: string;
  recipientName?: string;
}): Record<string, string> {
  const { branding, footerConfig, order, temporaryPassword, recipientEmail, recipientName } = params;
  const formattedTotal = order
    ? `${order.paymentCurrency === 'GHS' ? 'GH₵' : order.paymentCurrency} ${order.paymentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'GH₵ 0.00';

  return {
    siteTitle: branding.siteTitle || 'AdPulse Global',
    siteShortName: branding.siteShortName || 'AdPulse Global',
    agencyEmail: footerConfig.email || 'hello@adpulse.agency',
    agencyPhone: footerConfig.phone || '+233 30 299 4411',
    agencyAddress: footerConfig.address || 'Accra, Ghana',
    whatsappNumber: footerConfig.whatsappNumber || footerConfig.phone || '',
    copyrightNotice:
      footerConfig.copyrightNotice ||
      `© ${new Date().getFullYear()} ${branding.siteShortName || 'AdPulse Global'}. All rights reserved.`,
    customerName: order?.customerName || recipientName || 'Valued Client',
    customerEmail: order?.customerEmail || recipientEmail || 'client@company.com',
    customerPhone: order?.customerPhone || footerConfig.whatsappNumber || '',
    orderId: order?.id || 'ORD-SAMPLE-001',
    packageName: order?.packageName || order?.serviceName || 'PACKAGE 2 - STANDARD',
    totalPaid: formattedTotal,
    paystackRef: order?.paymentReference || 'pstk_live_verified',
    temporaryPassword: temporaryPassword || 'TempKey2026!',
    year: String(new Date().getFullYear())
  };
}

export function renderCustomEmailHtml(params: {
  templateKey: 'orderReceipt' | 'adminOrderAlert' | 'passwordReset';
  emailTemplates?: EmailTemplatesConfig;
  branding: SiteBranding;
  footerConfig: FooterConfig;
  order?: Order;
  temporaryPassword?: string;
  recipientEmail?: string;
  recipientName?: string;
}): { subject: string; htmlContent: string } {
  const templates = params.emailTemplates || DEFAULT_EMAIL_TEMPLATES;
  const template = templates[params.templateKey] || DEFAULT_EMAIL_TEMPLATES[params.templateKey];
  const accent = templates.accentColor || '#059669';
  const includeLogo = templates.includeLogo !== false;

  const rawTokens = buildTokenMap(params);
  const htmlTokens: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawTokens)) {
    htmlTokens[k] = escapeHtml(v);
  }

  const subject = substituteEmailTokens(template.subject, rawTokens);
  const heading = substituteEmailTokens(template.heading, htmlTokens);
  const subheading = substituteEmailTokens(template.subheading, htmlTokens);
  const bodyIntro = substituteEmailTokens(template.bodyIntro, htmlTokens).replace(/\n/g, '<br>');
  const highlightTitle = substituteEmailTokens(template.highlightTitle, htmlTokens);
  const highlightBody = substituteEmailTokens(template.highlightBody, htmlTokens).replace(/\n/g, '<br>');
  const footerNote = substituteEmailTokens(template.footerNote, htmlTokens).replace(/\n/g, '<br>');
  const signOff = substituteEmailTokens(template.signOff, htmlTokens).replace(/\n/g, '<br>');

  const brandNameSafe = escapeHtml(params.branding.siteShortName || 'AdPulse Global');
  const badgeTextSafe = escapeHtml(params.branding.logoBadgeText || 'AP');
  const logoHtml = includeLogo
    ? params.branding.logoUrl
      ? `<img src="${escapeHtml(params.branding.logoUrl)}" alt="${brandNameSafe}" style="height:40px;width:auto;border-radius:8px;margin-bottom:10px;background:#ffffff;padding:3px;" />`
      : `<div style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:10px;background:#ffffff;color:#0a0a0a;font-weight:900;font-size:14px;margin-bottom:10px;text-align:center;">${badgeTextSafe}</div>`
    : '';

  const detailsCardHtml =
    params.templateKey === 'orderReceipt' || params.templateKey === 'adminOrderAlert'
      ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:18px 0;font-size:13px;">
        <tr>
          <td style="padding:7px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Order Reference</td>
          <td style="padding:7px 0;color:#111827;font-family:monospace;font-weight:700;text-align:right;border-bottom:1px solid #f3f4f6;">${htmlTokens.orderId}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Package</td>
          <td style="padding:7px 0;color:#111827;font-weight:700;text-align:right;border-bottom:1px solid #f3f4f6;">${htmlTokens.packageName}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">WhatsApp Number</td>
          <td style="padding:7px 0;color:#111827;font-family:monospace;text-align:right;border-bottom:1px solid #f3f4f6;">${htmlTokens.customerPhone}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Paystack Reference</td>
          <td style="padding:7px 0;color:#111827;font-family:monospace;text-align:right;border-bottom:1px solid #f3f4f6;">${htmlTokens.paystackRef}</td>
        </tr>
        <tr>
          <td style="padding:9px 0 2px 0;color:#111827;font-weight:800;font-size:14px;">Total Paid</td>
          <td style="padding:9px 0 2px 0;color:${escapeHtml(accent)};font-family:monospace;font-weight:800;font-size:15px;text-align:right;">${htmlTokens.totalPaid}</td>
        </tr>
      </table>`
      : '';

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f4f4f5;margin:0;padding:24px;color:#111827;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
    <div style="background:#0a0a0a;color:#ffffff;padding:28px 26px;text-align:center;border-bottom:4px solid ${escapeHtml(accent)};">
      ${logoHtml}
      <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${escapeHtml(accent)};margin-bottom:6px;">${brandNameSafe}</div>
      <h1 style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.4px;">${heading}</h1>
      <p style="margin:6px 0 0 0;color:#a1a1aa;font-size:13px;">${subheading}</p>
    </div>

    <div style="padding:28px 26px;font-size:14px;line-height:1.6;color:#27272a;">
      <p style="margin-top:0;">${bodyIntro}</p>

      <div style="background:#f8fafc;border-left:4px solid ${escapeHtml(accent)};border-radius:8px;padding:14px 16px;margin:18px 0;">
        <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:${escapeHtml(accent)};margin-bottom:4px;">${highlightTitle}</div>
        <div style="font-size:${params.templateKey === 'passwordReset' ? '18px;font-family:monospace;font-weight:800;letter-spacing:1px;' : '13px;'}color:#111827;">${highlightBody}</div>
      </div>

      ${detailsCardHtml}

      <p style="font-size:13px;color:#52525b;margin:18px 0;">${footerNote}</p>

      <p style="font-size:13px;color:#3f3f46;margin:22px 0 0 0;font-weight:600;">${signOff}</p>
    </div>

    <div style="background:#fafafa;text-align:center;padding:18px 24px;font-size:11px;color:#71717a;border-top:1px solid #f4f4f5;">
      <div>${htmlTokens.copyrightNotice}</div>
      <div style="margin-top:4px;">${htmlTokens.agencyEmail} · ${htmlTokens.agencyPhone} · ${htmlTokens.agencyAddress}</div>
    </div>
  </div>
</body>
</html>`;

  return { subject, htmlContent };
}
