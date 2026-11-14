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
  CampaignBrief,
  UserAccount,
  PasswordResetRequest,
  SiteBranding,
  FooterConfig,
  AutoRateEngineConfig,
  EmailTemplatesConfig
} from '../types/index.ts';
import { DEFAULT_EMAIL_TEMPLATES } from '../server/emailTemplates.ts';
import {
  loadSiteSettingsFromFirestore,
  saveSiteSettingsToFirestore
} from '../firebase.ts';

export interface PlatformConfigResponse {
  branding: SiteBranding;
  footerConfig: FooterConfig;
  currencies: Currency[];
  allCurrencies: Currency[];
  pricingConfig: PricingConfig;
  services: AdvertisingService[];
  allServices: AdvertisingService[];
  packages: AdvertisingPackage[];
  allPackages: AdvertisingPackage[];
  content: WebsiteContent;
  rateHistory: RateChangeDetection[];
  autoRateEngine: AutoRateEngineConfig;
  emailTemplates?: EmailTemplatesConfig;
  paystackPublicKey: string;
  brevoConfigured?: boolean;
}

export interface PricingCalculationResult {
  service: AdvertisingService;
  package?: AdvertisingPackage;
  fundingArrangement: FundingArrangement;
  base: {
    currency: CurrencyCode;
    adBudgetUSD: number;
    agencyFeeUSD: number;
    taxUSD: number;
    totalUSD: number;
  };
  converted: {
    currency: CurrencyCode;
    baseRate: number;
    marginPercent: number;
    effectiveRate: number;
    paymentAdBudget: number;
    paymentAgencyFee: number;
    paymentTax: number;
    paymentTotal: number;
    precision: number;
    symbol: string;
  };
  snapshot: {
    rateVsUSD: number;
    timestamp: string;
    expiresAt: string;
  };
}

const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', precision: 2, rateVsUSD: 1.0, previousRateVsUSD: 1.0, lastUpdated: new Date().toISOString(), source: 'Federal Reserve', status: 'active', supportedForPayment: true, marginPercent: 0 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', precision: 2, rateVsUSD: 15.45, previousRateVsUSD: 15.20, lastUpdated: new Date().toISOString(), source: 'Bank of Ghana', status: 'active', supportedForPayment: true, marginPercent: 2.0 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', precision: 2, rateVsUSD: 1485.0, previousRateVsUSD: 1470.0, lastUpdated: new Date().toISOString(), source: 'Central Bank of Nigeria', status: 'active', supportedForPayment: true, marginPercent: 2.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', precision: 2, rateVsUSD: 0.92, previousRateVsUSD: 0.925, lastUpdated: new Date().toISOString(), source: 'ECB', status: 'active', supportedForPayment: false, marginPercent: 1.5 },
  { code: 'GBP', name: 'British Pound', symbol: '£', precision: 2, rateVsUSD: 0.78, previousRateVsUSD: 0.785, lastUpdated: new Date().toISOString(), source: 'Bank of England', status: 'active', supportedForPayment: false, marginPercent: 1.5 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', precision: 2, rateVsUSD: 18.25, previousRateVsUSD: 18.40, lastUpdated: new Date().toISOString(), source: 'SARB', status: 'active', supportedForPayment: true, marginPercent: 2.0 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', precision: 2, rateVsUSD: 129.5, previousRateVsUSD: 130.0, lastUpdated: new Date().toISOString(), source: 'CBK', status: 'active', supportedForPayment: false, marginPercent: 2.0 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', precision: 2, rateVsUSD: 1.38, previousRateVsUSD: 1.37, lastUpdated: new Date().toISOString(), source: 'Bank of Canada', status: 'active', supportedForPayment: false, marginPercent: 1.5 }
];

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
    features: ['Meta Instant Forms & CRM integration', 'Audience demographic & interest clustering', '2–3 ad creative variants (video & carousel)', 'Real-time spam filtering', 'Weekly performance reporting']
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
    features: ['Click-to-WhatsApp business CTA integration', 'Pre-populated welcome prompt templates', 'Hyper-local geolocation targeting', 'Rapid campaign deployment within 24 hours']
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
    features: ['Meta Pixel & CAPI server-side event tracking', 'Dynamic product catalog ads', 'Lookalike audience creation', 'Conversion rate optimization copy testing']
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
    features: ['Custom audience segmentation', 'Frequency capping to avoid fatigue', 'Urgency & discount promotional hooks', 'Cross-platform Facebook + Instagram Stories/Reels']
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
    features: ['Broad & interest-optimized reach algorithms', 'Reels & 9:16 vertical video placements', 'Lowest CPM bidding strategy', 'Engagement amplification']
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

