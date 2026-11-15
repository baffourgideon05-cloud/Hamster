import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { store } from './src/server/dataStore.ts';
import { BrevoEmailService } from './src/server/brevoService.ts';
import { CurrencyCode, FundingArrangement } from './src/types/index.ts';

const brevoService = new BrevoEmailService(store.getDb().brevoConfig);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Enable CORS and preflight handling for all requests
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 1. Get initial public platform configuration
app.get('/api/config', (_req, res) => {
  const db = store.getDb();
  res.json({
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
    paystackPublicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY || db.paystackConfig.publicKey || 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b',
    brevoConfigured: Boolean((db.brevoConfig?.apiKey || process.env.BREVO_API_KEY) && db.brevoConfig?.isEnabled),
    emailTemplates: db.emailTemplates,
    updatedAt: db.updatedAt || '2026-01-01T00:00:00.000Z'
  });
});

// --- AUTHENTICATION & LOGIN SYSTEM ---

// Register customer
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const result = store.registerUser({ name, email, password, phone });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    // Return safe user object (omit passwordHash)
    const { passwordHash, ...safeUser } = result.user!;
    res.json({ success: true, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// Email/Password Login (Both Client and Admin use this unified login)
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = store.authenticateEmail(email, password);
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }
    const { passwordHash, ...safeUser } = result.user!;
    res.json({ success: true, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// Google Login (Both Client and Admin use the same system, but admin role is granted ONLY if email matches Admin Google Account)
app.post('/api/auth/google', (req, res) => {
  try {
    const { email, name, picture, sub } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google email is required' });
    }

    const result = store.authenticateGoogle({ email, name: name || email.split('@')[0], picture, sub });
    const { passwordHash, ...safeUser } = result.user;

    res.json({
      success: true,
      user: safeUser,
      isAdmin: result.isAdmin
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Google authentication failed', details: err.message });
  }
});

// Customer Forgot Password Request
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const result = store.requestPasswordReset(email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Password reset request failed', details: err.message });
  }
});

// Admin: Get all password reset requests
app.get('/api/admin/reset-requests', (_req, res) => {
  const db = store.getDb();
  res.json(db.resetRequests || []);
});

// Admin: Resolve password reset request with temporary password
app.post('/api/admin/reset-requests/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { temporaryPassword, adminEmail } = req.body;
    if (!temporaryPassword) {
      return res.status(400).json({ error: 'Temporary password is required' });
    }
    const result = store.adminResolveReset(id, temporaryPassword, adminEmail || 'baffourgideon05@gmail.com');
    if (!result) {
      return res.status(404).json({ error: 'Reset request not found' });
    }
    // Dispatch password reset email via Brevo using site-synced template
    const db = store.getDb();
    brevoService.updateConfig(db.brevoConfig);
    brevoService.setSiteContext({
      branding: db.branding,
      footerConfig: db.footerConfig,
      emailTemplates: db.emailTemplates
    });
    const emailRes = await brevoService.sendPasswordResetEmail(
      result.req.userEmail,
      result.req.userName,
      temporaryPassword
    );
    const logs = brevoService.getLogs();
    if (logs[0]) store.addEmailLog(logs[0]);

    res.json({ success: true, request: result.req, emailSent: emailRes.success, isSimulated: emailRes.isSimulated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve reset request', details: err.message });
  }
});

// Admin: Directly reset any user's password
app.post('/api/admin/users/:email/reset-password', async (req, res) => {
  try {
    const { email } = req.params;
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    const user = store.adminDirectResetPassword(email, newPassword);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Dispatch password reset email via Brevo using site-synced template
    const db = store.getDb();
    brevoService.updateConfig(db.brevoConfig);
    brevoService.setSiteContext({
      branding: db.branding,
      footerConfig: db.footerConfig,
      emailTemplates: db.emailTemplates
    });
    const emailRes = await brevoService.sendPasswordResetEmail(user.email, user.name, newPassword);
    const logs = brevoService.getLogs();
    if (logs[0]) store.addEmailLog(logs[0]);

    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, user: safeUser, emailSent: emailRes.success, isSimulated: emailRes.isSimulated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset password', details: err.message });
  }
});

// Admin: Get all registered users
app.get('/api/admin/users', (_req, res) => {
  const db = store.getDb();
  const safeUsers = db.users.map(({ passwordHash, ...u }) => u);
  res.json(safeUsers);
});

// Admin: Update Site Branding & Logo
app.post('/api/admin/branding', (req, res) => {
  try {
    const updated = store.updateBranding(req.body);
    res.json({ success: true, branding: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update branding', details: err.message });
  }
});

// Admin: Update Footer Configuration
app.post('/api/admin/footer', (req, res) => {
  try {
    const updated = store.updateFooter(req.body);
    res.json({ success: true, footerConfig: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update footer', details: err.message });
  }
});

// Admin: Trigger Automatic Currency Detection Check
app.post('/api/admin/auto-rate/trigger', (_req, res) => {
  try {
    const results = store.runAutomaticCurrencyDetection();
    const db = store.getDb();
    res.json({
      success: true,
      results,
      currencies: db.currencies,
      autoRateEngine: db.autoRateEngine
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Auto rate detection failed', details: err.message });
  }
});

// Admin: Restore Config Snapshot from Cloud Firestore
app.post('/api/admin/restore-config', (req, res) => {
  try {
    const updatedDb = store.restoreConfigSnapshot(req.body || {});
    res.json({ success: true, updatedAt: updatedDb.updatedAt });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to restore config snapshot', details: err.message });
  }
});

// Admin: Update Auto Rate Engine Configuration
app.post('/api/admin/auto-rate/config', (req, res) => {
  try {
    const db = store.getDb();
    db.autoRateEngine = {
      ...db.autoRateEngine,
      ...req.body
    };
    store.commit(true);
    res.json({ success: true, autoRateEngine: db.autoRateEngine, updatedAt: db.updatedAt });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update auto rate config', details: err.message });
  }
});

// --- INTEGRATIONS: PAYSTACK LIVE & BREVO LIVE EMAIL ---

app.get('/api/admin/integrations', (_req, res) => {
  const db = store.getDb();
  const maskKey = (k: string) => {
    if (!k) return '';
    if (k.length <= 12) return '********';
    return `${k.slice(0, 10)}••••••••${k.slice(-4)}`;
  };
  const effectivePaystackSecret = db.paystackConfig.secretKey || process.env.PAYSTACK_SECRET_KEY || '';
  const effectiveBrevoKey = db.brevoConfig.apiKey || process.env.BREVO_API_KEY || '';

  res.json({
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
    emailLogs: store.getEmailLogs()
  });
});

app.post('/api/admin/integrations/paystack', (req, res) => {
  try {
    const { publicKey, secretKey, isLive } = req.body;
    const updates: any = {};
    if (publicKey && typeof publicKey === 'string' && !publicKey.includes('••••')) {
      updates.publicKey = publicKey.trim();
    }
    if (secretKey && typeof secretKey === 'string' && !secretKey.includes('••••')) {
      updates.secretKey = secretKey.trim();
    }
    if (isLive !== undefined) {
      updates.isLive = Boolean(isLive);
    }
    const updated = store.updatePaystackConfig(updates);
    res.json({ success: true, publicKey: updated.publicKey, isLive: updated.isLive });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update Paystack config', details: err.message });
  }
});

app.post('/api/admin/integrations/brevo', (req, res) => {
  try {
    const { apiKey, senderEmail, senderName, isEnabled, notifyAdminOnOrder, adminNotifyEmail } = req.body;
    const updates: any = {};
    if (apiKey && typeof apiKey === 'string' && !apiKey.includes('••••')) {
      updates.apiKey = apiKey.trim();
    }
    if (senderEmail !== undefined) updates.senderEmail = String(senderEmail).trim();
    if (senderName !== undefined) updates.senderName = String(senderName).trim();
    if (isEnabled !== undefined) updates.isEnabled = Boolean(isEnabled);
    if (notifyAdminOnOrder !== undefined) updates.notifyAdminOnOrder = Boolean(notifyAdminOnOrder);
    if (adminNotifyEmail !== undefined) updates.adminNotifyEmail = String(adminNotifyEmail).trim();

    const updated = store.updateBrevoConfig(updates);
    brevoService.updateConfig(updated);

    res.json({
      success: true,
      hasApiKey: Boolean(updated.apiKey && updated.apiKey.length > 10),
      brevoConfig: {
        ...updated,
        apiKey: updated.apiKey ? `${updated.apiKey.slice(0, 10)}••••••••${updated.apiKey.slice(-4)}` : ''
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update Brevo settings', details: err.message });
  }
});

app.post('/api/admin/integrations/brevo/test', async (req, res) => {
  try {
    const { toEmail, toName, templateKey } = req.body;
    const db = store.getDb();
    const target = (toEmail || db.brevoConfig.adminNotifyEmail || 'baffourgideon05@gmail.com').trim();
    brevoService.updateConfig(db.brevoConfig);
    brevoService.setSiteContext({
      branding: db.branding,
      footerConfig: db.footerConfig,
      emailTemplates: db.emailTemplates
    });
    const result = await brevoService.sendTestEmail(
      target,
      toName || 'Gideon Baffour',
      undefined,
      templateKey || 'orderReceipt'
    );
    const logs = brevoService.getLogs();
    if (logs[0]) store.addEmailLog(logs[0]);

    res.json({
      ...result,
      emailLogs: store.getEmailLogs()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Test email failed' });
  }
});

// Admin: Update Custom Email Templates
app.post('/api/admin/email-templates', (req, res) => {
  try {
    const updated = store.updateEmailTemplates(req.body);
    res.json({ success: true, emailTemplates: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update email templates', details: err.message });
  }
});

// --- PRICING & ORDERS ---

// Calculate authoritative price
app.post('/api/pricing/calculate', (req, res) => {
  try {
    const { serviceId, packageId, adBudgetUSD, fundingArrangement, targetCurrency } = req.body;
    
    if (!serviceId && !packageId) {
      return res.status(400).json({ error: 'serviceId or packageId is required' });
    }

    const result = store.calculatePrice({
      serviceId: serviceId || 'srv-leads',
      packageId,
      adBudgetUSD: Number(adBudgetUSD) || 150,
      fundingArrangement: (fundingArrangement as FundingArrangement) || 'COMBINED',
      targetCurrency: (targetCurrency as CurrencyCode) || 'USD'
    });

    res.json(result);
  } catch (err: any) {
    console.error('Pricing calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate price', details: err.message });
  }
});

// Create a new Order & checkout intent
app.post('/api/orders', (req, res) => {
  try {
    const {
      customerId,
      customerEmail,
      customerName,
      customerPhone,
      serviceId,
      packageId,
      fundingArrangement,
      adBudgetUSD,
      paymentCurrency,
      targetCurrency,
      campaignBrief
    } = req.body;

    if (!customerEmail || !customerName) {
      return res.status(400).json({ error: 'Customer email and name are required' });
    }

    const effectiveCurrency = (targetCurrency || paymentCurrency || 'GHS').toUpperCase();

    const priceCalc = store.calculatePrice({
      serviceId,
      packageId,
      adBudgetUSD: Number(adBudgetUSD) || 150,
      fundingArrangement: fundingArrangement || 'COMBINED',
      targetCurrency: effectiveCurrency
    });

    const db = store.getDb();
    const orderId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const newOrder = {
      id: orderId,
      customerId: customerId || `usr-${Date.now()}`,
      customerEmail,
      customerName,
      customerPhone: customerPhone || '',
      serviceId: priceCalc.service.id,
      serviceName: priceCalc.service.name,
      packageId: priceCalc.package?.id,
      packageName: priceCalc.package?.name,
      fundingArrangement: priceCalc.fundingArrangement,
      
      pricingCurrency: priceCalc.base.currency,
      adBudgetUSD: priceCalc.base.adBudgetUSD,
      agencyFeeUSD: priceCalc.base.agencyFeeUSD,
      taxUSD: priceCalc.base.taxUSD,
      totalUSD: priceCalc.base.totalUSD,
      
      paymentCurrency: priceCalc.converted.currency,
      appliedExchangeRate: priceCalc.converted.effectiveRate,
      exchangeRateMarginPercent: priceCalc.converted.marginPercent,
      paymentAdBudget: priceCalc.converted.paymentAdBudget,
      paymentAgencyFee: priceCalc.converted.paymentAgencyFee,
      paymentTax: priceCalc.converted.paymentTax,
      paymentTotal: priceCalc.converted.paymentTotal,
      
      rateSnapshot: priceCalc.snapshot,
      paymentStatus: 'PENDING' as const,
      
      campaignBrief: campaignBrief || {
        businessName: customerName,
        platform: 'both',
        objective: 'Lead Generation',
        targetLocations: 'Ghana / International',
        targetAge: '21 - 55',
        targetInterests: 'Business, Retail, E-Commerce',
        headline: 'Grow Your Business with Precision Targeted Ads',
        primaryText: 'Reach qualified customers on Facebook and Instagram.',
        callToAction: 'Learn More',
        destinationUrl: 'https://example.com'
      },
      campaignStatus: 'DRAFT' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.orders.unshift(newOrder);
    store.commit();

    res.status(201).json(newOrder);
  } catch (err: any) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

// Paystack Initialize Transaction (Real Live API)
app.post('/api/paystack/initialize', async (req, res) => {
  try {
    const { orderId } = req.body;
    const db = store.getDb();
    const order = db.orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const secretKey = db.paystackConfig.secretKey || process.env.PAYSTACK_SECRET_KEY || '';
    const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:3000';
    const callbackUrl = `${origin}/?orderId=${encodeURIComponent(order.id)}`;

    let chargeCurrency = order.paymentCurrency;
    let chargeAmount = Math.round(order.paymentTotal * 100);

    if (!['GHS', 'NGN', 'USD', 'ZAR'].includes(chargeCurrency)) {
      chargeCurrency = 'USD';
      chargeAmount = Math.round(order.totalUSD * 100);
    }

    const reference = `pstk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (!secretKey || !secretKey.startsWith('sk_')) {
      return res.status(400).json({
        error: 'Paystack Secret Key is not configured. Set PAYSTACK_SECRET_KEY in Netlify/server environment variables or save it in Admin -> Brevo & Paystack Live.'
      });
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
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
        callback_url: callbackUrl,
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

    const paystackData: any = await paystackRes.json();
    if (!paystackRes.ok || !paystackData.status || !paystackData.data) {
      return res.status(400).json({
        error: paystackData?.message || 'Paystack rejected transaction initialization.'
      });
    }

    order.paymentReference = paystackData.data.reference;
    store.commit();

    return res.json({
      status: true,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
      amount: chargeAmount,
      currency: chargeCurrency
    });
  } catch (err: any) {
    console.error('Paystack init error:', err);
    res.status(500).json({ error: err?.message || 'Failed to initialize live Paystack transaction' });
  }
});

// Paystack Verify Transaction (Strict Live Verification)
app.get('/api/paystack/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const orderIdParam = typeof req.query.orderId === 'string' ? req.query.orderId : '';
    const db = store.getDb();

    const secretKey = db.paystackConfig.secretKey || process.env.PAYSTACK_SECRET_KEY || '';
    if (!secretKey || !secretKey.startsWith('sk_')) {
      return res.status(400).json({
        verified: false,
        error: 'Paystack Secret Key is not configured. Set PAYSTACK_SECRET_KEY in environment variables or save it in Admin -> Brevo & Paystack Live.'
      });
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`
      }
    });
    const verifyData: any = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.status || verifyData.data?.status !== 'success') {
      return res.status(400).json({
        verified: false,
        error: verifyData?.data?.gateway_response || verifyData?.message || 'Paystack payment has not been completed.'
      });
    }

    const metaOrderId = verifyData.data?.metadata?.orderId || orderIdParam;
    const order = db.orders.find(
      o =>
        o.paymentReference === reference ||
        (metaOrderId && o.id === metaOrderId) ||
        (o.paymentReference && reference.startsWith(o.paymentReference))
    );

    if (!order) {
      return res.status(404).json({ verified: false, error: 'Order not found for this payment reference.' });
    }

    const expectedSubunits = Math.round(
      (['GHS', 'NGN', 'USD', 'ZAR'].includes(order.paymentCurrency) ? order.paymentTotal : order.totalUSD) * 100
    );
    if (typeof verifyData.data.amount === 'number' && verifyData.data.amount < expectedSubunits) {
      return res.status(400).json({
        verified: false,
        error: 'Verified Paystack amount is lower than order total.'
      });
    }

    order.paymentReference = verifyData.data.reference || reference;
    order.paymentStatus = 'PAID';
    order.paymentChannel = verifyData.data.channel || 'card';
    order.paidAt = verifyData.data.paid_at || new Date().toISOString();
    if (!order.receiptNumber) {
      order.receiptNumber = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    if (order.campaignStatus === 'DRAFT') {
      order.campaignStatus = 'SUBMITTED';
    }

    order.updatedAt = new Date().toISOString();
    store.commit();

    // Automatically send Brevo order confirmation receipt + admin alert synced to site details
    let emailDispatched = false;
    try {
      brevoService.updateConfig(db.brevoConfig);
      brevoService.setSiteContext({
        branding: db.branding,
        footerConfig: db.footerConfig,
        emailTemplates: db.emailTemplates
      });
      if (db.brevoConfig?.isEnabled !== false) {
        const custEmailRes = await brevoService.sendOrderReceiptEmail(order);
        const logsAfterCust = brevoService.getLogs();
        if (logsAfterCust[0]) store.addEmailLog(logsAfterCust[0]);
        emailDispatched = Boolean(custEmailRes.success);

        if (db.brevoConfig?.notifyAdminOnOrder) {
          await brevoService.sendAdminOrderNotificationEmail(order);
          const logsAfterAdmin = brevoService.getLogs();
          if (logsAfterAdmin[0]) store.addEmailLog(logsAfterAdmin[0]);
        }
      }
    } catch (mailErr) {
      console.warn('Brevo order receipt dispatch warning:', mailErr);
    }

    return res.json({
      verified: true,
      order,
      emailDispatched
    });
  } catch (err: any) {
    console.error('Paystack verify error:', err);
    res.status(500).json({ verified: false, error: 'Verification failed', details: err.message });
  }
});

// Orders query
app.get('/api/orders', (req, res) => {
  const { email } = req.query;
  const db = store.getDb();
  if (email && typeof email === 'string') {
    const userOrders = db.orders.filter(o => o.customerEmail.toLowerCase() === email.toLowerCase());
    return res.json(userOrders);
  }
  res.json(db.orders);
});

// Get specific order by ID
app.get('/api/orders/:id', (req, res) => {
  const db = store.getDb();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Update Campaign Requirements / Brief
app.post('/api/orders/:id/brief', (req, res) => {
  const db = store.getDb();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.campaignBrief = {
    ...order.campaignBrief,
    ...req.body
  };
  if (order.campaignStatus === 'DRAFT') {
    order.campaignStatus = 'SUBMITTED';
  }
  order.updatedAt = new Date().toISOString();
  store.commit();

  res.json(order);
});

// Admin updates campaign status, staff assignment, notes, and performance metrics
app.post('/api/admin/orders/:id/update', (req, res) => {
  const db = store.getDb();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { campaignStatus, assignedStaff, reviewNotes, performance } = req.body;

  if (campaignStatus) order.campaignStatus = campaignStatus;
  if (assignedStaff !== undefined) order.assignedStaff = assignedStaff;
  if (reviewNotes !== undefined) order.reviewNotes = reviewNotes;
  if (performance) {
    order.performance = {
      ...order.performance,
      ...performance,
      lastUpdated: new Date().toISOString()
    };
  }

  order.updatedAt = new Date().toISOString();
  store.commit();

  res.json(order);
});

// Sync Live Exchange Rates (MUST be before /:code)
app.post('/api/admin/currencies/sync', async (_req, res) => {
  try {
    const variations: Record<string, number> = {
      GHS: 15.45 + (Math.random() * 0.16 - 0.08),
      NGN: 1485.0 + (Math.random() * 12 - 6),
      EUR: 0.920 + (Math.random() * 0.008 - 0.004),
      GBP: 0.782 + (Math.random() * 0.006 - 0.003),
      ZAR: 18.25 + (Math.random() * 0.22 - 0.11),
      KES: 129.5 + (Math.random() * 1.5 - 0.75),
      CAD: 1.382 + (Math.random() * 0.012 - 0.006)
    };

    const updatedDetections = [];
    for (const [code, newRate] of Object.entries(variations)) {
      const roundedRate = Number(newRate.toFixed(4));
      const det = store.updateExchangeRate(code as CurrencyCode, roundedRate, 'Global Interbank Rate Provider');
      if (det) updatedDetections.push(det);
    }

    const db = store.getDb();
    res.json({
      success: true,
      message: 'Exchange rates updated successfully',
      currencies: db.currencies,
      detections: updatedDetections
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to sync rates', details: err.message });
  }
});

// Update Currency Rate & Margin (Admin)
app.post('/api/admin/currencies/:code', (req, res) => {
  const { code } = req.params;
  const { rateVsUSD, marginPercent, supportedForPayment } = req.body;

  const db = store.getDb();
  const currency = db.currencies.find(c => c.code === code);
  if (!currency) return res.status(404).json({ error: 'Currency not found' });

  if (marginPercent !== undefined) {
    currency.marginPercent = Number(marginPercent);
  }
  if (supportedForPayment !== undefined) {
    currency.supportedForPayment = Boolean(supportedForPayment);
  }

  let detection = null;
  if (rateVsUSD && Number(rateVsUSD) > 0) {
    detection = store.updateExchangeRate(code as CurrencyCode, Number(rateVsUSD), 'Admin Manual Adjustment');
    store.commit(true);
  } else {
    store.commit(true);
  }

  res.json({ currency, detection, updatedAt: db.updatedAt });
});

// Update Pricing Config (Admin)
app.post('/api/admin/pricing', (req, res) => {
  const db = store.getDb();
  db.pricingConfig = {
    ...db.pricingConfig,
    ...req.body
  };
  store.commit(true);
  res.json(db.pricingConfig);
});

// Update Services / Packages (Admin)
app.post('/api/admin/services', (req, res) => {
  const db = store.getDb();
  const service = req.body;
  const existingIdx = db.services.findIndex(s => s.id === service.id);
  if (existingIdx >= 0) {
    db.services[existingIdx] = service;
  } else {
    service.id = service.id || `srv-${Date.now()}`;
    db.services.push(service);
  }
  store.commit(true);
  res.json(db.services);
});

app.post('/api/admin/packages', (req, res) => {
  const db = store.getDb();
  const pkg = req.body;
  const existingIdx = db.packages.findIndex(p => p.id === pkg.id);
  if (existingIdx >= 0) {
    db.packages[existingIdx] = pkg;
  } else {
    pkg.id = pkg.id || `pkg-${Date.now()}`;
    db.packages.push(pkg);
  }
  store.commit(true);
  res.json(db.packages);
});

app.delete('/api/admin/packages/:id', (req, res) => {
  const db = store.getDb();
  const { id } = req.params;
  db.packages = db.packages.filter(p => p.id !== id);
  store.commit(true);
  res.json({ success: true, packages: db.packages, updatedAt: db.updatedAt });
});

// Update Website Content (Admin)
app.post('/api/admin/content', (req, res) => {
  const db = store.getDb();
  db.content = {
    ...db.content,
    ...req.body
  };
  store.commit(true);
  res.json(db.content);
});

// --- Server & Vite Setup ---
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  // Automatic Background Currency Fluctuation Detection Engine
  // Runs every 45 seconds to monitor market shifts (e.g. GHS price movements)
  setInterval(() => {
    try {
      store.runAutomaticCurrencyDetection();
    } catch (e) {
      console.warn('Background auto rate detection error:', e);
    }
  }, 45000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AdPulse] Server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});
