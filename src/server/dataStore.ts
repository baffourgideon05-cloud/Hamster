import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Currency,
  CurrencyCode,
  PricingConfig,
  AdvertisingService,
  AdvertisingPackage,
  Order,
  WebsiteContent,
  RateChangeDetection,
  FundingArrangement,
  UserAccount,
  PasswordResetRequest,
  SiteBranding,
  FooterConfig,
  AutoRateEngineConfig,
  PaystackConfig,
  BrevoConfig,
  EmailLog,
  EmailTemplatesConfig
} from '../types/index.ts';
import { DEFAULT_EMAIL_TEMPLATES } from './emailTemplates.ts';
import { hashPassword, isLegacySha256Hash, verifyPassword } from './security.ts';

const DATA_FILE_PATH = path.resolve(process.cwd(), '.data_adpulse.json');

export interface AppDatabase {
  branding: SiteBranding;
  footerConfig: FooterConfig;
  currencies: Currency[];
  rateHistory: RateChangeDetection[];
  autoRateEngine: AutoRateEngineConfig;
  pricingConfig: PricingConfig;
  services: AdvertisingService[];
  packages: AdvertisingPackage[];
  orders: Order[];
  users: UserAccount[];
  resetRequests: PasswordResetRequest[];
  content: WebsiteContent;
  paystackConfig: PaystackConfig;
  brevoConfig: BrevoConfig;
  emailTemplates: EmailTemplatesConfig;
  emailLogs: EmailLog[];
  updatedAt?: string;
}

const DEFAULT_BRANDING: SiteBranding = {
  siteTitle: 'AdPulse Global | Meta Advertising Agency & Campaign Platform',
  siteShortName: 'AdPulse Global',
  logoUrl: '',
  logoBadgeText: 'AP',
  adminGoogleEmail: 'baffourgideon05@gmail.com'
};

const DEFAULT_PAYSTACK_CONFIG: PaystackConfig = {
  secretKey: process.env.PAYSTACK_SECRET_KEY || '',
  publicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b',
  isLive: true
};

const DEFAULT_BREVO_CONFIG: BrevoConfig = {
  apiKey: process.env.BREVO_API_KEY || '',
  senderEmail: process.env.BREVO_SENDER_EMAIL || 'baffourgideon05@gmail.com',
  senderName: process.env.BREVO_SENDER_NAME || 'AdPulse Global',
  isEnabled: true,
  notifyAdminOnOrder: true,
  adminNotifyEmail: 'baffourgideon05@gmail.com'
};

const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  phone: '+233 30 299 4411',
  email: 'hello@adpulse.agency',
  address: 'Floor 7, Heritage Tower, Ambassadorial Enclave, Ridge, Accra, Ghana',
  businessHours: 'Monday – Friday: 8:00 AM – 6:00 PM GMT',
  whatsappNumber: '+233 24 555 0192',
  aboutText: 'International Meta advertising agency providing automated campaign pricing, multi-currency settlement, and high-ROI Facebook & Instagram performance marketing.',
  copyrightNotice: `© ${new Date().getFullYear()} AdPulse Global Advertising Ltd. All rights reserved.`,
  facebookUrl: 'https://facebook.com/adpulseagency',
  instagramUrl: 'https://instagram.com/adpulseagency',
  linkedinUrl: 'https://linkedin.com/company/adpulseagency'
};

const DEFAULT_CURRENCIES: Currency[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    precision: 2,
    rateVsUSD: 1.0,
    previousRateVsUSD: 1.0,
    lastUpdated: new Date().toISOString(),
    source: 'Federal Reserve / Global Interbank',
    status: 'active',
    supportedForPayment: true,
    marginPercent: 0
  },
  {
    code: 'GHS',
    name: 'Ghanaian Cedi',
    symbol: 'GH₵',
    precision: 2,
    rateVsUSD: 15.45,
    previousRateVsUSD: 15.20,
    lastUpdated: new Date().toISOString(),
    source: 'Bank of Ghana / OpenExchange',
    status: 'active',
    supportedForPayment: true,
    marginPercent: 2.0
  },
  {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    precision: 2,
    rateVsUSD: 1485.0,
    previousRateVsUSD: 1470.0,
    lastUpdated: new Date().toISOString(),
    source: 'Central Bank of Nigeria / Interbank',
    status: 'active',
    supportedForPayment: true,
    marginPercent: 2.0
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    precision: 2,
    rateVsUSD: 0.92,
    previousRateVsUSD: 0.925,
    lastUpdated: new Date().toISOString(),
    source: 'European Central Bank',
    status: 'active',
    supportedForPayment: false,
    marginPercent: 1.5
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    precision: 2,
    rateVsUSD: 0.78,
    previousRateVsUSD: 0.785,
    lastUpdated: new Date().toISOString(),
    source: 'Bank of England',
    status: 'active',
    supportedForPayment: false,
    marginPercent: 1.5
  },
  {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    precision: 2,
    rateVsUSD: 18.25,
    previousRateVsUSD: 18.40,
    lastUpdated: new Date().toISOString(),
    source: 'South African Reserve Bank',
    status: 'active',
    supportedForPayment: true,
    marginPercent: 2.0
  },
  {
    code: 'KES',
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    precision: 2,
    rateVsUSD: 129.5,
    previousRateVsUSD: 130.0,
    lastUpdated: new Date().toISOString(),
    source: 'Central Bank of Kenya',
    status: 'active',
    supportedForPayment: false,
    marginPercent: 2.0
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$',
    precision: 2,
    rateVsUSD: 1.38,
    previousRateVsUSD: 1.37,
    lastUpdated: new Date().toISOString(),
    source: 'Bank of Canada',
    status: 'active',
    supportedForPayment: false,
    marginPercent: 1.5
  }
];

