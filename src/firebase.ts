import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  SiteBranding,
  FooterConfig,
  WebsiteContent,
  AdvertisingPackage,
  AdvertisingService,
  Currency,
  PricingConfig,
  AutoRateEngineConfig,
  EmailTemplatesConfig,
  Order,
  UserAccount
} from './types/index.ts';

// Initialize Firebase App & Named Firestore Database
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Google Auth Provider with authorized Gmail Workspace scopes
export const googleProvider = new GoogleAuthProvider();
const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing'
];
for (const scope of GMAIL_SCOPES) {
  googleProvider.addScope(scope);
}
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// STRICT IN-MEMORY ONLY OAuth Access Token (NEVER persisted in localStorage/sessionStorage)
let gmailAccessToken: string | null = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    gmailAccessToken = null;
  }
});

export function getGmailAccessToken(): string | null {
  return gmailAccessToken;
}

export function clearGmailAccessToken() {
  gmailAccessToken = null;
}

export function getFirebaseCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

export type FirestoreOperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';

export interface FirestoreErrorInfo {
  error: string;
  operationType: FirestoreOperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: Array<{
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: FirestoreOperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'site_settings', 'public'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice: Check Firebase configuration or network connectivity.');
    }
    return false;
  }
}

export async function signInWithGooglePopup(): Promise<{
  email: string;
  name: string;
  picture?: string;
  uid: string;
  hasGmailScope: boolean;
}> {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    gmailAccessToken = credential.accessToken;
  }
  const fbUser = result.user;
  if (!fbUser.email) {
    throw new Error('Google sign-in did not return a verified email address.');
  }
  return {
    email: fbUser.email,
    name: fbUser.displayName || fbUser.email.split('@')[0],
    picture: fbUser.photoURL || undefined,
    uid: fbUser.uid,
    hasGmailScope: Boolean(gmailAccessToken)
  };
}

export async function firebaseSignOutAll(): Promise<void> {
  gmailAccessToken = null;
  try {
    await firebaseSignOut(auth);
  } catch {}
}

/**
 * Dispatch an HTML email via the signed-in Admin's Gmail API (https://gmail.googleapis.com/gmail/v1/users/me/messages/send)
 * Requires prior interactive OAuth popup consent and explicit user confirmation before calling.
 */
export async function sendEmailViaGmail(params: {
  toEmail: string;
  subject: string;
  htmlBody: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!gmailAccessToken) {
    throw new Error('Gmail Workspace authorization is not active. Click "Connect Google & Gmail" to grant permission.');
  }

  const fromHeader = params.fromEmail
    ? `${params.fromName || 'AdPulse Global'} <${params.fromEmail}>`
    : undefined;

  const mimeLines = [
    ...(fromHeader ? [`From: ${fromHeader}`] : []),
    `To: ${params.toEmail}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.htmlBody
  ];

  const rawUtf8 = mimeLines.join('\r\n');
  const encodedMessage = btoa(unescape(encodeURIComponent(rawUtf8)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gmailAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  });

  if (res.status === 401) {
    gmailAccessToken = null;
    throw new Error('Gmail access session expired. Please reconnect your Google account.');
  }

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gmail API error (HTTP ${res.status})`);
  }

  return { success: true, id: data.id };
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    if (value instanceof Timestamp) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