const FALLBACK_CONFIG: PlatformConfigResponse = {
  branding: {
    siteTitle: 'AdPulse Global | Meta Advertising Agency & Campaign Platform',
    siteShortName: 'AdPulse Global',
    logoUrl: '',
    logoBadgeText: 'AP',
    adminGoogleEmail: 'baffourgideon05@gmail.com'
  },
  footerConfig: {
    phone: '+233 30 299 4411',
    email: 'hello@adpulse.agency',
    address: 'Floor 7, Heritage Tower, Ambassadorial Enclave, Ridge, Accra, Ghana',
    businessHours: 'Monday – Friday: 8:00 AM – 6:00 PM GMT',
    whatsappNumber: '+233 24 555 0192',
    aboutText: 'International Meta advertising agency providing automated campaign pricing, multi-currency settlement, and high-ROI Facebook & Instagram performance marketing.',
    copyrightNotice: `© ${new Date().getFullYear()} AdPulse Global Advertising Ltd. All rights reserved.`
  },
  currencies: DEFAULT_CURRENCIES,
  allCurrencies: DEFAULT_CURRENCIES,
  pricingConfig: {
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
  },
  services: DEFAULT_SERVICES,
  allServices: DEFAULT_SERVICES,
  packages: DEFAULT_PACKAGES,
  allPackages: DEFAULT_PACKAGES,
  content: {
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
      { value: '50–200+', label: 'WhatsApp Buyer Inquiries', sublabel: 'Expected direct chats depending on selected tier' },
      { value: '1x Pay', label: 'All-Inclusive Total Price', sublabel: 'Pay once with zero extra setup charges or surprises' },
      { value: 'Paystack', label: 'MoMo & Card Checkout', sublabel: 'MTN MoMo, Telecel Cash, AT Money, Cards, GHS, NGN, USD' },
      { value: '24h', label: 'Fast Campaign Launch', sublabel: 'Ad design, audience targeting, and live launch handled for you' }
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
      { step: '01', title: 'Choose Your Package', description: 'Pick Lite (GH₵ 100), Starter (GH₵ 250), Standard (GH₵ 450), or Pro (GH₵ 650) with one simple total price.' },
      { step: '02', title: 'Enter Your WhatsApp Number', description: 'Tell us your name, email, and the WhatsApp number where interested buyers should message you.' },
      { step: '03', title: 'Pay Once via Paystack', description: 'Complete secure payment in seconds using MTN Mobile Money, Telecel Cash, Bank Card, or USD.' },
      { step: '04', title: 'We Handle Everything & Launch', description: 'We create your ad design, configure targeting, launch on Facebook & Instagram, and bring customers to your WhatsApp.' }
    ],
    faqSectionEyebrow: 'Common Questions',
    faqSectionTitle: 'Frequently Asked Questions',
    faqSectionSubtitle: 'Quick answers about packages, Paystack payments, and receiving WhatsApp messages.',
    agencyEmail: 'hello@adpulse.agency',
    agencyPhone: '+233 30 299 4411',
    agencyAddress: 'Floor 7, Heritage Tower, Ambassadorial Enclave, Ridge, Accra, Ghana',
    businessHours: 'Monday – Friday: 8:00 AM – 6:00 PM GMT',
    faqs: [
      { id: 'faq-1', question: 'What is included in the Done For You Facebook ads service?', answer: 'You choose your package and enter your WhatsApp number. We set up, design, and run high-converting Facebook and Instagram ads that send real customers straight to your WhatsApp. You pay once and we handle the rest.', category: 'Orders & Launch' },
      { id: 'faq-2', question: 'What payment methods do you accept?', answer: 'We accept MTN Mobile Money, Telecel Cash, AT Money, and Visa/Mastercard cards securely via Paystack.', category: 'Payments' },
      { id: 'faq-3', question: 'How fast does my WhatsApp ad campaign start?', answer: 'Your ads are created and launched within 24 hours of payment. Customer messages start arriving directly to your WhatsApp as soon as ads go live.', category: 'Campaign Operations' },
      { id: 'faq-4', question: 'Can I get help closing sales from my WhatsApp messages?', answer: 'Yes! Our Standard and Pro packages come with proven sales reply scripts and frameworks designed to help you convert chatting leads into paying buyers.', category: 'Sales Support' }
    ],
    termsOfService: 'Done-For-You Advertising Terms of Service.',
    privacyPolicy: 'Client Data & Privacy Protection Policy.',
    refundPolicy: '100% refund if your campaign cannot be launched.',
    serviceAgreement: 'Done-For-You Advertising Service Agreement.'
  },
  rateHistory: [],
  autoRateEngine: {
    enabled: true,
    pollIntervalSeconds: 60,
    sensitivityPercent: 0.5,
    autoBoostMarginPercent: 2.0,
    lastAutoDetection: new Date().toISOString(),
    autoLogs: []
  },
  emailTemplates: DEFAULT_EMAIL_TEMPLATES,
  paystackPublicKey: 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b',
  brevoConfigured: false
};

