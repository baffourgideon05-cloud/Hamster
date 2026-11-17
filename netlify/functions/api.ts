import fs from 'fs';
import { BrevoEmailService } from '../../src/server/brevoService.ts';
import { DEFAULT_EMAIL_TEMPLATES } from '../../src/server/emailTemplates.ts';
import {
  buildRobotsTxt,
  buildSitemapXml,
  checkRateLimit,
  createOrderAccessToken,
  createSessionToken,
  extractBearerToken,
  getRequestOrigin,
  getSecurityHeaders,
  hashPassword,
  isLegacySha256Hash,
  isValidEmail,
  sanitizePlainText,
  verifyFirebaseIdToken,
  verifyOrderAccessToken,
  verifyPassword,
  verifySessionToken,
  type SessionPayload
} from '../../src/server/security.ts';
import type {
  Currency,
  CurrencyCode,
  PricingConfig,
  AdvertisingService,
  AdvertisingPackage,
  Order,
  WebsiteContent,
  UserAccount,
  PasswordResetRequest,
  SiteBranding,
  FooterConfig,
  AutoRateEngineConfig,
  PaystackConfig,
  BrevoConfig,
  EmailTemplatesConfig,
  EmailLog,
  FundingArrangement
} from '../../src/types/index.ts';

const TMP_STORE_PATH = '/tmp/adpulse_netlify_store.json';