export function timestampToMillis(val: unknown): number {
  if (!val) return 0;
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'object' && val !== null && 'seconds' in val && typeof (val as any).seconds === 'number') {
    return (val as any).seconds * 1000 + Math.floor(((val as any).nanoseconds || 0) / 1e6);
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const ms = new Date(val).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

export function timestampToIso(val: unknown, fallback = new Date().toISOString()): string {
  const ms = timestampToMillis(val);
  return ms > 0 ? new Date(ms).toISOString() : fallback;
}

export interface FirestoreSiteSettings {
  branding: SiteBranding;
  footerConfig: FooterConfig;
  content: WebsiteContent;
  packages: AdvertisingPackage[];
  services?: AdvertisingService[];
  currencies?: Currency[];
  pricingConfig?: PricingConfig;
  autoRateEngine?: AutoRateEngineConfig;
  emailTemplates?: EmailTemplatesConfig;
  updatedAt?: unknown;
  updatedAtMillis?: number;
}

export async function loadSiteSettingsFromFirestore(): Promise<FirestoreSiteSettings | null> {
  try {
    const snap = await getDoc(doc(db, 'site_settings', 'public'));
    if (!snap.exists()) return null;
    const data = snap.data() as FirestoreSiteSettings;
    return {
      ...data,
      updatedAtMillis: timestampToMillis(data.updatedAt)
    };
  } catch (err) {
    console.warn('Firestore site_settings/public load warning:', err);
    return null;
  }
}

export function subscribeSiteSettings(
  onData: (settings: FirestoreSiteSettings) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'site_settings/public';
  return onSnapshot(
    doc(db, 'site_settings', 'public'),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as FirestoreSiteSettings;
      onData({
        ...data,
        updatedAtMillis: timestampToMillis(data.updatedAt)
      });
    },
    (error) => {
      if (onError) onError(error);
      try {
        handleFirestoreError(error, 'get', path);
      } catch {}
    }
  );
}

/**
 * Persists public site settings (branding, footer, content, packages, email templates)
 * to Cloud Firestore so edits survive reloads and Netlify deploys.
 * Strictly excludes secrets (Paystack secretKey, Brevo apiKey, passwordHashes).
 */
export async function saveSiteSettingsToFirestore(
  settings: Omit<FirestoreSiteSettings, 'updatedAt' | 'updatedAtMillis'>
): Promise<{ synced: boolean; reason?: string }> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) {
    return { synced: false, reason: 'Firebase Google session not connected' };
  }

  // Strictly sanitize payload against firestore.rules bounds & strip all undefined fields
  const cleanPayload = stripUndefined({
    branding: {
      siteTitle: String(settings.branding.siteTitle || 'AdPulse Global').slice(0, 200),
      siteShortName: String(settings.branding.siteShortName || 'AdPulse Global').slice(0, 100),
      logoUrl: String(settings.branding.logoUrl || '').slice(0, 250000),
      logoBadgeText: String(settings.branding.logoBadgeText || 'AP').slice(0, 10),
      adminGoogleEmail: String(settings.branding.adminGoogleEmail || 'baffourgideon05@gmail.com').slice(0, 254)
    },
    footerConfig: {
      phone: String(settings.footerConfig.phone || '').slice(0, 60),
      email: String(settings.footerConfig.email || '').slice(0, 254),
      address: String(settings.footerConfig.address || '').slice(0, 300),
      businessHours: String(settings.footerConfig.businessHours || '').slice(0, 160),
      whatsappNumber: String(settings.footerConfig.whatsappNumber || '').slice(0, 60),
      aboutText: String(settings.footerConfig.aboutText || '').slice(0, 1200),
      copyrightNotice: String(settings.footerConfig.copyrightNotice || '').slice(0, 300),
      ...(settings.footerConfig.facebookUrl ? { facebookUrl: String(settings.footerConfig.facebookUrl).slice(0, 300) } : {}),
      ...(settings.footerConfig.instagramUrl ? { instagramUrl: String(settings.footerConfig.instagramUrl).slice(0, 300) } : {}),
      ...(settings.footerConfig.linkedinUrl ? { linkedinUrl: String(settings.footerConfig.linkedinUrl).slice(0, 300) } : {})
    },
    content: {
      ...settings.content,
      headline: String(settings.content.headline || 'FACEBOOK ADS - DONE FOR YOU').slice(0, 300),
      subheadline: String(settings.content.subheadline || '').slice(0, 1000)
    },
    packages: Array.isArray(settings.packages) ? settings.packages.slice(0, 25) : [],
    ...(settings.services ? { services: settings.services.slice(0, 25) } : {}),
    ...(settings.currencies ? { currencies: settings.currencies.slice(0, 30) } : {}),
    ...(settings.pricingConfig ? { pricingConfig: settings.pricingConfig } : {}),
    ...(settings.autoRateEngine ? { autoRateEngine: settings.autoRateEngine } : {}),
    ...(settings.emailTemplates ? { emailTemplates: settings.emailTemplates } : {})
  });

  try {
    await setDoc(
      doc(db, 'site_settings', 'public'),
      {
        ...cleanPayload,
        updatedAt: serverTimestamp()
      },
      { merge: false }
    );
    return { synced: true };
  } catch (error) {
    handleFirestoreError(error, 'write', 'site_settings/public');
  }
}

