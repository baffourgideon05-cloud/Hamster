export type CurrencyCode = 'USD' | 'GHS' | 'EUR' | 'GBP' | 'NGN' | 'KES' | 'ZAR' | 'CAD';

export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  precision: number;
  rateVsUSD: number; // units of this currency per 1 USD
  previousRateVsUSD: number;
  lastUpdated: string;
  source: string;
  status: 'active' | 'inactive';
  supportedForPayment: boolean; // Native Paystack checkout
  marginPercent: number; // e.g. 2%
}

export interface RateChangeDetection {
  currency: CurrencyCode;
  previousRate: number;
  currentRate: number;
  absoluteChange: number;
  percentageChange: number;
  direction: 'UP' | 'DOWN' | 'STABLE';
  timestamp: string;
  alertTriggered: boolean;
  boostApplied?: number;
}

export interface PricingConfig {
  defaultMethod: 'PERCENTAGE' | 'FIXED' | 'COMBINED';
  defaultMarkupPercent: number;
  defaultFixedFee: number;
  minimumAgencyFee: number;
  minCampaignBudget: number;
  maxCampaignBudget: number;
  taxPercent: number;
  roundingRule: 'ROUND_UP' | 'STANDARD' | 'NONE';
  exchangeRateMarginPercent: number;
  checkoutQuoteExpiryMinutes: number;
  rateAlertThresholdPercent: number;
}

export type FundingArrangement = 'COMBINED' | 'MANAGEMENT_ONLY';

export interface AdvertisingService {
  id: string;
  name: string;
  category: string;
  description: string;
  objectives: string[];
  pricingMethod: 'PERCENTAGE' | 'FIXED' | 'COMBINED';
  markupPercent: number;
  fixedFee: number;
  minBudget: number;
  defaultDurationDays: number;
  availableDurations: number[];
  isPublished: boolean;
  features: string[];
}

export interface AdvertisingPackage {
  id: string;
  name: string;
  tier: 'Starter' | 'Growth' | 'Scale' | 'Enterprise' | 'Standard' | 'Pro' | string;
  serviceId: string;
  recommendedFor: string;
  advertisingBudgetUSD: number;
  durationDays: number;
  managementFeeUSD: number;
  priceGHS?: number;
  advertisingBudgetGHS?: number;
  managementFeeGHS?: number;
  expectedMessages?: string;
  includedServices: string[];
  supportLevel: string;
  reportingFrequency: string;
  isPopular?: boolean;
  status: 'active' | 'inactive';
}

export interface CampaignBrief {
  businessName: string;
  websiteUrl?: string;
  platform: 'facebook' | 'instagram' | 'both';
  objective: string;
  targetLocations: string;
  targetAge: string;
  targetInterests: string;
  headline: string;
  primaryText: string;
  callToAction: string;
  destinationUrl: string;
  facebookPageOrHandle?: string;
  specialInstructions?: string;
}

export interface CampaignPerformance {
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  spendUSD: number;
  roas: number;
  lastUpdated: string;
  metaCampaignId?: string;
}

export type CampaignStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'LAUNCHED_ACTIVE' | 'COMPLETED';

export interface Order {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  packageId?: string;
  packageName?: string;
  fundingArrangement: FundingArrangement;
  
  // Financial breakdown in pricing currency (base USD)
  pricingCurrency: CurrencyCode;
  adBudgetUSD: number;
  agencyFeeUSD: number;
  taxUSD: number;
  totalUSD: number;
  
  // Payment breakdown in checkout currency (e.g. GHS, NGN, USD, ZAR)
  paymentCurrency: CurrencyCode;
  appliedExchangeRate: number; // rate used for conversion
  exchangeRateMarginPercent: number;
  paymentAdBudget: number;
  paymentAgencyFee: number;
  paymentTax: number;
  paymentTotal: number;
  
  // Rate snapshot for price stability
  rateSnapshot: {
    rateVsUSD: number;
    timestamp: string;
    expiresAt: string;
  };
  
  // Paystack transaction details
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentReference?: string;
  paymentChannel?: string;
  paidAt?: string;
  receiptNumber?: string;
  
  // Campaign requirements & state
  campaignBrief: CampaignBrief;
  campaignStatus: CampaignStatus;
  assignedStaff?: string;
  reviewNotes?: string;
  performance?: CampaignPerformance;
  
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteFaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface WebsiteProcessStep {
  step: string;
  title: string;
  description: string;
}

export interface WebsiteKpiItem {
  value: string;
  label: string;
  sublabel: string;
}

export interface WebsiteContent {
  headline: string;
  subheadline: string;
  metaDescription?: string;
  heroBadgeText?: string;
  heroBadgeSubtext?: string;
  heroPrimaryCta?: string;
  heroSecondaryCta?: string;
  heroVisualEyebrow?: string;
  heroVisualTitle?: string;
  heroVisualSubtitle?: string;
  heroKpis?: WebsiteKpiItem[];
  packagesSectionBadge?: string;
  packagesSectionTitle?: string;
  packagesSectionSubtitle?: string;
  checkoutSectionEyebrow?: string;
  checkoutSectionTitle?: string;
  checkoutSectionSubtitle?: string;
  processSectionEyebrow?: string;
  processSectionTitle?: string;
  processSectionSubtitle?: string;
  processSteps?: WebsiteProcessStep[];
  faqSectionEyebrow?: string;
  faqSectionTitle?: string;
  faqSectionSubtitle?: string;
  agencyEmail: string;
  agencyPhone: string;
  agencyAddress: string;
  businessHours: string;
  faqs: WebsiteFaqItem[];
  termsOfService: string;
  privacyPolicy: string;
  refundPolicy: string;
  serviceAgreement: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'admin' | 'staff';
  authProvider: 'email' | 'google';
  passwordHash?: string;
  avatarUrl?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
}

export interface PasswordResetRequest {
  id: string;
  userEmail: string;
  userName: string;
  requestedAt: string;
  status: 'pending' | 'resolved';
  temporaryPassword?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface SiteBranding {
  siteTitle: string;
  siteShortName: string;
  logoUrl: string;
  logoBadgeText: string;
  adminGoogleEmail: string; // The authorized Google Account for admin login
}

export interface FooterConfig {
  phone: string;
  email: string;
  address: string;
  businessHours: string;
  whatsappNumber: string;
  aboutText: string;
  copyrightNotice: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
}

export interface AutoRateEngineConfig {
  enabled: boolean;
  pollIntervalSeconds: number; // e.g. 60s
  sensitivityPercent: number; // e.g. 0.5%
  autoBoostMarginPercent: number; // boost added upon upward volatility
  lastAutoDetection?: string;
  autoLogs: RateChangeDetection[];
}

export interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  isLive: boolean;
}

export interface BrevoConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  isEnabled: boolean;
  notifyAdminOnOrder: boolean;
  adminNotifyEmail: string;
}

export interface EmailTemplateItem {
  subject: string;
  heading: string;
  subheading: string;
  bodyIntro: string;
  highlightTitle: string;
  highlightBody: string;
  footerNote: string;
  signOff: string;
}

export interface EmailTemplatesConfig {
  accentColor: string;
  includeLogo: boolean;
  orderReceipt: EmailTemplateItem;
  adminOrderAlert: EmailTemplateItem;
  passwordReset: EmailTemplateItem;
}

export interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  type: 'order_receipt' | 'admin_order_notification' | 'password_reset' | 'test';
  sentAt: string;
  status: 'sent' | 'failed' | 'simulated';
  messageId?: string;
  error?: string;
}