const DEFAULT_PRICING_CONFIG: PricingConfig = {
  defaultMethod: 'PERCENTAGE',
  defaultMarkupPercent: 20,
  defaultFixedFee: 15,
  minimumAgencyFee: 25,
  minCampaignBudget: 20,
  maxCampaignBudget: 50000,
  taxPercent: 0,
  roundingRule: 'ROUND_UP',
  exchangeRateMarginPercent: 2.0,
  checkoutQuoteExpiryMinutes: 30,
  rateAlertThresholdPercent: 2.0
};

const DEFAULT_AUTO_RATE_ENGINE: AutoRateEngineConfig = {
  enabled: true,
  pollIntervalSeconds: 60,
  sensitivityPercent: 0.5,
  autoBoostMarginPercent: 2.0,
  lastAutoDetection: new Date().toISOString(),
  autoLogs: [
    {
      currency: 'GHS',
      previousRate: 15.20,
      currentRate: 15.45,
      absoluteChange: 0.25,
      percentageChange: 1.64,
      direction: 'UP',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      alertTriggered: false,
      boostApplied: 2.0
    }
  ]
};

const DEFAULT_SERVICES: AdvertisingService[] = [
  {
    id: 'srv-leads',
    name: 'Facebook & Instagram Lead Generation Engine',
    category: 'Lead Generation',
    description: 'High-converting instant lead forms, targeted B2B and consumer audience profiling, CRM sync readiness, and qualified sales prospect generation.',
    objectives: ['Lead Generation', 'Phone Call Inquiries', 'Qualified Registrations'],
    pricingMethod: 'PERCENTAGE',
    markupPercent: 20,
    fixedFee: 25,
    minBudget: 50,
    defaultDurationDays: 30,
    availableDurations: [7, 14, 30, 60],
    isPublished: true,
    features: [
      'Meta Instant Forms & CRM integration',
      'Audience demographic & interest clustering',
      '2–3 ad creative variants (video & carousel)',
      'Real-time spam filtering & phone verification setup',
      'Weekly performance reporting'
    ]
  },
  {
    id: 'srv-whatsapp',
    name: 'Direct WhatsApp Inbound Ad Funnel',
    category: 'Conversational Commerce',
    description: 'Direct click-to-WhatsApp messaging ads designed for rapid local engagement, product inquiries, appointments, and direct instant customer conversations.',
    objectives: ['WhatsApp Conversations', 'Instant Inquiries', 'Local Sales'],
    pricingMethod: 'PERCENTAGE',
    markupPercent: 18,
    fixedFee: 20,
    minBudget: 30,
    defaultDurationDays: 14,
    availableDurations: [7, 14, 30],
    isPublished: true,
    features: [
      'Click-to-WhatsApp business CTA integration',
      'Pre-populated welcome prompt templates',
      'Hyper-local geolocation targeting',
      'Rapid campaign deployment within 24 hours'
    ]
  },
  {
    id: 'srv-conversions',
    name: 'Full-Funnel Meta Sales & E-Commerce Conversions',
    category: 'Conversions & Sales',
    description: 'Advanced Pixel & Conversions API (CAPI) ad campaigns engineered to generate verified checkout purchases, add-to-carts, and measurable ROAS.',
    objectives: ['E-Commerce Sales', 'Website Purchases', 'Catalog Sales'],
    pricingMethod: 'PERCENTAGE',
    markupPercent: 22,
    fixedFee: 35,
    minBudget: 100,
    defaultDurationDays: 30,
    availableDurations: [14, 30, 60],
    isPublished: true,
    features: [
      'Meta Pixel & CAPI server-side event tracking',
      'Dynamic product catalog ads (DPA)',
      'Lookalike audience creation (1%–3%)',
      'Conversion rate optimization copy testing',
      'Bi-weekly attribution & ROAS reporting'
    ]
  },
  {
    id: 'srv-retargeting',
    name: 'High-Impact Audience Retargeting Suite',
    category: 'Retargeting',
    description: 'Re-engage cart abandoners, past website visitors, Instagram profile interactors, and existing email lists to dramatically boost conversion rates.',
    objectives: ['Cart Recovery', 'Past Visitor Re-engagement', 'Cross-Sell'],
    pricingMethod: 'PERCENTAGE',
    markupPercent: 20,
    fixedFee: 25,
    minBudget: 40,
    defaultDurationDays: 30,
    availableDurations: [14, 30, 60],
    isPublished: true,
    features: [
      'Custom audience segmentation (7, 14, 30, 90 days)',
      'Frequency capping to avoid ad fatigue',
      'Exclusive urgency & discount promotional hooks',
      'Cross-platform Facebook + Instagram Stories/Reels'
    ]
  },
  {
    id: 'srv-awareness',
    name: 'Brand Awareness & Video Viral Reach',
    category: 'Brand Recognition',
    description: 'Maximized brand visibility, video views, and authority positioning across Facebook Feeds, Instagram Reels, and Explore channels.',
    objectives: ['Reach', 'Video Views', 'Brand Awareness'],
    pricingMethod: 'COMBINED',
    markupPercent: 15,
    fixedFee: 20,
    minBudget: 35,
    defaultDurationDays: 14,
    availableDurations: [7, 14, 30],
    isPublished: true,
    features: [
      'Broad & interest-optimized reach algorithms',
      'Reels & 9:16 vertical video placements',
      'Lowest cost-per-thousand (CPM) bidding strategy',
      'Engagement and social proof amplification'
    ]
  }
];