interface NetlifyDb {
  branding: SiteBranding;
  footerConfig: FooterConfig;
  currencies: Currency[];
  rateHistory: any[];
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

function getDefaultDb(): NetlifyDb {
  const paystackPublicKey =
    process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b';
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

  return {
    branding: {
      siteTitle: 'AdPulse Global | Done-For-You Meta Advertising Packages',
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
      aboutText:
        'International Meta advertising agency providing automated campaign pricing, multi-currency settlement, and high-ROI Facebook & Instagram performance marketing.',
      copyrightNotice: `© ${new Date().getFullYear()} AdPulse Global Advertising Ltd. All rights reserved.`
    },
    currencies: [
      { code: 'USD', name: 'US Dollar', symbol: '$', precision: 2, rateVsUSD: 1.0, previousRateVsUSD: 1.0, lastUpdated: new Date().toISOString(), source: 'Federal Reserve', status: 'active', supportedForPayment: true, marginPercent: 0 },
      { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', precision: 2, rateVsUSD: 15.45, previousRateVsUSD: 15.2, lastUpdated: new Date().toISOString(), source: 'Bank of Ghana', status: 'active', supportedForPayment: true, marginPercent: 2.0 },
      { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', precision: 2, rateVsUSD: 1485.0, previousRateVsUSD: 1470.0, lastUpdated: new Date().toISOString(), source: 'Central Bank of Nigeria', status: 'active', supportedForPayment: true, marginPercent: 2.0 },
      { code: 'EUR', name: 'Euro', symbol: '€', precision: 2, rateVsUSD: 0.92, previousRateVsUSD: 0.925, lastUpdated: new Date().toISOString(), source: 'ECB', status: 'active', supportedForPayment: false, marginPercent: 1.5 },
      { code: 'GBP', name: 'British Pound', symbol: '£', precision: 2, rateVsUSD: 0.78, previousRateVsUSD: 0.785, lastUpdated: new Date().toISOString(), source: 'Bank of England', status: 'active', supportedForPayment: false, marginPercent: 1.5 },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R', precision: 2, rateVsUSD: 18.25, previousRateVsUSD: 18.4, lastUpdated: new Date().toISOString(), source: 'SARB', status: 'active', supportedForPayment: true, marginPercent: 2.0 }
    ],
    rateHistory: [],
    autoRateEngine: {
      enabled: true,
      pollIntervalSeconds: 60,
      sensitivityPercent: 0.5,
      autoBoostMarginPercent: 2.0,
      lastAutoDetection: new Date().toISOString(),
      autoLogs: []
    },
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
    services: [
      {
        id: 'srv-whatsapp',
        name: 'Direct WhatsApp Inbound Ad Funnel',
        category: 'Conversational Commerce',
        description: 'Direct click-to-WhatsApp messaging ads designed for instant buyer chats.',
        objectives: ['WhatsApp Conversations', 'Instant Inquiries'],
        pricingMethod: 'PERCENTAGE',
        markupPercent: 18,
        fixedFee: 20,
        minBudget: 10,
        defaultDurationDays: 7,
        availableDurations: [5, 7, 10],
        isPublished: true,
        features: ['Click-to-WhatsApp CTA', 'Precision Audience Targeting']
      }
    ],
    packages: [
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
    ],
    orders: [],
    users: [
      {
        id: 'usr-admin-gideon',
        email: 'baffourgideon05@gmail.com',
        name: 'Gideon Baffour',
        phone: '+233 24 100 2000',
        role: 'admin',
        authProvider: 'email',
        passwordHash: hashPassword('TaNGOCAR123_'),
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ],
    resetRequests: [],
    content: {
      headline: 'FACEBOOK ADS - DONE FOR YOU',
      subheadline: 'Hello boss, I will handle everything to bring you customers on WhatsApp. You just pay once.',
      agencyEmail: 'hello@adpulse.agency',
      agencyPhone: '+233 30 299 4411',
      agencyAddress: 'Floor 7, Heritage Tower, Ambassadorial Enclave, Ridge, Accra, Ghana',
      businessHours: 'Monday – Friday: 8:00 AM – 6:00 PM GMT',
      faqs: [
        { id: 'faq-1', question: 'What is included in the Done For You Facebook ads packages?', answer: 'Everything is handled for you — from ad design and targeting to bringing interested customers directly to your WhatsApp. You pay one total price once.', category: 'Packages' },
        { id: 'faq-2', question: 'What payment methods do you accept?', answer: 'Paystack accepts MTN Mobile Money, Telecel Cash, AirtelTigo Money, Bank Cards, GHS, NGN, USD, and ZAR.', category: 'Payments' },
        { id: 'faq-3', question: 'How quickly will my ads launch?', answer: 'Campaign setup starts immediately after Paystack payment verification and launches within 24 hours.', category: 'Delivery' }
      ],
      termsOfService: 'Done For You Facebook & Instagram Advertising Terms.',
      privacyPolicy: 'Your WhatsApp number and business data remain confidential.',
      refundPolicy: '100% refund if campaign launch cannot be completed.',
      serviceAgreement: 'Standard Done-For-You Advertising Delivery.'
    },
    paystackConfig: {
      publicKey: paystackPublicKey,
      secretKey: paystackSecretKey,
      isLive: true
    },
    brevoConfig: {
      apiKey: process.env.BREVO_API_KEY || '',
      senderEmail: process.env.BREVO_SENDER_EMAIL || 'baffourgideon05@gmail.com',
      senderName: process.env.BREVO_SENDER_NAME || 'AdPulse Global',
      isEnabled: true,
      notifyAdminOnOrder: true,
      adminNotifyEmail: 'baffourgideon05@gmail.com'
    },
    emailTemplates: JSON.parse(JSON.stringify(DEFAULT_EMAIL_TEMPLATES)),
    emailLogs: [],
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

let memoryDb: NetlifyDb | null = null;

function readDb(): NetlifyDb {
  if (memoryDb) return memoryDb;
  try {
    if (fs.existsSync(TMP_STORE_PATH)) {
      memoryDb = JSON.parse(fs.readFileSync(TMP_STORE_PATH, 'utf-8'));
      return memoryDb!;
    }
  } catch {}
  memoryDb = getDefaultDb();
  return memoryDb;
}

function saveDb(db: NetlifyDb, bumpUpdatedAt = false) {
  if (bumpUpdatedAt) {
    db.updatedAt = new Date().toISOString();
  }
  memoryDb = db;
  try {
    const tmp = `${TMP_STORE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, TMP_STORE_PATH);
  } catch {}
}

function makeHeaders(req: Request, contentType = 'application/json', extra: Record<string, string> = {}): Record<string, string> {
  const reqOrigin = req.headers.get('origin') || '*';
  const originUrl = getRequestOrigin(req.headers, new URL(req.url).origin);
  return {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': reqOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Order-Token',
    ...getSecurityHeaders(originUrl.startsWith('https://')),
    ...extra
  };
}

function jsonResponse(req: Request, data: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: makeHeaders(req, 'application/json', extraHeaders)
  });
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0]?.trim() || 'netlify-client';
}

function getSessionFromRequest(req: Request): SessionPayload | null {
  const bearer = extractBearerToken(req.headers.get('authorization'));
  return verifySessionToken(bearer);
}

function computePrice(db: NetlifyDb, params: {
  serviceId?: string;
  packageId?: string;
  adBudgetUSD?: number;
  fundingArrangement?: FundingArrangement;
  targetCurrency?: CurrencyCode;
}) {
  const service = db.services.find(s => s.id === params.serviceId) || db.services[0];
  const pkg = params.packageId ? db.packages.find(p => p.id === params.packageId) : undefined;
  const adBudgetUSD = pkg ? pkg.advertisingBudgetUSD : Math.max(10, Number(params.adBudgetUSD) || 18);
  const agencyFeeUSD = pkg ? pkg.managementFeeUSD : 15;
  const arrangement: FundingArrangement = params.fundingArrangement || 'COMBINED';
  const totalUSD = arrangement === 'COMBINED' ? adBudgetUSD + agencyFeeUSD : agencyFeeUSD;

  const targetCode = (params.targetCurrency || 'GHS') as CurrencyCode;
  const curr = db.currencies.find(c => c.code === targetCode) || db.currencies[0];
  const effectiveRate = curr.rateVsUSD * (1 + (curr.marginPercent || 0) / 100);

  if (pkg && pkg.priceGHS && targetCode === 'GHS') {
    return {
      service,
      package: pkg,
      fundingArrangement: arrangement,
      base: { currency: 'USD' as CurrencyCode, adBudgetUSD, agencyFeeUSD, taxUSD: 0, totalUSD },
      converted: {
        currency: 'GHS' as CurrencyCode,
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
    fundingArrangement: arrangement,
    base: { currency: 'USD' as CurrencyCode, adBudgetUSD, agencyFeeUSD, taxUSD: 0, totalUSD },
    converted: {
      currency: curr.code,
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
}

function maskKey(k: string): string {
  if (!k) return '';
  if (k.length <= 12) return '********';
  return `${k.slice(0, 10)}••••••••${k.slice(-4)}`;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return jsonResponse(req, { ok: true }, 200);
  }

  const url = new URL(req.url);
  let rawPath = url.pathname;
  if (rawPath.startsWith('/.netlify/functions/api')) {
    rawPath = rawPath.replace('/.netlify/functions/api', '') || '/';
  }

  const db = readDb();
  if (!db.emailTemplates) {
    db.emailTemplates = JSON.parse(JSON.stringify(DEFAULT_EMAIL_TEMPLATES));
  }

  // Dynamic Multi-Domain Search Engine Discovery Files (Robots.txt & Sitemap.xml)
  if (req.method === 'GET' && rawPath === '/robots.txt') {
    const origin = getRequestOrigin(req.headers, url.origin);
    return new Response(buildRobotsTxt(origin), {
      status: 200,
      headers: makeHeaders(req, 'text/plain; charset=utf-8', { 'Cache-Control': 'public, max-age=3600' })
    });
  }

  if (req.method === 'GET' && rawPath === '/sitemap.xml') {
    const origin = getRequestOrigin(req.headers, url.origin);
    return new Response(
      buildSitemapXml(origin, {
        updatedAt: db.updatedAt,
        branding: db.branding,
        packages: db.packages,
        content: db.content,
        footerConfig: db.footerConfig
      }),
      {
        status: 200,
        headers: makeHeaders(req, 'application/xml; charset=utf-8', { 'Cache-Control': 'public, max-age=3600' })
      }
    );
  }

  const apiPath = rawPath.startsWith('/api') ? rawPath : `/api${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;

  // Require signed Admin Bearer token for ALL /api/admin/* endpoints
  if (apiPath.startsWith('/api/admin')) {
    const session = getSessionFromRequest(req);
    if (!session) {
      return jsonResponse(req, { error: 'Authentication required. Please sign in to continue.' }, 401);
    }
    if (session.role !== 'admin') {
      return jsonResponse(req, { error: 'Forbidden: Administrator privileges required.' }, 403);
    }
  }

  const brevo = new BrevoEmailService(db.brevoConfig);
  brevo.setSiteContext({
    branding: db.branding,
    footerConfig: db.footerConfig,
    emailTemplates: db.emailTemplates
  });
  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.json().catch(() => ({})) : {};

  try {
    // 1. Config (strictly non-secret public storefront config)
    if (req.method === 'GET' && apiPath === '/api/config') {
      const effectiveBrevoKey = db.brevoConfig.apiKey || process.env.BREVO_API_KEY || '';
      return jsonResponse(req, {
        branding: db.branding,
        footerConfig: db.footerConfig,
        currencies: db.currencies.filter(c => c.status === 'active'),
        allCurrencies: db.currencies,
        pricingConfig: db.pricingConfig,
        services: db.services.filter(s => s.isPublished),
        allServices: db.services,
        packages: db.packages.filter(p => p.status === 'active'),
        allPackages: db.packages,
        content: db.content,
        rateHistory: db.rateHistory.slice(0, 20),
        autoRateEngine: db.autoRateEngine,
        paystackPublicKey: db.paystackConfig.publicKey || process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b',
        brevoConfigured: Boolean(effectiveBrevoKey && db.brevoConfig.isEnabled),
        emailTemplates: db.emailTemplates,
        updatedAt: db.updatedAt || '2026-01-01T00:00:00.000Z'
      });
    }

    // 2. Auth endpoints (Salted scrypt + rate limiting + Firebase ID token verification + HMAC session tokens)
    if (req.method === 'POST' && apiPath === '/api/auth/register') {
      const ip = getClientIp(req);
      const limit = checkRateLimit(`register:${ip}`, 10, 10 * 60 * 1000);
      if (!limit.allowed) {
        return jsonResponse(req, { error: 'Too many registration attempts. Please try again later.' }, 429, {
          'Retry-After': String(limit.retryAfterSeconds)
        });
      }

      const name = sanitizePlainText(body?.name, 120);
      const lower = sanitizePlainText(body?.email, 254).toLowerCase();
      const phone = sanitizePlainText(body?.phone, 40);
      const password = typeof body?.password === 'string' ? body.password : '';

      if (!name || !isValidEmail(lower) || password.length < 6) {
        return jsonResponse(req, { error: 'Valid name, email, and password (min 6 characters) are required.' }, 400);
      }
      if (db.users.some(u => u.email.toLowerCase() === lower)) {
        return jsonResponse(req, { error: 'An account with this email already exists.' }, 400);
      }
      const user: UserAccount = {
        id: `usr-${Date.now()}`,
        name,
        email: lower,
        phone,
        role: lower === 'baffourgideon05@gmail.com' ? 'admin' : 'customer',
        authProvider: 'email',
        passwordHash: hashPassword(password),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      saveDb(db);
      const { passwordHash, ...safeUser } = user;
      const token = createSessionToken({ id: safeUser.id, email: safeUser.email, role: safeUser.role });
      return jsonResponse(req, { success: true, user: safeUser, token });
    }

    if (req.method === 'POST' && apiPath === '/api/auth/login') {
      const ip = getClientIp(req);
      const lower = sanitizePlainText(body?.email, 254).toLowerCase();
      const limit = checkRateLimit(`login:${ip}:${lower}`, 12, 5 * 60 * 1000);
      if (!limit.allowed) {
        return jsonResponse(
          req,
          { error: `Too many sign-in attempts. Wait ${limit.retryAfterSeconds}s and retry.` },
          429,
          { 'Retry-After': String(limit.retryAfterSeconds) }
        );
      }

      const password = typeof body?.password === 'string' ? body.password : '';
      const user = db.users.find(u => u.email.toLowerCase() === lower);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return jsonResponse(req, { error: 'Invalid email or password.' }, 401);
      }
      if (isLegacySha256Hash(user.passwordHash)) {
        user.passwordHash = hashPassword(password);
        saveDb(db);
      }
      const { passwordHash, ...safeUser } = user;
      const token = createSessionToken({ id: safeUser.id, email: safeUser.email, role: safeUser.role });
      return jsonResponse(req, { success: true, user: safeUser, token });
    }

    if (req.method === 'POST' && apiPath === '/api/auth/google') {
      const ip = getClientIp(req);
      const limit = checkRateLimit(`google:${ip}`, 15, 5 * 60 * 1000);
      if (!limit.allowed) {
        return jsonResponse(req, { error: 'Too many authentication attempts.' }, 429, {
          'Retry-After': String(limit.retryAfterSeconds)
        });
      }

      const verified = await verifyFirebaseIdToken(body?.idToken);
      if (!verified.valid || !verified.email) {
        return jsonResponse(req, { error: verified.error || 'Google authentication token could not be verified.' }, 401);
      }

      const lower = verified.email.toLowerCase();
      const isAdmin = lower === db.branding.adminGoogleEmail.toLowerCase() || lower === 'baffourgideon05@gmail.com';
      let user = db.users.find(u => u.email.toLowerCase() === lower);
      if (!user) {
        user = {
          id: `usr-g-${Date.now()}`,
          email: lower,
          name: sanitizePlainText(verified.name || body?.name || lower.split('@')[0], 120),
          avatarUrl: typeof (verified.picture || body?.picture) === 'string' ? String(verified.picture || body?.picture).slice(0, 500) : undefined,
          role: isAdmin ? 'admin' : 'customer',
          authProvider: 'google',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        db.users.push(user);
        saveDb(db);
      } else if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
        saveDb(db);
      }
      const { passwordHash, ...safeUser } = user;
      const token = createSessionToken({ id: safeUser.id, email: safeUser.email, role: safeUser.role });
      return jsonResponse(req, { success: true, user: safeUser, isAdmin, token });
    }

    if (req.method === 'POST' && apiPath === '/api/auth/forgot-password') {
      const ip = getClientIp(req);
      const limit = checkRateLimit(`forgot:${ip}`, 6, 10 * 60 * 1000);
      if (!limit.allowed) {
        return jsonResponse(req, { error: 'Too many reset requests. Please try again later.' }, 429, {
          'Retry-After': String(limit.retryAfterSeconds)
        });
      }
      const lower = sanitizePlainText(body?.email, 254).toLowerCase();
      if (!isValidEmail(lower)) {
        return jsonResponse(req, { error: 'Valid email address is required' }, 400);
      }
      const user = db.users.find(u => u.email.toLowerCase() === lower);
      db.resetRequests.unshift({
        id: `rst-${Date.now()}`,
        userEmail: lower,
        userName: user?.name || lower,
        requestedAt: new Date().toISOString(),
        status: 'pending'
      });
      saveDb(db);
      return jsonResponse(req, { success: true, message: 'Password reset request submitted.' });
    }

    // 3. Pricing & Orders
    if (req.method === 'POST' && apiPath === '/api/pricing/calculate') {
      return jsonResponse(req, computePrice(db, body));
    }

    if (req.method === 'POST' && apiPath === '/api/orders') {
      const ip = getClientIp(req);
      const limit = checkRateLimit(`order_create:${ip}`, 20, 10 * 60 * 1000);
      if (!limit.allowed) {
        return jsonResponse(req, { error: 'Too many order requests.' }, 429, {
          'Retry-After': String(limit.retryAfterSeconds)
        });
      }

      const { customerId, serviceId, packageId, fundingArrangement, adBudgetUSD, targetCurrency, paymentCurrency, campaignBrief } = body;
      const customerEmail = sanitizePlainText(body?.customerEmail, 254).toLowerCase();
      const customerName = sanitizePlainText(body?.customerName, 120);
      const customerPhone = sanitizePlainText(body?.customerPhone, 40);

      if (!isValidEmail(customerEmail) || !customerName) {
        return jsonResponse(req, { error: 'Valid customer name and email required' }, 400);
      }

      const effectiveCurrency = (targetCurrency || paymentCurrency || 'GHS').toUpperCase() as CurrencyCode;
      const calc = computePrice(db, { serviceId, packageId, adBudgetUSD, fundingArrangement, targetCurrency: effectiveCurrency });

      const cleanBrief = campaignBrief
        ? {
            businessName: sanitizePlainText(campaignBrief.businessName, 160) || customerName,
            platform: ['facebook', 'instagram', 'both'].includes(campaignBrief.platform) ? campaignBrief.platform : 'both',
            objective: sanitizePlainText(campaignBrief.objective, 80) || 'WhatsApp Conversations',
            targetLocations: sanitizePlainText(campaignBrief.targetLocations, 200) || 'Ghana',
            targetAge: sanitizePlainText(campaignBrief.targetAge, 40) || '20 - 55',
            targetInterests: sanitizePlainText(campaignBrief.targetInterests, 240) || 'Buyers',
            headline: sanitizePlainText(campaignBrief.headline, 240) || customerName,
            primaryText: sanitizePlainText(campaignBrief.primaryText, 1200) || 'Message us on WhatsApp',
            callToAction: sanitizePlainText(campaignBrief.callToAction, 60) || 'Send WhatsApp Message',
            destinationUrl: sanitizePlainText(campaignBrief.destinationUrl, 400) || 'https://wa.me/',
            ...(campaignBrief.specialInstructions
              ? { specialInstructions: sanitizePlainText(campaignBrief.specialInstructions, 1000) }
              : {})
          }
        : {
            businessName: customerName,
            platform: 'both' as const,
            objective: 'WhatsApp Conversations',
            targetLocations: 'Ghana',
            targetAge: '20 - 55',
            targetInterests: 'Buyers',
            headline: customerName,
            primaryText: 'Message us on WhatsApp',
            callToAction: 'Send WhatsApp Message',
            destinationUrl: 'https://wa.me/'
          };

      const newOrder: Order = {
        id: `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        customerId: customerId || `usr-${Date.now()}`,
        customerEmail,
        customerName,
        customerPhone,
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
        campaignBrief: cleanBrief,
        campaignStatus: 'DRAFT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.orders.unshift(newOrder);
      saveDb(db);
      const orderAccessToken = createOrderAccessToken(newOrder.id, newOrder.customerEmail);
      return jsonResponse(req, { ...newOrder, orderAccessToken }, 201);
    }

    if (req.method === 'GET' && apiPath === '/api/orders') {
      const session = getSessionFromRequest(req);
      if (!session) {
        return jsonResponse(req, []);
      }
      if (session.role === 'admin') {
        const email = url.searchParams.get('email');
        if (email) {
          return jsonResponse(req, db.orders.filter(o => o.customerEmail.toLowerCase() === email.toLowerCase()));
        }
        return jsonResponse(req, db.orders);
      }
      return jsonResponse(req, db.orders.filter(o => o.customerEmail.toLowerCase() === session.email));
    }

    if (req.method === 'GET' && apiPath.startsWith('/api/orders/') && !apiPath.endsWith('/brief')) {
      const id = decodeURIComponent(apiPath.replace('/api/orders/', ''));
      const order = db.orders.find(o => o.id === id);
      if (!order) return jsonResponse(req, { error: 'Order not found' }, 404);
      const session = getSessionFromRequest(req);
      const orderToken = req.headers.get('x-order-token') || url.searchParams.get('orderToken') || '';
      const authorized =
        session?.role === 'admin' ||
        (session && session.email === order.customerEmail.toLowerCase()) ||
        verifyOrderAccessToken(orderToken, order.id);
      if (!authorized) {
        return jsonResponse(req, { error: 'Authentication required.' }, 401);
      }
      return jsonResponse(req, order);
    }

    // 4. Paystack Initialize & Verify (Live Payment Required + Any-Domain Callback)
    if (req.method === 'POST' && apiPath === '/api/paystack/initialize') {
      const ip = getClientIp(req);
      const limit = checkRateLimit(`pstk_init:${ip}`, 20, 10 * 60 * 1000);
      if (!limit.allowed) {
        return jsonResponse(req, { error: 'Too many payment attempts. Please wait a moment.' }, 429, {
          'Retry-After': String(limit.retryAfterSeconds)
        });
      }

      const { orderId, orderAccessToken } = body || {};
      const order = db.orders.find(o => o.id === orderId);
      if (!order) return jsonResponse(req, { error: 'Order not found' }, 404);

      const session = getSessionFromRequest(req);
      const headerOrderToken = req.headers.get('x-order-token') || orderAccessToken || '';
      const authorized =
        session?.role === 'admin' ||
        (session && session.email === order.customerEmail.toLowerCase()) ||
        verifyOrderAccessToken(headerOrderToken, order.id);
      if (!authorized) {
        return jsonResponse(req, { error: 'Unauthorized payment initialization attempt.' }, 401);
      }

      const secretKey = db.paystackConfig.secretKey || process.env.PAYSTACK_SECRET_KEY || '';
      if (!secretKey || !secretKey.startsWith('sk_')) {
        return jsonResponse(
          req,
          { error: 'Paystack Secret Key is not configured. Set PAYSTACK_SECRET_KEY in Netlify Environment Variables or save it in Admin -> Brevo & Paystack Live.' },
          400
        );
      }

      let chargeCurrency = order.paymentCurrency;
      let chargeAmount = Math.round(order.paymentTotal * 100);
      if (!['GHS', 'NGN', 'USD', 'ZAR'].includes(chargeCurrency)) {
        chargeCurrency = 'USD';
        chargeAmount = Math.round(order.totalUSD * 100);
      }

      const reference = `pstk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const origin = getRequestOrigin(req.headers, url.origin);

      const pRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: order.customerEmail,
          amount: chargeAmount,
          currency: chargeCurrency,
          reference,
          callback_url: `${origin}/?orderId=${encodeURIComponent(order.id)}`,
          channels: ['card', 'mobile_money', 'bank', 'bank_transfer'],
          metadata: {
            orderId: order.id,
            serviceName: order.serviceName,
            packageName: order.packageName || order.serviceName,
            customerName: order.customerName,
            customerPhone: order.customerPhone
          }
        })
      });

      const pData: any = await pRes.json();
      if (!pRes.ok || !pData.status || !pData.data) {
        return jsonResponse(req, { error: pData?.message || 'Paystack rejected transaction initialization.' }, 400);
      }

      order.paymentReference = pData.data.reference;
      saveDb(db);
      return jsonResponse(req, {
        status: true,
        authorization_url: pData.data.authorization_url,
        access_code: pData.data.access_code,
        reference: pData.data.reference,
        amount: chargeAmount,
        currency: chargeCurrency
      });
    }

    if (req.method === 'GET' && apiPath.startsWith('/api/paystack/verify/')) {
      const reference = decodeURIComponent(apiPath.replace('/api/paystack/verify/', ''));
      const orderIdParam = url.searchParams.get('orderId') || '';

      const secretKey = db.paystackConfig.secretKey || process.env.PAYSTACK_SECRET_KEY || '';
      if (!secretKey || !secretKey.startsWith('sk_')) {
        return jsonResponse(
          req,
          { verified: false, error: 'Paystack Secret Key is not configured. Set PAYSTACK_SECRET_KEY in Netlify Environment Variables or save it in Admin -> Brevo & Paystack Live.' },
          400
        );
      }

      const vRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { 'Authorization': `Bearer ${secretKey}` }
      });
      const vData: any = await vRes.json();

      if (!vRes.ok || !vData.status || vData.data?.status !== 'success') {
        return jsonResponse(
          req,
          {
            verified: false,
            error: vData?.data?.gateway_response || vData?.message || 'Payment not completed on Paystack'
          },
          400
        );
      }

      const metaOrderId = vData.data?.metadata?.orderId || orderIdParam;
      const order = db.orders.find(
        o =>
          o.paymentReference === reference ||
          (metaOrderId && o.id === metaOrderId) ||
          (o.paymentReference && reference.startsWith(o.paymentReference))
      );
      if (!order) return jsonResponse(req, { verified: false, error: 'Order not found for payment reference' }, 404);

      const expectedSubunits = Math.round(
        (['GHS', 'NGN', 'USD', 'ZAR'].includes(order.paymentCurrency) ? order.paymentTotal : order.totalUSD) * 100
      );
      if (typeof vData.data.amount === 'number' && vData.data.amount < expectedSubunits) {
        return jsonResponse(req, { verified: false, error: 'Verified Paystack amount is below order total.' }, 400);
      }

      order.paymentReference = vData.data.reference || reference;
      order.paymentStatus = 'PAID';
      order.paymentChannel = vData.data.channel || 'card';
      order.paidAt = vData.data.paid_at || new Date().toISOString();
      if (!order.receiptNumber) {
        order.receiptNumber = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      if (order.campaignStatus === 'DRAFT') order.campaignStatus = 'SUBMITTED';
      order.updatedAt = new Date().toISOString();

      let emailDispatched = false;
      if (db.brevoConfig.isEnabled) {
        const custRes = await brevo.sendOrderReceiptEmail(order);
        const l1 = brevo.getLogs()[0];
        if (l1) db.emailLogs.unshift(l1);
        emailDispatched = Boolean(custRes.success);
        if (db.brevoConfig.notifyAdminOnOrder) {
          await brevo.sendAdminOrderNotificationEmail(order);
          const l2 = brevo.getLogs()[0];
          if (l2) db.emailLogs.unshift(l2);
        }
      }

      saveDb(db);
      return jsonResponse(req, { verified: true, order, emailDispatched });
    }

    // 5. Admin Integrations (Paystack & Brevo - Protected by requireAdmin gate above)
    if (req.method === 'GET' && apiPath === '/api/admin/integrations') {
      const effectivePaystackSecret = db.paystackConfig.secretKey || process.env.PAYSTACK_SECRET_KEY || '';
      const effectiveBrevoKey = db.brevoConfig.apiKey || process.env.BREVO_API_KEY || '';
      return jsonResponse(req, {
        paystackConfig: {
          publicKey: db.paystackConfig.publicKey || process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b',
          secretKeyMasked: effectivePaystackSecret ? maskKey(effectivePaystackSecret) : '',
          hasSecretKey: Boolean(effectivePaystackSecret && effectivePaystackSecret.startsWith('sk_')),
          isLive: db.paystackConfig.isLive
        },
        brevoConfig: {
          ...db.brevoConfig,
          apiKey: effectiveBrevoKey ? maskKey(effectiveBrevoKey) : '',
          hasApiKey: Boolean(effectiveBrevoKey && effectiveBrevoKey.length > 10)
        },
        emailLogs: db.emailLogs
      });
    }

    if (req.method === 'POST' && apiPath === '/api/admin/integrations/paystack') {
      if (body.publicKey && !String(body.publicKey).includes('••••')) db.paystackConfig.publicKey = String(body.publicKey).trim();
      if (body.secretKey && !String(body.secretKey).includes('••••')) db.paystackConfig.secretKey = String(body.secretKey).trim();
      if (body.isLive !== undefined) db.paystackConfig.isLive = Boolean(body.isLive);
      saveDb(db);
      return jsonResponse(req, { success: true, publicKey: db.paystackConfig.publicKey, isLive: db.paystackConfig.isLive });
    }

    if (req.method === 'POST' && apiPath === '/api/admin/integrations/brevo') {
      if (body.apiKey && !String(body.apiKey).includes('••••')) db.brevoConfig.apiKey = String(body.apiKey).trim();
      if (body.senderEmail !== undefined) db.brevoConfig.senderEmail = String(body.senderEmail).trim();
      if (body.senderName !== undefined) db.brevoConfig.senderName = String(body.senderName).trim();
      if (body.isEnabled !== undefined) db.brevoConfig.isEnabled = Boolean(body.isEnabled);
      if (body.notifyAdminOnOrder !== undefined) db.brevoConfig.notifyAdminOnOrder = Boolean(body.notifyAdminOnOrder);
      if (body.adminNotifyEmail !== undefined) db.brevoConfig.adminNotifyEmail = String(body.adminNotifyEmail).trim();
      saveDb(db);
      const effectiveKey = db.brevoConfig.apiKey || process.env.BREVO_API_KEY || '';
      return jsonResponse(req, {
        success: true,
        hasApiKey: Boolean(effectiveKey && effectiveKey.length > 10),
        brevoConfig: { ...db.brevoConfig, apiKey: effectiveKey ? maskKey(effectiveKey) : '' }
      });
    }

    if (req.method === 'POST' && apiPath === '/api/admin/integrations/brevo/test') {
      const target = (body.toEmail || db.brevoConfig.adminNotifyEmail || 'baffourgideon05@gmail.com').trim();
      const result = await brevo.sendTestEmail(target, body.toName || 'Gideon Baffour', undefined, body.templateKey || 'orderReceipt');
      const l = brevo.getLogs()[0];
      if (l) db.emailLogs.unshift(l);
      saveDb(db);
      return jsonResponse(req, { ...result, emailLogs: db.emailLogs });
    }

    if (req.method === 'POST' && apiPath === '/api/admin/email-templates') {
      db.emailTemplates = {
        ...db.emailTemplates,
        ...body,
        orderReceipt: { ...db.emailTemplates.orderReceipt, ...(body.orderReceipt || {}) },
        adminOrderAlert: { ...db.emailTemplates.adminOrderAlert, ...(body.adminOrderAlert || {}) },
        passwordReset: { ...db.emailTemplates.passwordReset, ...(body.passwordReset || {}) }
      };
      saveDb(db, true);
      return jsonResponse(req, { success: true, emailTemplates: db.emailTemplates, updatedAt: db.updatedAt });
    }

    // 6. Admin Site Settings, Packages, Currencies & Users
    if (req.method === 'POST' && apiPath === '/api/admin/restore-config') {
      if (body.branding) db.branding = { ...db.branding, ...body.branding };
      if (body.footerConfig) db.footerConfig = { ...db.footerConfig, ...body.footerConfig };
      if (body.content) db.content = { ...db.content, ...body.content };
      if (Array.isArray(body.packages) && body.packages.length > 0) db.packages = body.packages;
      if (Array.isArray(body.services) && body.services.length > 0) db.services = body.services;
      if (Array.isArray(body.currencies) && body.currencies.length > 0) db.currencies = body.currencies;
      if (body.pricingConfig) db.pricingConfig = { ...db.pricingConfig, ...body.pricingConfig };
      if (body.autoRateEngine) db.autoRateEngine = { ...db.autoRateEngine, ...body.autoRateEngine };
      if (body.emailTemplates) db.emailTemplates = { ...db.emailTemplates, ...body.emailTemplates };
      db.updatedAt = body.updatedAt || new Date().toISOString();
      saveDb(db);
      return jsonResponse(req, { success: true, updatedAt: db.updatedAt });
    }

    if (req.method === 'POST' && apiPath === '/api/admin/branding') {
      db.branding = { ...db.branding, ...body };
      saveDb(db, true);
      return jsonResponse(req, { success: true, branding: db.branding, updatedAt: db.updatedAt });
    }

    if (req.method === 'POST' && apiPath === '/api/admin/footer') {
      db.footerConfig = { ...db.footerConfig, ...body };
      saveDb(db, true);
      return jsonResponse(req, { success: true, footerConfig: db.footerConfig, updatedAt: db.updatedAt });
    }

    if (req.method === 'POST' && apiPath === '/api/admin/content') {
      db.content = { ...db.content, ...body };
      saveDb(db, true);
      return jsonResponse(req, db.content);
    }

    if (req.method === 'POST' && apiPath === '/api/admin/packages') {
      const idx = db.packages.findIndex(p => p.id === body.id);
      if (idx >= 0) db.packages[idx] = body;
      else db.packages.push({ ...body, id: body.id || `pkg-${Date.now()}` });
      saveDb(db, true);
      return jsonResponse(req, db.packages);
    }

    if (req.method === 'DELETE' && apiPath.startsWith('/api/admin/packages/')) {
      const id = decodeURIComponent(apiPath.replace('/api/admin/packages/', ''));
      db.packages = db.packages.filter(p => p.id !== id);
      saveDb(db, true);
      return jsonResponse(req, { success: true, packages: db.packages, updatedAt: db.updatedAt });
    }

    if (req.method === 'POST' && apiPath === '/api/admin/services') {
      const idx = db.services.findIndex(s => s.id === body.id);
      if (idx >= 0) db.services[idx] = body;
      else db.services.push({ ...body, id: body.id || `srv-${Date.now()}` });
      saveDb(db, true);
      return jsonResponse(req, db.services);
    }

    if (req.method === 'POST' && apiPath === '/api/admin/pricing') {
      db.pricingConfig = { ...db.pricingConfig, ...body };
      saveDb(db, true);
      return jsonResponse(req, db.pricingConfig);
    }

    if (req.method === 'POST' && apiPath.startsWith('/api/admin/currencies/')) {
      const code = decodeURIComponent(apiPath.replace('/api/admin/currencies/', ''));
      const curr = db.currencies.find(c => c.code === code);
      if (!curr) return jsonResponse(req, { error: 'Currency not found' }, 404);
      if (body.marginPercent !== undefined) curr.marginPercent = Number(body.marginPercent);
      if (body.supportedForPayment !== undefined) curr.supportedForPayment = Boolean(body.supportedForPayment);
      if (body.rateVsUSD && Number(body.rateVsUSD) > 0) {
        curr.previousRateVsUSD = curr.rateVsUSD;
        curr.rateVsUSD = Number(body.rateVsUSD);
        curr.lastUpdated = new Date().toISOString();
      }
      saveDb(db, true);
      return jsonResponse(req, { currency: curr, updatedAt: db.updatedAt });
    }

    if (req.method === 'POST' && apiPath.startsWith('/api/orders/') && apiPath.endsWith('/brief')) {
      const id = decodeURIComponent(apiPath.replace('/api/orders/', '').replace('/brief', ''));
      const order = db.orders.find(o => o.id === id);
      if (!order) return jsonResponse(req, { error: 'Order not found' }, 404);

      const session = getSessionFromRequest(req);
      const orderToken = req.headers.get('x-order-token') || body?.orderAccessToken || '';
      const authorized =
        session?.role === 'admin' ||
        (session && session.email === order.customerEmail.toLowerCase()) ||
        verifyOrderAccessToken(orderToken, order.id);
      if (!authorized) {
        return jsonResponse(req, { error: 'Authentication required to update campaign brief.' }, 401);
      }

      order.campaignBrief = {
        ...order.campaignBrief,
        ...(body.businessName !== undefined ? { businessName: sanitizePlainText(body.businessName, 160) } : {}),
        ...(body.headline !== undefined ? { headline: sanitizePlainText(body.headline, 240) } : {}),
        ...(body.primaryText !== undefined ? { primaryText: sanitizePlainText(body.primaryText, 1200) } : {}),
        ...(body.destinationUrl !== undefined ? { destinationUrl: sanitizePlainText(body.destinationUrl, 400) } : {}),
        ...(body.specialInstructions !== undefined ? { specialInstructions: sanitizePlainText(body.specialInstructions, 1000) } : {})
      };
      if (order.campaignStatus === 'DRAFT') order.campaignStatus = 'SUBMITTED';
      order.updatedAt = new Date().toISOString();
      saveDb(db);
      return jsonResponse(req, order);
    }

    if (req.method === 'GET' && apiPath === '/api/admin/users') {
      return jsonResponse(req, db.users.map(({ passwordHash, ...u }) => u));
    }

    if (req.method === 'GET' && apiPath === '/api/admin/reset-requests') {
      return jsonResponse(req, db.resetRequests);
    }

    if (req.method === 'POST' && apiPath.startsWith('/api/admin/orders/') && apiPath.endsWith('/update')) {
      const id = apiPath.replace('/api/admin/orders/', '').replace('/update', '');
      const order = db.orders.find(o => o.id === id);
      if (!order) return jsonResponse(req, { error: 'Order not found' }, 404);
      if (body.campaignStatus) order.campaignStatus = body.campaignStatus;
      if (body.assignedStaff !== undefined) order.assignedStaff = body.assignedStaff;
      if (body.reviewNotes !== undefined) order.reviewNotes = body.reviewNotes;
      if (body.performance) order.performance = { ...order.performance, ...body.performance, lastUpdated: new Date().toISOString() };
      order.updatedAt = new Date().toISOString();
      saveDb(db);
      return jsonResponse(req, order);
    }

    return jsonResponse(req, { error: `Route not found: ${req.method} ${apiPath}` }, 404);
  } catch (err: any) {
    return jsonResponse(req, { error: err.message || 'Internal function error' }, 500);
  }
};
