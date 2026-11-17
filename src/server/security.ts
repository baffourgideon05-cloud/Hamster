import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AdvertisingPackage, FooterConfig, SiteBranding, WebsiteContent } from '../types/index.ts';

// --- Cryptographic Password Hashing (Salted scrypt + legacy SHA-256 verification) ---

const LEGACY_SALT = 'adpulse_secure_salt_2026';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function isLegacySha256Hash(storedHash?: string): boolean {
  return Boolean(storedHash && !storedHash.startsWith('scrypt$'));
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash || !password) return false;

  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    try {
      const derivedBuf = crypto.scryptSync(password, salt, 64);
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      if (derivedBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(derivedBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  // Backwards-compatible timing-safe comparison for legacy salted SHA-256 hashes
  try {
    const candidateHex = crypto.createHash('sha256').update(password + LEGACY_SALT).digest('hex');
    const a = Buffer.from(candidateHex, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// --- Signed Stateless HMAC-SHA256 Session & Order Tokens ---

let cachedSigningSecret: string | null = null;

function getSigningSecret(): string {
  if (cachedSigningSecret) return cachedSigningSecret;
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    cachedSigningSecret = process.env.SESSION_SECRET;
    return cachedSigningSecret;
  }
  // Derive consistent cross-runtime HMAC key from configured runtime env or firebase project metadata
  const seedMaterial = [
    process.env.PAYSTACK_SECRET_KEY || '',
    process.env.BREVO_API_KEY || '',
    process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b',
    getFirebaseApiKey() || 'gen-lang-client-0771849722',
    'adpulse-hmac-v2-domain-guard'
  ].join('|');
  cachedSigningSecret = crypto.createHash('sha256').update(seedMaterial).digest('hex');
  return cachedSigningSecret;
}

export interface SessionPayload {
  uid: string;
  email: string;
  role: 'admin' | 'customer' | 'staff';
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  return Buffer.from(padded, 'base64').toString('utf-8');
}

export function createSessionToken(
  user: { id: string; email: string; role: 'admin' | 'customer' | 'staff' },
  ttlSeconds = 60 * 60 * 12
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: user.id,
    email: user.email.toLowerCase(),
    role: user.role,
    iat: now,
    exp: now + ttlSeconds
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payloadB64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, providedSig] = parts;
  if (!payloadB64 || !providedSig) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', getSigningSecret())
      .update(payloadB64)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const a = Buffer.from(providedSig, 'utf-8');
    const b = Buffer.from(expectedSig, 'utf-8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const decoded = JSON.parse(base64UrlDecode(payloadB64)) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.email || !decoded.role || !decoded.exp || decoded.exp < now) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader?: string | null): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function createOrderAccessToken(orderId: string, customerEmail: string, ttlSeconds = 60 * 60 * 2): string {
  const now = Math.floor(Date.now() / 1000);
  const payloadB64 = base64UrlEncode(
    JSON.stringify({ orderId, email: customerEmail.toLowerCase(), exp: now + ttlSeconds })
  );
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(`ord:${payloadB64}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${payloadB64}.${sig}`;
}

export function verifyOrderAccessToken(token: string | null | undefined, orderId: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, providedSig] = parts;
  try {
    const expectedSig = crypto
      .createHmac('sha256', getSigningSecret())
      .update(`ord:${payloadB64}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const a = Buffer.from(providedSig, 'utf-8');
    const b = Buffer.from(expectedSig, 'utf-8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const decoded = JSON.parse(base64UrlDecode(payloadB64)) as { orderId: string; exp: number };
    const now = Math.floor(Date.now() / 1000);
    return decoded.orderId === orderId && decoded.exp >= now;
  } catch {
    return false;
  }
}

// --- Firebase ID Token Verification (Blocks forged /api/auth/google requests) ---

let cachedFirebaseApiKey: string | null = null;

function getFirebaseApiKey(): string {
  if (cachedFirebaseApiKey !== null) return cachedFirebaseApiKey;
  if (process.env.FIREBASE_WEB_API_KEY) {
    cachedFirebaseApiKey = process.env.FIREBASE_WEB_API_KEY;
    return cachedFirebaseApiKey;
  }
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (parsed?.apiKey) {
        cachedFirebaseApiKey = String(parsed.apiKey);
        return cachedFirebaseApiKey;
      }
    }
  } catch {}
  cachedFirebaseApiKey = '';
  return cachedFirebaseApiKey;
}

export async function verifyFirebaseIdToken(idToken?: string | null): Promise<{
  valid: boolean;
  email?: string;
  emailVerified?: boolean;
  uid?: string;
  name?: string;
  picture?: string;
  error?: string;
}> {
  if (!idToken || typeof idToken !== 'string' || idToken.length < 20) {
    return { valid: false, error: 'Missing Firebase Google authentication token.' };
  }
  const apiKey = getFirebaseApiKey();
  if (!apiKey) {
    return { valid: false, error: 'Firebase Web API Key unavailable for token verification.' };
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    const data: any = await res.json().catch(() => ({}));
    const user = data?.users?.[0];
    if (!res.ok || !user || !user.email) {
      return { valid: false, error: data?.error?.message || 'Invalid or expired Google session token.' };
    }
    if (user.emailVerified === false) {
      return { valid: false, error: 'Google account email must be verified.' };
    }
    return {
      valid: true,
      email: String(user.email).toLowerCase(),
      emailVerified: Boolean(user.emailVerified),
      uid: user.localId,
      name: user.displayName,
      picture: user.photoUrl
    };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Token verification network failure.' };
  }
}

// --- Sliding-Window Rate Limiter ---

const rateBuckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests = 15,
  windowMs = 5 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (rateBuckets.get(key) || []).filter((t) => t > cutoff);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] || now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateBuckets.set(key, timestamps);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  timestamps.push(now);
  rateBuckets.set(key, timestamps);

  // Periodic cleanup to bound memory
  if (rateBuckets.size > 2000) {
    for (const [k, list] of rateBuckets.entries()) {
      if (list.every((t) => t <= cutoff)) rateBuckets.delete(k);
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - timestamps.length),
    retryAfterSeconds: 0
  };
}

// --- Input Sanitization & Host / Origin Resolution (Any Domain or Subdomain) ---

export function sanitizePlainText(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLength);
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length >= 3 && trimmed.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

const SAFE_HOST_REGEX = /^[a-zA-Z0-9.-]+(:[0-9]{1,5})?$/;

export function getRequestOrigin(
  headers: {
    get?(name: string): string | null;
    [key: string]: any;
  },
  fallbackOrigin = 'http://localhost:3000'
): string {
  const readHeader = (name: string): string => {
    if (typeof headers.get === 'function') {
      return (headers.get(name) || '').trim();
    }
    const direct = headers[name] || headers[name.toLowerCase()];
    if (Array.isArray(direct)) return String(direct[0] || '').trim();
    return typeof direct === 'string' ? direct.trim() : '';
  };

  const forwardedHost = readHeader('x-forwarded-host').split(',')[0]?.trim();
  const host = readHeader('host').split(',')[0]?.trim();
  const candidateHost = forwardedHost || host;

  if (candidateHost && SAFE_HOST_REGEX.test(candidateHost)) {
    const forwardedProto = readHeader('x-forwarded-proto').split(',')[0]?.trim().toLowerCase();
    const isLocalHost =
      candidateHost.startsWith('localhost') ||
      candidateHost.startsWith('127.0.0.1') ||
      candidateHost.startsWith('0.0.0.0');
    const proto =
      forwardedProto === 'https' || forwardedProto === 'http'
        ? forwardedProto
        : isLocalHost
        ? 'http'
        : 'https';
    return `${proto}://${candidateHost}`;
  }

  const originHeader = readHeader('origin');
  if (originHeader && /^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]{1,5})?$/.test(originHeader)) {
    return originHeader;
  }

  return (process.env.URL || process.env.APP_URL || fallbackOrigin).replace(/\/+$/, '');
}

// --- Security Headers (AI Studio iFrame Safe) ---

export function getSecurityHeaders(isHttps = true): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
    'X-XSS-Protection': '1; mode=block',
    'X-DNS-Prefetch-Control': 'off',
    // Preserve AI Studio iFrame & custom domain embedding cleanly while blocking unauthorized clickjacking
    'Content-Security-Policy': "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com"
  };

  if (isHttps) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  return headers;
}

// --- Dynamic Multi-Domain Robots.txt & Sitemap.xml Builders ---

export function buildRobotsTxt(origin: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /.netlify/',
    '',
    `Sitemap: ${cleanOrigin}/sitemap.xml`
  ].join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(
  origin: string,
  meta?: {
    updatedAt?: string;
    branding?: SiteBranding;
    packages?: AdvertisingPackage[];
    content?: WebsiteContent;
    footerConfig?: FooterConfig;
  }
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const lastmod = (meta?.updatedAt || new Date().toISOString()).slice(0, 10);
  const urls = [
    { loc: `${cleanOrigin}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${cleanOrigin}/#packages`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${cleanOrigin}/#checkout`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${cleanOrigin}/#faq`, priority: '0.7', changefreq: 'monthly' }
  ];

  const entries = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}