const DEFAULT_PACKAGES: AdvertisingPackage[] = [
  {
    id: 'pkg-lite',
    name: 'QUICK START - LITE',
    tier: 'Lite',
    serviceId: 'srv-whatsapp',
    recommendedFor: 'Best for first-time sellers and small side-hustles testing WhatsApp ads on a budget before scaling up.',
    advertisingBudgetUSD: 4,
    durationDays: 2,
    managementFeeUSD: 2.5,
    priceGHS: 100,
    advertisingBudgetGHS: 60,
    managementFeeGHS: 40,
    expectedMessages: '20-40 WhatsApp Messages Expected',
    includedServices: [
      '2 Days Campaign',
      '20-40 WhatsApp Messages Expected',
      'Done-For-You Ad Setup & Local Targeting',
      'Direct Click-to-WhatsApp Buyer Routing',
      'Product Ad Copy & Launch Within 24 Hours'
    ],
    supportLevel: 'WhatsApp Support',
    reportingFrequency: 'End of campaign summary',
    isPopular: false,
    status: 'active'
  },
  {
    id: 'pkg-starter',
    name: 'PACKAGE 1 - STARTER',
    tier: 'Starter',
    serviceId: 'srv-whatsapp',
    recommendedFor: 'Perfect for small shops, boutiques, and entrepreneurs starting out to get direct WhatsApp inquiries.',
    advertisingBudgetUSD: 10,
    durationDays: 5,
    managementFeeUSD: 6.2,
    priceGHS: 250,
    advertisingBudgetGHS: 150,
    managementFeeGHS: 100,
    expectedMessages: '50-100 WhatsApp Messages Expected',
    includedServices: [
      '5 Days Campaign',
      '50-100 WhatsApp Messages Expected',
      'Professional Ad Setup & Targeting',
      'Click-to-WhatsApp Direct Inbound Routing',
      'Local Audience Demographic Tuning',
      'Ad Creative Design & Copy'
    ],
    supportLevel: 'WhatsApp Support',
    reportingFrequency: 'End of campaign report',
    isPopular: false,
    status: 'active'
  },
  {
    id: 'pkg-standard',
    name: 'PACKAGE 2 - STANDARD - MOST POPULAR',
    tier: 'Standard',
    serviceId: 'srv-whatsapp',
    recommendedFor: 'Our #1 most popular package for businesses ready for daily buyer messages and steady customer growth.',
    advertisingBudgetUSD: 18,
    durationDays: 7,
    managementFeeUSD: 11,
    priceGHS: 450,
    advertisingBudgetGHS: 270,
    managementFeeGHS: 180,
    expectedMessages: '70-140 WhatsApp Messages Expected',
    includedServices: [
      '7 Days Campaign',
      '70-140 WhatsApp Messages Expected',
      'Professional Ad Setup + Targeting',
      'Daily Updates + Reply Script to Close Sales',
      'High-Intent Buyer Audience Clustering',
      'A/B Creative & Hook Testing'
    ],
    supportLevel: 'Priority WhatsApp Desk',
    reportingFrequency: 'Daily Updates & Mid-Campaign Check',
    isPopular: true,
    status: 'active'
  },
  {
    id: 'pkg-pro',
    name: 'PACKAGE 3 - PRO',
    tier: 'Pro',
    serviceId: 'srv-whatsapp',
    recommendedFor: 'For established brands and high-volume sellers demanding maximum WhatsApp lead volume.',
    advertisingBudgetUSD: 26,
    durationDays: 10,
    managementFeeUSD: 16,
    priceGHS: 650,
    advertisingBudgetGHS: 400,
    managementFeeGHS: 250,
    expectedMessages: '100-200 WhatsApp Messages Expected',
    includedServices: [
      '10 Days Campaign',
      '100-200 WhatsApp Messages Expected',
      '2 Ad Designs + Advanced Targeting',
      'Full Support',
      'Daily Performance Optimization',
      'Sales Closing Script & WhatsApp Strategy'
    ],
    supportLevel: 'Full VIP Support',
    reportingFrequency: 'Daily Performance Tracking',
    isPopular: false,
    status: 'active'
  }
];

const DEFAULT_ORDERS: Order[] = [];

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr-admin-gideon',
    email: 'baffourgideon05@gmail.com',
    name: 'Gideon Baffour',
    phone: '+233 24 100 2000',
    role: 'admin',
    authProvider: 'email',
    passwordHash: hashPassword('TaNGOCAR123_'),
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=gideon',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

const DEFAULT_RESET_REQUESTS: PasswordResetRequest[] = [];