// --- Firestore Orders Persistence (Paired with Server Paystack Settlement) ---

function serializeOrderFromFirestore(raw: any): Order {
  return {
    ...raw,
    createdAt: timestampToIso(raw.createdAt),
    updatedAt: timestampToIso(raw.updatedAt)
  } as Order;
}

export async function saveOrderToFirestore(order: Order): Promise<boolean> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return false;

  const docPath = `orders/${order.id}`;
  const cleanOrder = stripUndefined({
    id: String(order.id).slice(0, 128),
    ownerUid: String((order as any).ownerUid || fbUser.uid).slice(0, 128),
    customerId: String(order.customerId || fbUser.uid).slice(0, 128),
    customerEmail: String(order.customerEmail).toLowerCase().slice(0, 254),
    customerName: String(order.customerName || 'Client').slice(0, 120),
    customerPhone: String(order.customerPhone || '').slice(0, 40),
    serviceId: String(order.serviceId || '').slice(0, 80),
    serviceName: String(order.serviceName || '').slice(0, 160),
    packageId: order.packageId ? String(order.packageId).slice(0, 80) : undefined,
    packageName: order.packageName ? String(order.packageName).slice(0, 160) : undefined,
    fundingArrangement: order.fundingArrangement,
    pricingCurrency: String(order.pricingCurrency || 'USD').slice(0, 10),
    adBudgetUSD: Number(order.adBudgetUSD || 0),
    agencyFeeUSD: Number(order.agencyFeeUSD || 0),
    taxUSD: Number(order.taxUSD || 0),
    totalUSD: Number(order.totalUSD || 0),
    paymentCurrency: String(order.paymentCurrency || 'GHS').slice(0, 10),
    appliedExchangeRate: Number(order.appliedExchangeRate || 1),
    exchangeRateMarginPercent: Number(order.exchangeRateMarginPercent || 0),
    paymentAdBudget: Number(order.paymentAdBudget || 0),
    paymentAgencyFee: Number(order.paymentAgencyFee || 0),
    paymentTax: Number(order.paymentTax || 0),
    paymentTotal: Number(order.paymentTotal || 0),
    rateSnapshot: order.rateSnapshot,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference,
    paymentChannel: order.paymentChannel,
    paidAt: order.paidAt,
    receiptNumber: order.receiptNumber,
    campaignBrief: order.campaignBrief
      ? {
          businessName: String(order.campaignBrief.businessName || '').slice(0, 160),
          websiteUrl: order.campaignBrief.websiteUrl ? String(order.campaignBrief.websiteUrl).slice(0, 400) : undefined,
          platform: order.campaignBrief.platform,
          objective: order.campaignBrief.objective,
          targetLocations: order.campaignBrief.targetLocations,
          targetAge: order.campaignBrief.targetAge,
          targetInterests: order.campaignBrief.targetInterests,
          headline: String(order.campaignBrief.headline || '').slice(0, 240),
          primaryText: String(order.campaignBrief.primaryText || '').slice(0, 1200),
          callToAction: order.campaignBrief.callToAction,
          destinationUrl: String(order.campaignBrief.destinationUrl || '').slice(0, 400),
          facebookPageOrHandle: order.campaignBrief.facebookPageOrHandle,
          specialInstructions: order.campaignBrief.specialInstructions
            ? String(order.campaignBrief.specialInstructions).slice(0, 1000)
            : undefined
        }
      : undefined,
    campaignStatus: order.campaignStatus,
    assignedStaff: order.assignedStaff,
    reviewNotes: order.reviewNotes,
    performance: order.performance
  });

  try {
    const existingSnap = await getDoc(doc(db, 'orders', order.id));
    if (!existingSnap.exists()) {
      await setDoc(doc(db, 'orders', order.id), {
        ...cleanOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      const existingData = existingSnap.data();
      await setDoc(doc(db, 'orders', order.id), {
        ...cleanOrder,
        ownerUid: existingData.ownerUid || cleanOrder.ownerUid,
        createdAt: existingData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, 'write', docPath);
  }
}

export async function updateOrderBriefInFirestore(orderId: string, brief: Record<string, any>): Promise<boolean> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return false;
  const docPath = `orders/${orderId}`;
  try {
    const snap = await getDoc(doc(db, 'orders', orderId));
    if (!snap.exists()) return false;
    await updateDoc(doc(db, 'orders', orderId), {
      campaignBrief: stripUndefined({ ...(snap.data().campaignBrief || {}), ...brief }),
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, 'update', docPath);
  }
}

export async function fetchOrdersFromFirestore(email?: string): Promise<Order[]> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return [];

  const isAdmin = fbUser.email?.toLowerCase() === 'baffourgideon05@gmail.com';
  try {
    const colRef = collection(db, 'orders');
    const q = isAdmin
      ? colRef
      : query(colRef, where('customerEmail', '==', (email || fbUser.email || '').toLowerCase()));
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeOrderFromFirestore(d.data()));
  } catch (error) {
    console.warn('Firestore orders fetch warning:', error);
    return [];
  }
}

export function subscribeOrdersFromFirestore(
  onOrders: (orders: Order[]) => void,
  email?: string
): Unsubscribe {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) {
    return () => {};
  }
  const isAdmin = fbUser.email?.toLowerCase() === 'baffourgideon05@gmail.com';
  const colRef = collection(db, 'orders');
  const q = isAdmin
    ? colRef
    : query(colRef, where('customerEmail', '==', (email || fbUser.email || '').toLowerCase()));

  return onSnapshot(
    q,
    (snap) => {
      onOrders(snap.docs.map((d) => serializeOrderFromFirestore(d.data())));
    },
    (error) => {
      try {
        handleFirestoreError(error, 'list', 'orders');
      } catch {}
    }
  );
}