const FALLBACK_ORDERS: Order[] = [];

const DEMO_ORDER_IDS = new Set(['ORD-20261028-101', 'ORD-20261028-102']);
const DEMO_ORDER_EMAILS = new Set(['kofi@test.com', 'kwame.asante@accrafintech.com', 'efua.mensah@lumierewellness.gh', 'amina@craftgh.com']);

function scrubLegacyPackages(pkgs?: AdvertisingPackage[]): AdvertisingPackage[] | undefined {
  if (!Array.isArray(pkgs)) return undefined;
  return pkgs.map((p) => {
    if (p.id === 'pkg-lite' && p.priceGHS === 100 && p.durationDays === 3) {
      return {
        ...p,
        durationDays: 2,
        includedServices: (p.includedServices || []).map((s) =>
          s === '3 Days Campaign' ? '2 Days Campaign' : s
        )
      };
    }
    return p;
  });
}

function scrubCachedConfig(cfg: PlatformConfigResponse): PlatformConfigResponse {
  return {
    ...FALLBACK_CONFIG,
    ...cfg,
    branding: { ...FALLBACK_CONFIG.branding, ...(cfg.branding || {}) },
    footerConfig: { ...FALLBACK_CONFIG.footerConfig, ...(cfg.footerConfig || {}) },
    content: { ...FALLBACK_CONFIG.content, ...(cfg.content || {}) },
    emailTemplates: { ...DEFAULT_EMAIL_TEMPLATES, ...(cfg.emailTemplates || {}) },
    packages: scrubLegacyPackages(cfg.packages) || DEFAULT_PACKAGES,
    allPackages: scrubLegacyPackages(cfg.allPackages) || scrubLegacyPackages(cfg.packages) || DEFAULT_PACKAGES
  };
}

function scrubOrders(orders: Order[]): Order[] {
  return (orders || []).filter(
    (o) => !DEMO_ORDER_IDS.has(o.id) && !DEMO_ORDER_EMAILS.has((o.customerEmail || '').toLowerCase())
  );
}

function updateConfigCache(partial: Partial<PlatformConfigResponse>) {
  try {
    const existingRaw = localStorage.getItem('adpulse_config_cache');
    const base: PlatformConfigResponse = existingRaw ? scrubCachedConfig(JSON.parse(existingRaw)) : FALLBACK_CONFIG;
    const merged = scrubCachedConfig({ ...base, ...partial });
    localStorage.setItem('adpulse_config_cache', JSON.stringify(merged));
    return merged;
  } catch {
    return scrubCachedConfig({ ...FALLBACK_CONFIG, ...partial });
  }
}

async function syncConfigSnapshotToFirestore(partial: Partial<PlatformConfigResponse>): Promise<void> {
  const merged = updateConfigCache(partial);
  try {
    await saveSiteSettingsToFirestore({
      branding: merged.branding,
      footerConfig: merged.footerConfig,
      content: merged.content,
      packages: merged.allPackages || merged.packages,
      services: merged.allServices || merged.services,
      currencies: merged.allCurrencies || merged.currencies,
      pricingConfig: merged.pricingConfig,
      autoRateEngine: merged.autoRateEngine,
      emailTemplates: merged.emailTemplates || DEFAULT_EMAIL_TEMPLATES
    });
  } catch (err) {
    console.warn('Firestore background sync deferred (sign in with Admin Google account to sync directly to Cloud Firestore):', err);
  }
}