const DEFAULT_CONTENT: WebsiteContent = {
  headline: 'FACEBOOK ADS - DONE FOR YOU',
  subheadline: 'Hello boss, I will handle everything to bring you customers on WhatsApp. You just pay once.',
  metaDescription: 'Done-For-You Facebook & Instagram advertising packages with instant Paystack checkout and direct WhatsApp customer routing.',
  heroBadgeText: 'Done-For-You Ads',
  heroBadgeSubtext: 'Facebook & Instagram · Direct WhatsApp Buyers',
  heroPrimaryCta: 'Choose Your Package',
  heroSecondaryCta: 'Go to Instant Checkout',
  heroVisualEyebrow: 'Done-For-You WhatsApp Ads',
  heroVisualTitle: 'Real Customers Messaging Your WhatsApp Daily',
  heroVisualSubtitle: 'Pick a package, drop your WhatsApp number, and pay once. We handle targeting, designs, and launch.',
  heroKpis: [
    {
      value: '50–200+',
      label: 'WhatsApp Buyer Inquiries',
      sublabel: 'Expected direct chats depending on selected tier'
    },
    {
      value: '1x Pay',
      label: 'All-Inclusive Total Price',
      sublabel: 'Pay once with zero extra setup charges or surprises'
    },
    {
      value: 'Paystack',
      label: 'MoMo & Card Checkout',
      sublabel: 'MTN MoMo, Telecel Cash, AT Money, Cards, GHS, NGN, USD'
    },
    {
      value: '24h',
      label: 'Fast Campaign Launch',
      sublabel: 'Ad design, audience targeting, and live launch handled for you'
    }
  ],
  packagesSectionBadge: 'FACEBOOK ADS - DONE FOR YOU',
  packagesSectionTitle: 'Choose Your Package & Get Started Today',
  packagesSectionSubtitle: 'Hello boss, I will handle everything to bring you customers on WhatsApp. You just pay once.',
  checkoutSectionEyebrow: 'SECTION 3 · INSTANT ORDER',
  checkoutSectionTitle: 'Complete Your Order & Launch Today',
  checkoutSectionSubtitle: 'Select your package, enter your WhatsApp number, and pay once. We handle all the ad work for you.',
  processSectionEyebrow: 'Simple Done-For-You Process',
  processSectionTitle: 'From Payment to Customers on Your WhatsApp',
  processSectionSubtitle: 'No complicated forms or technical setup. You select your package, pay once, and we launch everything for you within 24 hours.',
  processSteps: [
    {
      step: '01',
      title: 'Choose Your Package',
      description: 'Pick Lite (GH₵ 100), Starter (GH₵ 250), Standard (GH₵ 450), or Pro (GH₵ 650) with one simple total price.'
    },
    {
      step: '02',
      title: 'Enter Your WhatsApp Number',
      description: 'Tell us your name, email, and the WhatsApp number where interested buyers should message you.'
    },
    {
      step: '03',
      title: 'Pay Once via Paystack',
      description: 'Complete secure payment in seconds using MTN Mobile Money, Telecel Cash, Bank Card, or USD.'
    },
    {
      step: '04',
      title: 'We Handle Everything & Launch',
      description: 'We create your ad design, configure targeting, launch on Facebook & Instagram, and bring customers to your WhatsApp.'
    }
  ],
  faqSectionEyebrow: 'Common Questions',
  faqSectionTitle: 'Frequently Asked Questions',
  faqSectionSubtitle: 'Quick answers about packages, Paystack payments, and receiving WhatsApp messages.',
  agencyEmail: 'hello@adpulse.agency',
  agencyPhone: '+233 30 299 4411',
  agencyAddress: 'Floor 7, Heritage Tower, Ambassadorial Enclave, Ridge, Accra, Ghana',
  businessHours: 'Monday – Friday: 8:00 AM – 6:00 PM GMT',
  faqs: [
    {
      id: 'faq-1',
      question: 'How does the Done For You Facebook ads service work?',
      answer: 'You choose your package and enter your WhatsApp number. We set up, design, and run high-converting Facebook and Instagram ads that send real customers straight to your WhatsApp. You pay once and we handle the rest.',
      category: 'Orders & Launch'
    },
    {
      id: 'faq-2',
      question: 'What payment methods do you accept?',
      answer: 'We accept MTN Mobile Money, Telecel Cash, AT Money, and Visa/Mastercard cards securely via Paystack.',
      category: 'Payments'
    },
    {
      id: 'faq-3',
      question: 'How quickly will customers start messaging my WhatsApp?',
      answer: 'Your ads are created and launched within 24 hours of payment. Customer messages start arriving directly to your WhatsApp as soon as ads go live.',
      category: 'Campaign Operations'
    },
    {
      id: 'faq-4',
      question: 'Can I get help closing sales from my WhatsApp messages?',
      answer: 'Yes! Our Standard and Pro packages come with proven sales reply scripts and frameworks designed to help you easily convert chatting leads into paying buyers.',
      category: 'Sales Support'
    },
    {
      id: 'faq-5',
      question: 'What do I need to provide to start?',
      answer: 'Just choose your package, enter your business name, and provide the WhatsApp phone number where you want customer messages to arrive.',
      category: 'Getting Started'
    }
  ],
  termsOfService: `AdPulse Global Terms of Service.
1. Services: We provide complete Done For You Facebook and Instagram advertising services directly routing customers to your WhatsApp.
2. Compliance: All ads comply with Meta Advertising Policies.
3. Pricing: Single total package prices with instant Paystack settlement.`,
  privacyPolicy: `AdPulse Global Privacy Policy.
We protect your customer data with extreme care. All transactions are securely processed through Paystack PCI-DSS encrypted gateways.`,
  refundPolicy: `AdPulse Global Customer Guarantee.
If your ad campaign cannot be launched for any reason prior to flight, 100% of your payment is refunded immediately.`,
  serviceAgreement: `AdPulse Global Done For You Advertising Agreement.
You pay once for complete ad creation, targeting, delivery, and WhatsApp routing.`
};

class DataStore {
  private db: AppDatabase;

  constructor() {
    this.db = this.loadData();
    this.ensureDefaults();
  }

  private loadData(): AppDatabase {
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read existing data store, initializing defaults.', e);
    }

    const initialDb: AppDatabase = {
      branding: DEFAULT_BRANDING,
      footerConfig: DEFAULT_FOOTER_CONFIG,
      currencies: DEFAULT_CURRENCIES,
      rateHistory: [],
      autoRateEngine: DEFAULT_AUTO_RATE_ENGINE,
      pricingConfig: DEFAULT_PRICING_CONFIG,
      services: DEFAULT_SERVICES,
      packages: DEFAULT_PACKAGES,
      orders: DEFAULT_ORDERS,
      users: DEFAULT_USERS,
      resetRequests: DEFAULT_RESET_REQUESTS,
      content: DEFAULT_CONTENT,
      paystackConfig: { ...DEFAULT_PAYSTACK_CONFIG },
      brevoConfig: { ...DEFAULT_BREVO_CONFIG },
      emailTemplates: JSON.parse(JSON.stringify(DEFAULT_EMAIL_TEMPLATES)),
      emailLogs: [],
      updatedAt: '2026-01-01T00:00:00.000Z'
    };