export async function syncUserProfileToFirestore(user: UserAccount): Promise<boolean> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return false;
  const docPath = `users/${fbUser.uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', fbUser.uid));
    if (!snap.exists()) {
      await setDoc(
        doc(db, 'users', fbUser.uid),
        stripUndefined({
          uid: fbUser.uid,
          email: (fbUser.email || user.email).toLowerCase().slice(0, 254),
          name: String(user.name || fbUser.displayName || 'Client').slice(0, 120),
          phone: String(user.phone || '').slice(0, 40),
          role: 'customer',
          authProvider: 'google',
          avatarUrl: String(user.avatarUrl || fbUser.photoURL || '').slice(0, 500),
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );
    } else {
      await updateDoc(doc(db, 'users', fbUser.uid), {
        name: String(user.name || fbUser.displayName || 'Client').slice(0, 120),
        avatarUrl: String(user.avatarUrl || fbUser.photoURL || '').slice(0, 500),
        updatedAt: serverTimestamp()
      });
    }
    return true;
  } catch (error) {
    console.warn('User Firestore profile sync notice:', error);
    return false;
  }
}

export async function fetchUsersFromFirestore(): Promise<UserAccount[]> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified || fbUser.email?.toLowerCase() !== 'baffourgideon05@gmail.com') {
    return [];
  }
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.uid || d.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role || 'customer',
        authProvider: data.authProvider || 'google',
        avatarUrl: data.avatarUrl,
        status: data.status || 'active',
        createdAt: timestampToIso(data.createdAt)
      } as UserAccount;
    });
  } catch (error) {
    console.warn('Firestore users fetch notice:', error);
    return [];
  }
}