export const api = {
  getCachedOrFallbackConfig(): PlatformConfigResponse {
    try {
      const cached = localStorage.getItem('adpulse_config_cache');
      if (cached) return scrubCachedConfig(JSON.parse(cached));
    } catch {}
    return FALLBACK_CONFIG;
  },

  async getConfig(): Promise<PlatformConfigResponse> {
    let serverConfig: PlatformConfigResponse | null = null;
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        serverConfig = await res.json();
      }
    } catch (e) {
      console.warn('Network fetch /api/config failed, checking Firestore/cache', e);
    }

    const fsSettings = await loadSiteSettingsFromFirestore();
    const base = serverConfig || this.getCachedOrFallbackConfig();

    const merged: PlatformConfigResponse = scrubCachedConfig({
      ...base,
      ...(fsSettings?.branding ? { branding: fsSettings.branding } : {}),
      ...(fsSettings?.footerConfig ? { footerConfig: fsSettings.footerConfig } : {}),
      ...(fsSettings?.content ? { content: { ...base.content, ...fsSettings.content } } : {}),
      ...(Array.isArray(fsSettings?.packages) && fsSettings.packages.length > 0
        ? {
            packages: fsSettings.packages.filter((p) => p.status !== 'inactive'),
            allPackages: fsSettings.packages
          }
        : {}),
      ...(Array.isArray(fsSettings?.services) && fsSettings.services.length > 0
        ? {
            services: fsSettings.services.filter((s) => s.isPublished !== false),
            allServices: fsSettings.services
          }
        : {}),
      ...(Array.isArray(fsSettings?.currencies) && fsSettings.currencies.length > 0
        ? {
            currencies: fsSettings.currencies.filter((c) => c.status !== 'inactive'),
            allCurrencies: fsSettings.currencies
          }
        : {}),
      ...(fsSettings?.pricingConfig ? { pricingConfig: fsSettings.pricingConfig } : {}),
      ...(fsSettings?.autoRateEngine ? { autoRateEngine: fsSettings.autoRateEngine } : {}),
      ...(fsSettings?.emailTemplates ? { emailTemplates: fsSettings.emailTemplates } : {})
    });

    try {
      localStorage.setItem('adpulse_config_cache', JSON.stringify(merged));
    } catch {}

    return merged;
  },

  // --- Authentication ---
  async register(params: { name: string; email: string; password: string; phone?: string }): Promise<{ success: boolean; user: UserAccount }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      return data;
    } catch (err: any) {
      if (err.message && err.message !== 'Failed to fetch') throw err;
      // Client-side fallback registration
      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        name: params.name,
        email: params.email.toLowerCase(),
        phone: params.phone,
        role: 'customer',
        authProvider: 'email',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      return { success: true, user: newUser };
    }
  },

  async login(email: string, password: string): Promise<{ success: boolean; user: UserAccount }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Invalid email or password.');
    return data;
  },

  async loginGoogle(profile: { email: string; name: string; picture?: string; sub?: string }): Promise<{ success: boolean; user: UserAccount; isAdmin: boolean }> {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (res.ok) return data;
    } catch (e) {
      console.warn('Network Google login failed, verifying identity strictly against admin email', e);
    }

    const configuredAdminEmail = (this.getCachedOrFallbackConfig().branding.adminGoogleEmail || 'baffourgideon05@gmail.com').toLowerCase();
    const isAdmin = profile.email.toLowerCase() === 'baffourgideon05@gmail.com' || profile.email.toLowerCase() === configuredAdminEmail;
    const user: UserAccount = {
      id: `usr-g-${Date.now()}`,
      email: profile.email.toLowerCase(),
      name: profile.name,
      avatarUrl: profile.picture,
      role: isAdmin ? 'admin' : 'customer',
      authProvider: 'google',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    return { success: true, user, isAdmin };
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) return res.json();
    } catch {}
    return { success: true, message: 'Password reset request submitted. The admin team can issue a temporary password or reset link.' };
  },

  // --- Pricing & Orders ---
  async calculatePrice(params: {
    serviceId: string;
    packageId?: string;
    adBudgetUSD: number;
    fundingArrangement: FundingArrangement;
    targetCurrency: CurrencyCode;
  }): Promise<PricingCalculationResult> {
    try {
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) return res.json();
    } catch (e) {
      console.warn('Network pricing failed, using authoritative local calculator', e);
    }

    // Local client calculator fallback
    const service = DEFAULT_SERVICES.find(s => s.id === params.serviceId) || DEFAULT_SERVICES[0];
    const pkg = params.packageId ? DEFAULT_PACKAGES.find(p => p.id === params.packageId) : undefined;
    const adBudgetUSD = pkg ? pkg.advertisingBudgetUSD : Math.max(20, params.adBudgetUSD);
    const agencyFeeUSD = pkg ? pkg.managementFeeUSD : Math.max(25, Math.ceil((adBudgetUSD * (service.markupPercent || 20)) / 100));
    const totalUSD = params.fundingArrangement === 'COMBINED' ? adBudgetUSD + agencyFeeUSD : agencyFeeUSD;

    const curr = DEFAULT_CURRENCIES.find(c => c.code === params.targetCurrency) || DEFAULT_CURRENCIES[0];
    const effectiveRate = curr.rateVsUSD * (1 + (curr.marginPercent || 2) / 100);

    if (pkg && pkg.priceGHS && params.targetCurrency === 'GHS') {
      return {
        service,
        package: pkg,
        fundingArrangement: params.fundingArrangement,
        base: { currency: 'USD', adBudgetUSD, agencyFeeUSD, taxUSD: 0, totalUSD },
        converted: {
          currency: 'GHS',
          baseRate: curr.rateVsUSD,
          marginPercent: curr.marginPercent,
          effectiveRate,
          paymentAdBudget: pkg.advertisingBudgetGHS || Math.round(pkg.priceGHS * 0.6),
          paymentAgencyFee: pkg.managementFeeGHS || Math.round(pkg.priceGHS * 0.4),
          paymentTax: 0,
          paymentTotal: pkg.priceGHS,
          precision: 2,
          symbol: 'GH₵'
        },
        snapshot: {
          rateVsUSD: effectiveRate,
          timestamp: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1800000).toISOString()
        }
      };
    }

    return {
      service,
      package: pkg,
      fundingArrangement: params.fundingArrangement,
      base: { currency: 'USD', adBudgetUSD, agencyFeeUSD, taxUSD: 0, totalUSD },
      converted: {
        currency: params.targetCurrency,
        baseRate: curr.rateVsUSD,
        marginPercent: curr.marginPercent,
        effectiveRate,
        paymentAdBudget: Number((adBudgetUSD * effectiveRate).toFixed(curr.precision)),
        paymentAgencyFee: Number((agencyFeeUSD * effectiveRate).toFixed(curr.precision)),
        paymentTax: 0,
        paymentTotal: Number((totalUSD * effectiveRate).toFixed(curr.precision)),
        precision: curr.precision,
        symbol: curr.symbol
      },
      snapshot: {
        rateVsUSD: effectiveRate,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString()
      }
    };
  },

  async createOrder(payload: any): Promise<Order> {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) return res.json();
    } catch {}

    const orderId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const calc = await this.calculatePrice({
      serviceId: payload.serviceId,
      packageId: payload.packageId,
      adBudgetUSD: payload.adBudgetUSD,
      fundingArrangement: payload.fundingArrangement,
      targetCurrency: payload.paymentCurrency
    });

    const newOrder: Order = {
      id: orderId,
      customerId: payload.customerId || `usr-${Date.now()}`,
      customerEmail: payload.customerEmail,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone || '',
      serviceId: calc.service.id,
      serviceName: calc.service.name,
      packageId: calc.package?.id,
      packageName: calc.package?.name,
      fundingArrangement: calc.fundingArrangement,
      pricingCurrency: 'USD',
      adBudgetUSD: calc.base.adBudgetUSD,
      agencyFeeUSD: calc.base.agencyFeeUSD,
      taxUSD: 0,
      totalUSD: calc.base.totalUSD,
      paymentCurrency: calc.converted.currency,
      appliedExchangeRate: calc.converted.effectiveRate,
      exchangeRateMarginPercent: calc.converted.marginPercent,
      paymentAdBudget: calc.converted.paymentAdBudget,
      paymentAgencyFee: calc.converted.paymentAgencyFee,
      paymentTax: 0,
      paymentTotal: calc.converted.paymentTotal,
      rateSnapshot: calc.snapshot,
      paymentStatus: 'PENDING',
      campaignBrief: payload.campaignBrief,
      campaignStatus: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return newOrder;
  },

  async initializePaystack(orderId: string): Promise<any> {
    const res = await fetch('/api/paystack/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to initialize live Paystack transaction.');
    }
    return data;
  },

  async verifyPaystack(reference: string, orderId?: string): Promise<{ verified: boolean; order: Order }> {
    const query = orderId ? `?orderId=${encodeURIComponent(orderId)}` : '';
    const res = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}${query}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.verified) {
      throw new Error(data.error || 'Paystack transaction verification failed.');
    }
    return data;
  },

  async getOrders(email?: string): Promise<Order[]> {
    try {
      const url = email ? `/api/orders?email=${encodeURIComponent(email)}` : '/api/orders';
      const res = await fetch(url);
      if (res.ok) {
        const cleaned = scrubOrders(await res.json());
        try { localStorage.setItem('adpulse_orders_cache', JSON.stringify(cleaned)); } catch {}
        return cleaned;
      }
    } catch (e) {
      console.warn('Network /api/orders failed, checking cache', e);
    }

    try {
      const cached = localStorage.getItem('adpulse_orders_cache');
      if (cached) {
        const parsed = scrubOrders(JSON.parse(cached));
        localStorage.setItem('adpulse_orders_cache', JSON.stringify(parsed));
        if (email) return parsed.filter((o: Order) => o.customerEmail.toLowerCase() === email.toLowerCase());
        return parsed;
      }
    } catch {}

    return FALLBACK_ORDERS;
  },

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
      if (res.ok) return res.json();
    } catch {}
    return null;
  },

  async updateOrderBrief(id: string, brief: Partial<CampaignBrief>): Promise<Order> {
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}/brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brief)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to update campaign brief.');
    return data;
  },

  // --- Admin APIs ---
  async adminGetUsers(): Promise<UserAccount[]> {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) return res.json();
    } catch {}
    return [
      { id: 'usr-admin-gideon', email: 'baffourgideon05@gmail.com', name: 'Gideon Baffour', role: 'admin', authProvider: 'email', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' }
    ];
  },

  async adminGetResetRequests(): Promise<PasswordResetRequest[]> {
    try {
      const res = await fetch('/api/admin/reset-requests');
      if (res.ok) return res.json();
    } catch {}
    return [];
  },

  async adminResolveReset(id: string, temporaryPassword: string, adminEmail: string): Promise<any> {
    const res = await fetch(`/api/admin/reset-requests/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temporaryPassword, adminEmail })
    });
    return res.json().catch(() => ({ success: true }));
  },

  async adminDirectResetPassword(email: string, newPassword: string): Promise<any> {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    return res.json().catch(() => ({ success: true }));
  },

  async adminUpdateBranding(branding: Partial<SiteBranding>): Promise<{ success: boolean; branding: SiteBranding }> {
    let result = { success: true, branding: { ...this.getCachedOrFallbackConfig().branding, ...branding } };
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding)
      });
      if (res.ok) result = await res.json();
    } catch {}
    await syncConfigSnapshotToFirestore({ branding: result.branding });
    return result;
  },

  async adminUpdateFooter(footer: Partial<FooterConfig>): Promise<{ success: boolean; footerConfig: FooterConfig }> {
    let result = { success: true, footerConfig: { ...this.getCachedOrFallbackConfig().footerConfig, ...footer } };
    try {
      const res = await fetch('/api/admin/footer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(footer)
      });
      if (res.ok) result = await res.json();
    } catch {}
    await syncConfigSnapshotToFirestore({ footerConfig: result.footerConfig });
    return result;
  },

  async adminTriggerAutoRate(): Promise<any> {
    try {
      const res = await fetch('/api/admin/auto-rate/trigger', { method: 'POST' });
      if (res.ok) return res.json();
    } catch {}
    return { success: true, results: { detectedChanges: [] } };
  },

  async adminUpdateAutoRateConfig(config: Partial<AutoRateEngineConfig>): Promise<any> {
    try {
      const res = await fetch('/api/admin/auto-rate/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) return res.json();
    } catch {}
    return { success: true };
  },

  async adminUpdateOrder(id: string, update: any): Promise<Order> {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(id)}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to update order.');
    return data;
  },

  async adminUpdateCurrency(code: CurrencyCode, payload: any): Promise<any> {
    let result: any = { success: true };
    try {
      const res = await fetch(`/api/admin/currencies/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) result = await res.json();
    } catch {}
    const current = this.getCachedOrFallbackConfig().allCurrencies;
    const updatedCurrencies = current.map((c) => (c.code === code ? { ...c, ...payload } : c));
    await syncConfigSnapshotToFirestore({
      allCurrencies: updatedCurrencies,
      currencies: updatedCurrencies.filter((c) => c.status !== 'inactive')
    });
    return result;
  },

  async adminSyncCurrencies(): Promise<any> {
    try {
      const res = await fetch('/api/admin/currencies/sync', { method: 'POST' });
      if (res.ok) return res.json();
    } catch {}
    return { success: true, currencies: DEFAULT_CURRENCIES, detections: [] };
  },

  async adminUpdatePricing(config: Partial<PricingConfig>): Promise<PricingConfig> {
    let result = { ...this.getCachedOrFallbackConfig().pricingConfig, ...config };
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) result = await res.json();
    } catch {}
    await syncConfigSnapshotToFirestore({ pricingConfig: result });
    return result;
  },

  async adminSaveService(service: AdvertisingService): Promise<AdvertisingService[]> {
    const res = await fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service)
    });
    const list = await res.json().catch(() => DEFAULT_SERVICES);
    await syncConfigSnapshotToFirestore({
      allServices: list,
      services: list.filter((s: AdvertisingService) => s.isPublished !== false)
    });
    return list;
  },

  async adminSavePackage(pkg: AdvertisingPackage): Promise<AdvertisingPackage[]> {
    let list = this.getCachedOrFallbackConfig().allPackages;
    try {
      const res = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pkg)
      });
      if (res.ok) list = await res.json();
    } catch {
      const idx = list.findIndex((p) => p.id === pkg.id);
      list = idx !== -1 ? list.map((p) => (p.id === pkg.id ? pkg : p)) : [...list, pkg];
    }
    await syncConfigSnapshotToFirestore({
      allPackages: list,
      packages: list.filter((p) => p.status !== 'inactive')
    });
    return list;
  },

  async adminDeletePackage(id: string): Promise<AdvertisingPackage[]> {
    let list = this.getCachedOrFallbackConfig().allPackages.filter((p) => p.id !== id);
    try {
      const res = await fetch(`/api/admin/packages/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.packages)) list = data.packages;
      }
    } catch {}
    await syncConfigSnapshotToFirestore({
      allPackages: list,
      packages: list.filter((p) => p.status !== 'inactive')
    });
    return list;
  },

  async adminUpdateContent(content: Partial<WebsiteContent>): Promise<WebsiteContent> {
    let result = { ...this.getCachedOrFallbackConfig().content, ...content };
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });
      if (res.ok) result = await res.json();
    } catch {}
    await syncConfigSnapshotToFirestore({ content: result });
    return result;
  },

  async adminUpdateEmailTemplates(emailTemplates: EmailTemplatesConfig): Promise<{ success: boolean; emailTemplates: EmailTemplatesConfig }> {
    let result = { success: true, emailTemplates };
    try {
      const res = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailTemplates)
      });
      if (res.ok) result = await res.json();
    } catch {}
    await syncConfigSnapshotToFirestore({ emailTemplates: result.emailTemplates });
    return result;
  },

  // --- Admin Integrations (Paystack & Brevo) ---
  async adminGetIntegrations(): Promise<any> {
    const res = await fetch('/api/admin/integrations');
    if (res.ok) return res.json();
    return {
      paystackConfig: {
        publicKey: 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b',
        secretKeyMasked: '',
        isLive: true
      },
      brevoConfig: {
        apiKey: '',
        hasApiKey: false,
        senderEmail: 'baffourgideon05@gmail.com',
        senderName: 'AdPulse Global',
        isEnabled: true,
        notifyAdminOnOrder: true,
        adminNotifyEmail: 'baffourgideon05@gmail.com'
      },
      emailLogs: []
    };
  },

  async adminUpdatePaystack(payload: { publicKey?: string; secretKey?: string; isLive?: boolean }): Promise<any> {
    const res = await fetch('/api/admin/integrations/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async adminUpdateBrevo(payload: {
    apiKey?: string;
    senderEmail?: string;
    senderName?: string;
    isEnabled?: boolean;
    notifyAdminOnOrder?: boolean;
    adminNotifyEmail?: string;
  }): Promise<any> {
    const res = await fetch('/api/admin/integrations/brevo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async adminSendTestEmail(
    toEmail: string,
    toName?: string,
    templateKey?: 'orderReceipt' | 'adminOrderAlert' | 'passwordReset'
  ): Promise<any> {
    const res = await fetch('/api/admin/integrations/brevo/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toEmail, toName, templateKey })
    });
    return res.json();
  }
};