    this.saveData(initialDb);
    return initialDb;
  }

  private ensureDefaults() {
    let modified = false;
    if (!this.db.updatedAt) {
      this.db.updatedAt = '2026-01-01T00:00:00.000Z';
      modified = true;
    }
    if (!this.db.branding) {
      this.db.branding = DEFAULT_BRANDING;
      modified = true;
    }
    if (!this.db.branding.adminGoogleEmail || this.db.branding.adminGoogleEmail === 'ziziexpressonline@gmail.com') {
      this.db.branding.adminGoogleEmail = 'baffourgideon05@gmail.com';
      modified = true;
    }
    if (!this.db.footerConfig) {
      this.db.footerConfig = DEFAULT_FOOTER_CONFIG;
      modified = true;
    }
    if (!this.db.paystackConfig || !this.db.paystackConfig.secretKey || this.db.paystackConfig.secretKey.startsWith('sk_test')) {
      this.db.paystackConfig = {
        secretKey: process.env.PAYSTACK_SECRET_KEY || '',
        publicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b',
        isLive: true
      };
      modified = true;
    }
    if (!this.db.paystackConfig.publicKey) {
      this.db.paystackConfig.publicKey = process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b';
      modified = true;
    }
    if (!this.db.brevoConfig) {
      this.db.brevoConfig = { ...DEFAULT_BREVO_CONFIG };
      modified = true;
    }
    if (!this.db.emailTemplates) {
      this.db.emailTemplates = JSON.parse(JSON.stringify(DEFAULT_EMAIL_TEMPLATES));
      modified = true;
    }
    if (!this.db.emailLogs) {
      this.db.emailLogs = [];
      modified = true;
    }
    if (!this.db.autoRateEngine) {
      this.db.autoRateEngine = DEFAULT_AUTO_RATE_ENGINE;
      modified = true;
    }

    // Purge legacy demo orders & reset requests & simulated demo users
    if (Array.isArray(this.db.orders)) {
      const legacyIds = new Set(['ORD-20261028-101', 'ORD-20261028-102']);
      const cleanOrders = this.db.orders.filter(
        (o) => !legacyIds.has(o.id) && o.customerEmail.toLowerCase() !== 'kofi@test.com'
      );
      if (cleanOrders.length !== this.db.orders.length) {
        this.db.orders = cleanOrders;
        modified = true;
      }
    } else {
      this.db.orders = [];
      modified = true;
    }

    if (Array.isArray(this.db.resetRequests)) {
      const demoResetEmails = new Set(['amina@craftgh.com', 'efua.mensah@lumierewellness.gh']);
      const cleanResets = this.db.resetRequests.filter(
        (r) => !demoResetEmails.has(r.userEmail.toLowerCase())
      );
      if (cleanResets.length !== this.db.resetRequests.length) {
        this.db.resetRequests = cleanResets;
        modified = true;
      }
    } else {
      this.db.resetRequests = [];
      modified = true;
    }

    if (!this.db.users || this.db.users.length === 0) {
      this.db.users = DEFAULT_USERS;
      modified = true;
    } else {
      const demoUserEmails = new Set(['ziziexpressonline@gmail.com', 'customer.john@gmail.com']);
      const cleanUsers = this.db.users.filter((u) => !demoUserEmails.has(u.email.toLowerCase()));
      if (cleanUsers.length !== this.db.users.length) {
        this.db.users = cleanUsers;
        modified = true;
      }
    }

    const gideonUser = this.db.users.find((u) => u.email.toLowerCase() === 'baffourgideon05@gmail.com');
    if (!gideonUser) {
      this.db.users.unshift({
        id: 'usr-admin-gideon',
        email: 'baffourgideon05@gmail.com',
        name: 'Gideon Baffour',
        phone: '+233 24 100 2000',
        role: 'admin',
        authProvider: 'email',
        passwordHash: hashPassword('TaNGOCAR123_'),
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=gideon',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z'
      });
      modified = true;
    } else {
      gideonUser.role = 'admin';
      if (!verifyPassword('TaNGOCAR123_', gideonUser.passwordHash) || isLegacySha256Hash(gideonUser.passwordHash)) {
        gideonUser.passwordHash = hashPassword('TaNGOCAR123_');
        modified = true;
      }
    }

    // Ensure packages include 100 GHS Quick Start Lite as 2 Days Campaign
    if (!this.db.packages || this.db.packages.length === 0 || !this.db.packages[0].priceGHS) {
      this.db.packages = DEFAULT_PACKAGES;
      modified = true;
    } else {
      const lite = this.db.packages.find((p) => p.id === 'pkg-lite');
      if (!lite) {
        this.db.packages.unshift(DEFAULT_PACKAGES[0]);
        modified = true;
      } else {
        if (lite.durationDays === 3) {
          lite.durationDays = 2;
          modified = true;
        }
        if (Array.isArray(lite.includedServices) && lite.includedServices.includes('3 Days Campaign')) {
          lite.includedServices = lite.includedServices.map((s) =>
            s === '3 Days Campaign' ? '2 Days Campaign' : s
          );
          modified = true;
        }
      }
    }

    if (!this.db.content) {
      this.db.content = DEFAULT_CONTENT;
      modified = true;
    } else {
      const contentKeys: Array<keyof WebsiteContent> = [
        'headline',
        'subheadline',
        'metaDescription',
        'heroBadgeText',
        'heroBadgeSubtext',
        'heroPrimaryCta',
        'heroSecondaryCta',
        'heroVisualEyebrow',
        'heroVisualTitle',
        'heroVisualSubtitle',
        'heroKpis',
        'packagesSectionBadge',
        'packagesSectionTitle',
        'packagesSectionSubtitle',
        'checkoutSectionEyebrow',
        'checkoutSectionTitle',
        'checkoutSectionSubtitle',
        'processSectionEyebrow',
        'processSectionTitle',
        'processSectionSubtitle',
        'processSteps',
        'faqSectionEyebrow',
        'faqSectionTitle',
        'faqSectionSubtitle'
      ];
      for (const k of contentKeys) {
        if (this.db.content[k] === undefined) {
          (this.db.content as any)[k] = (DEFAULT_CONTENT as any)[k];
          modified = true;
        }
      }
      if (!this.db.content.faqs || this.db.content.faqs.length === 0) {
        this.db.content.faqs = DEFAULT_CONTENT.faqs;
        modified = true;
      }
    }

    if (modified) {
      this.commit();
    }
  }

  private saveData(data: AppDatabase) {
    try {
      const tmpPath = `${DATA_FILE_PATH}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DATA_FILE_PATH);
    } catch (e) {
      console.error('Error saving data store:', e);
    }
  }

  public getDb(): AppDatabase {
    return this.db;
  }

  public commit(bumpUpdatedAt = false) {
    if (bumpUpdatedAt) {
      this.db.updatedAt = new Date().toISOString();
    }
    this.saveData(this.db);
  }

  public restoreConfigSnapshot(snapshot: Partial<AppDatabase> & { updatedAt?: string }) {
    if (snapshot.branding) this.db.branding = { ...this.db.branding, ...snapshot.branding };
    if (snapshot.footerConfig) this.db.footerConfig = { ...this.db.footerConfig, ...snapshot.footerConfig };
    if (snapshot.content) this.db.content = { ...this.db.content, ...snapshot.content };
    if (Array.isArray(snapshot.packages) && snapshot.packages.length > 0) this.db.packages = snapshot.packages;
    if (Array.isArray(snapshot.services) && snapshot.services.length > 0) this.db.services = snapshot.services;
    if (Array.isArray(snapshot.currencies) && snapshot.currencies.length > 0) this.db.currencies = snapshot.currencies;
    if (snapshot.pricingConfig) this.db.pricingConfig = { ...this.db.pricingConfig, ...snapshot.pricingConfig };
    if (snapshot.autoRateEngine) this.db.autoRateEngine = { ...this.db.autoRateEngine, ...snapshot.autoRateEngine };
    if (snapshot.emailTemplates) this.db.emailTemplates = { ...this.db.emailTemplates, ...snapshot.emailTemplates };
    this.db.updatedAt = snapshot.updatedAt || new Date().toISOString();
    this.saveData(this.db);
    return this.db;
  }

  // --- User Authentication & Verification ---
  public registerUser(params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): { success: boolean; user?: UserAccount; error?: string } {
    const emailNorm = params.email.trim().toLowerCase();
    const existing = this.db.users.find(u => u.email.toLowerCase() === emailNorm);
    if (existing) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const isAdmin = emailNorm === this.db.branding.adminGoogleEmail.toLowerCase();
    const newUser: UserAccount = {
      id: `usr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      email: emailNorm,
      name: params.name.trim(),
      phone: params.phone?.trim() || '',
      role: isAdmin ? 'admin' : 'customer',
      authProvider: 'email',
      passwordHash: hashPassword(params.password),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(params.name)}`,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    this.db.users.push(newUser);
    this.commit();
    return { success: true, user: newUser };
  }

  public authenticateEmail(email: string, password: string): { success: boolean; user?: UserAccount; error?: string } {
    const emailNorm = email.trim().toLowerCase();
    const user = this.db.users.find(u => u.email.toLowerCase() === emailNorm);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { success: false, error: 'Invalid email or password.' };
    }

    if (isLegacySha256Hash(user.passwordHash)) {
      user.passwordHash = hashPassword(password);
    }

    if (emailNorm === 'baffourgideon05@gmail.com' || emailNorm === this.db.branding.adminGoogleEmail.toLowerCase()) {
      user.role = 'admin';
    } else if (user.role === 'admin') {
      user.role = 'customer';
    }

    user.lastLoginAt = new Date().toISOString();
    this.commit();
    return { success: true, user };
  }

  public authenticateGoogle(googleProfile: {
    email: string;
    name: string;
    picture?: string;
    sub?: string;
  }): { success: boolean; user: UserAccount; isAdmin: boolean } {
    const emailNorm = googleProfile.email.trim().toLowerCase();
    const isAdmin = emailNorm === 'baffourgideon05@gmail.com' || emailNorm === this.db.branding.adminGoogleEmail.toLowerCase();

    let user = this.db.users.find(u => u.email.toLowerCase() === emailNorm);
    if (!user) {
      user = {
        id: `usr-g-${Date.now()}`,
        email: emailNorm,
        name: googleProfile.name || emailNorm.split('@')[0],
        role: isAdmin ? 'admin' : 'customer',
        authProvider: 'google',
        avatarUrl: googleProfile.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(googleProfile.name)}`,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      this.db.users.push(user);
    } else {
      user.lastLoginAt = new Date().toISOString();
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
      }
      if (googleProfile.picture) {
        user.avatarUrl = googleProfile.picture;
      }
    }

    this.commit();
    return { success: true, user, isAdmin: user.role === 'admin' };
  }

  // --- Password Reset Management ---
  public requestPasswordReset(email: string): { success: boolean; message: string } {
    const emailNorm = email.trim().toLowerCase();
    const user = this.db.users.find(u => u.email.toLowerCase() === emailNorm);
    if (!user) {
      // Security standard: don't reveal if user exists, but indicate request registered
      return { success: true, message: 'If an account exists, a reset request has been logged for admin verification.' };
    }

    const resetReq: PasswordResetRequest = {
      id: `rst-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      userEmail: user.email,
      userName: user.name,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    };

    this.db.resetRequests.unshift(resetReq);
    this.commit();
    return { success: true, message: 'Password reset request submitted. The admin team can issue a temporary password or reset link.' };
  }

  public adminResolveReset(requestId: string, temporaryPassword: string, adminEmail: string) {
    const req = this.db.resetRequests.find(r => r.id === requestId);
    if (!req) return null;

    const user = this.db.users.find(u => u.email.toLowerCase() === req.userEmail.toLowerCase());
    if (user) {
      user.passwordHash = hashPassword(temporaryPassword);
    }

    req.status = 'resolved';
    req.temporaryPassword = temporaryPassword;
    req.resolvedAt = new Date().toISOString();
    req.resolvedBy = adminEmail;
    this.commit();
    return { req, user };
  }

  public adminDirectResetPassword(userEmail: string, newPassword: string) {
    const user = this.db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
    if (!user) return null;

    user.passwordHash = hashPassword(newPassword);
    this.commit();
    return user;
  }

  // --- Branding & Footer Management ---
  public updateBranding(branding: Partial<SiteBranding>): SiteBranding {
    this.db.branding = {
      ...this.db.branding,
      ...branding
    };
    this.commit(true);
    return this.db.branding;
  }

  public updateFooter(footer: Partial<FooterConfig>): FooterConfig {
    this.db.footerConfig = {
      ...this.db.footerConfig,
      ...footer
    };
    // Keep content in sync
    if (footer.email) this.db.content.agencyEmail = footer.email;
    if (footer.phone) this.db.content.agencyPhone = footer.phone;
    if (footer.address) this.db.content.agencyAddress = footer.address;
    if (footer.businessHours) this.db.content.businessHours = footer.businessHours;
    this.commit(true);
    return this.db.footerConfig;
  }

  // --- Automatic Currency Detection & Fluctuation Boost Engine ---
  public runAutomaticCurrencyDetection(): {
    detectedChanges: RateChangeDetection[];
    triggeredAlerts: RateChangeDetection[];
  } {
    const engine = this.db.autoRateEngine;
    if (!engine.enabled) {
      return { detectedChanges: [], triggeredAlerts: [] };
    }

    const detectedChanges: RateChangeDetection[] = [];
    const triggeredAlerts: RateChangeDetection[] = [];

    // Simulate realistic interbank movements or market adjustments (e.g. GHS shifting between 15.10 and 15.90)
    for (const curr of this.db.currencies) {
      if (curr.code === 'USD') continue;

      let volatilityFactor = 0;
      if (curr.code === 'GHS') {
        // e.g. GHS small fluctuation
        volatilityFactor = (Math.random() * 0.18 - 0.08); // e.g. -0.08 to +0.10
      } else if (curr.code === 'NGN') {
        volatilityFactor = (Math.random() * 12 - 5);
      } else {
        volatilityFactor = (Math.random() * 0.01 - 0.005);
      }

      const prevRate = curr.rateVsUSD;
      const newRate = Number((prevRate + volatilityFactor).toFixed(4));
      const absChange = Number((newRate - prevRate).toFixed(4));
      const pctChange = Number((((newRate - prevRate) / prevRate) * 100).toFixed(2));

      // Check if change exceeds sensitivity threshold
      if (Math.abs(pctChange) >= engine.sensitivityPercent) {
        let direction: 'UP' | 'DOWN' | 'STABLE' = pctChange > 0 ? 'UP' : 'DOWN';
        
        // If the currency rate increased (e.g. 1 USD is now worth more local currency units, like 11 -> 12 GHS),
        // we apply automatic boost margin protection!
        let boostApplied = 0;
        if (direction === 'UP' && engine.autoBoostMarginPercent > 0) {
          boostApplied = engine.autoBoostMarginPercent;
          // Dynamically adjust currency margin
          curr.marginPercent = Math.min(10, Number((curr.marginPercent + 0.1).toFixed(1)));
        }

        const alertTriggered = Math.abs(pctChange) >= (this.db.pricingConfig.rateAlertThresholdPercent || 2.0);

        curr.previousRateVsUSD = prevRate;
        curr.rateVsUSD = newRate;
        curr.lastUpdated = new Date().toISOString();
        curr.source = 'Automatic Market Detection Engine';

        const detection: RateChangeDetection = {
          currency: curr.code,
          previousRate: prevRate,
          currentRate: newRate,
          absoluteChange: absChange,
          percentageChange: pctChange,
          direction,
          timestamp: new Date().toISOString(),
          alertTriggered,
          boostApplied
        };

        detectedChanges.push(detection);
        if (alertTriggered) {
          triggeredAlerts.push(detection);
        }

        engine.autoLogs.unshift(detection);
        if (engine.autoLogs.length > 50) {
          engine.autoLogs = engine.autoLogs.slice(0, 50);
        }
      }
    }

    engine.lastAutoDetection = new Date().toISOString();
    if (detectedChanges.length > 0) {
      this.db.rateHistory.unshift(...detectedChanges);
      if (this.db.rateHistory.length > 50) {
        this.db.rateHistory = this.db.rateHistory.slice(0, 50);
      }
      this.commit();
    }

    return { detectedChanges, triggeredAlerts };
  }

  // --- Pricing Authoritative Calculation ---
  public calculatePrice(params: {
    serviceId: string;
    packageId?: string;
    adBudgetUSD: number;
    fundingArrangement: FundingArrangement;
    targetCurrency: CurrencyCode;
  }) {
    const { serviceId, packageId, adBudgetUSD, fundingArrangement, targetCurrency } = params;
    const config = this.db.pricingConfig;
    const service = this.db.services.find(s => s.id === serviceId) || this.db.services[0];
    const pkg = packageId ? this.db.packages.find(p => p.id === packageId) : undefined;

    let finalAdBudgetUSD = Math.max(config.minCampaignBudget, adBudgetUSD);
    let finalAgencyFeeUSD = 0;

    if (pkg) {
      finalAdBudgetUSD = pkg.advertisingBudgetUSD;
      finalAgencyFeeUSD = pkg.managementFeeUSD;
    } else {
      const method = service.pricingMethod || config.defaultMethod;
      const markupPercent = service.markupPercent ?? config.defaultMarkupPercent;
      const fixedFee = service.fixedFee ?? config.defaultFixedFee;

      if (method === 'PERCENTAGE') {
        finalAgencyFeeUSD = (finalAdBudgetUSD * markupPercent) / 100;
      } else if (method === 'FIXED') {
        finalAgencyFeeUSD = fixedFee;
      } else if (method === 'COMBINED') {
        finalAgencyFeeUSD = (finalAdBudgetUSD * markupPercent) / 100 + fixedFee;
      }

      if (finalAgencyFeeUSD < config.minimumAgencyFee) {
        finalAgencyFeeUSD = config.minimumAgencyFee;
      }
    }

    if (config.roundingRule === 'ROUND_UP') {
      finalAgencyFeeUSD = Math.ceil(finalAgencyFeeUSD);
    } else if (config.roundingRule === 'STANDARD') {
      finalAgencyFeeUSD = Math.round(finalAgencyFeeUSD);
    }

    const taxUSD = config.taxPercent > 0 ? (finalAgencyFeeUSD * config.taxPercent) / 100 : 0;
    
    const payableUSD = fundingArrangement === 'COMBINED' 
      ? finalAdBudgetUSD + finalAgencyFeeUSD + taxUSD
      : finalAgencyFeeUSD + taxUSD;

    const currency = this.db.currencies.find(c => c.code === targetCurrency) || this.db.currencies[0];
    const baseRate = currency.rateVsUSD;
    const margin = currency.marginPercent ?? config.exchangeRateMarginPercent;
    const effectiveRate = baseRate * (1 + margin / 100);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.checkoutQuoteExpiryMinutes * 60 * 1000).toISOString();

    // Exact GHS lock for Done For You packages
    if (pkg && pkg.priceGHS && targetCurrency === 'GHS') {
      const ghsTotal = fundingArrangement === 'COMBINED' 
        ? pkg.priceGHS 
        : (pkg.managementFeeGHS || Math.round(pkg.priceGHS * 0.4));
      const ghsAdBudget = fundingArrangement === 'COMBINED'
        ? (pkg.advertisingBudgetGHS || Math.round(pkg.priceGHS * 0.6))
        : 0;
      const ghsAgencyFee = fundingArrangement === 'COMBINED'
        ? (pkg.managementFeeGHS || (ghsTotal - ghsAdBudget))
        : ghsTotal;

      return {
        service,
        package: pkg,
        fundingArrangement,
        base: {
          currency: 'USD' as CurrencyCode,
          adBudgetUSD: Number((ghsAdBudget / effectiveRate).toFixed(2)),
          agencyFeeUSD: Number((ghsAgencyFee / effectiveRate).toFixed(2)),
          taxUSD: 0,
          totalUSD: Number((ghsTotal / effectiveRate).toFixed(2))
        },
        converted: {
          currency: 'GHS' as CurrencyCode,
          baseRate,
          marginPercent: margin,
          effectiveRate,
          paymentAdBudget: ghsAdBudget,
          paymentAgencyFee: ghsAgencyFee,
          paymentTax: 0,
          paymentTotal: ghsTotal,
          precision: 2,
          symbol: 'GH₵'
        },
        snapshot: {
          rateVsUSD: effectiveRate,
          timestamp: now.toISOString(),
          expiresAt
        }
      };
    }

    const paymentAdBudget = Number((finalAdBudgetUSD * effectiveRate).toFixed(currency.precision));
    const paymentAgencyFee = Number((finalAgencyFeeUSD * effectiveRate).toFixed(currency.precision));
    const paymentTax = Number((taxUSD * effectiveRate).toFixed(currency.precision));
    const paymentTotal = Number((payableUSD * effectiveRate).toFixed(currency.precision));

    return {
      service,
      package: pkg,
      fundingArrangement,
      base: {
        currency: 'USD' as CurrencyCode,
        adBudgetUSD: finalAdBudgetUSD,
        agencyFeeUSD: finalAgencyFeeUSD,
        taxUSD,
        totalUSD: payableUSD
      },
      converted: {
        currency: targetCurrency,
        baseRate,
        marginPercent: margin,
        effectiveRate,
        paymentAdBudget,
        paymentAgencyFee,
        paymentTax,
        paymentTotal,
        precision: currency.precision,
        symbol: currency.symbol
      },
      snapshot: {
        rateVsUSD: effectiveRate,
        timestamp: now.toISOString(),
        expiresAt
      }
    };
  }

  // --- Exchange Rate Updates & Detection ---
  public updateExchangeRate(code: CurrencyCode, newRate: number, source: string) {
    const currency = this.db.currencies.find(c => c.code === code);
    if (!currency) return null;

    const previousRate = currency.rateVsUSD;
    const absoluteChange = Number((newRate - previousRate).toFixed(4));
    const percentageChange = Number((((newRate - previousRate) / previousRate) * 100).toFixed(2));
    
    let direction: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (percentageChange > 0.01) direction = 'UP';
    else if (percentageChange < -0.01) direction = 'DOWN';

    const threshold = this.db.pricingConfig.rateAlertThresholdPercent || 2.0;
    const alertTriggered = Math.abs(percentageChange) >= threshold;

    currency.previousRateVsUSD = previousRate;
    currency.rateVsUSD = newRate;
    currency.lastUpdated = new Date().toISOString();
    currency.source = source;

    const detection: RateChangeDetection = {
      currency: code,
      previousRate,
      currentRate: newRate,
      absoluteChange,
      percentageChange,
      direction,
      timestamp: new Date().toISOString(),
      alertTriggered
    };

    this.db.rateHistory.unshift(detection);
    if (this.db.rateHistory.length > 50) {
      this.db.rateHistory = this.db.rateHistory.slice(0, 50);
    }

    this.commit();
    return detection;
  }

  public updatePaystackConfig(config: Partial<PaystackConfig>) {
    this.db.paystackConfig = { ...this.db.paystackConfig, ...config };
    this.commit();
    return this.db.paystackConfig;
  }

  public updateBrevoConfig(config: Partial<BrevoConfig>) {
    this.db.brevoConfig = { ...this.db.brevoConfig, ...config };
    this.commit();
    return this.db.brevoConfig;
  }

  public updateEmailTemplates(templates: Partial<EmailTemplatesConfig>): EmailTemplatesConfig {
    this.db.emailTemplates = {
      ...this.db.emailTemplates,
      ...templates,
      orderReceipt: {
        ...this.db.emailTemplates.orderReceipt,
        ...(templates.orderReceipt || {})
      },
      adminOrderAlert: {
        ...this.db.emailTemplates.adminOrderAlert,
        ...(templates.adminOrderAlert || {})
      },
      passwordReset: {
        ...this.db.emailTemplates.passwordReset,
        ...(templates.passwordReset || {})
      }
    };
    this.commit(true);
    return this.db.emailTemplates;
  }

  public addEmailLog(log: EmailLog) {
    if (!this.db.emailLogs) this.db.emailLogs = [];
    this.db.emailLogs.unshift(log);
    if (this.db.emailLogs.length > 50) this.db.emailLogs.pop();
    this.commit();
  }

  public getEmailLogs(): EmailLog[] {
    return this.db.emailLogs || [];
  }
}

export const store = new DataStore();

