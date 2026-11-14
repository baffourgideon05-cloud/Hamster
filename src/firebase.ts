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
  getDocFromServer,
  setDoc,
  serverTimestamp
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
  EmailTemplatesConfig
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
}

export async function loadSiteSettingsFromFirestore(): Promise<FirestoreSiteSettings | null> {
  try {
    const snap = await getDoc(doc(db, 'site_settings', 'public'));
    if (!snap.exists()) return null;
    return snap.data() as FirestoreSiteSettings;
  } catch (err) {
    console.warn('Firestore site_settings/public load warning:', err);
    return null;
  }
}

/**
 * Persists public site settings (branding, footer, content, packages, email templates)
 * to Cloud Firestore so edits survive reloads and Netlify deploys.
 * Strictly excludes secrets (Paystack secretKey, Brevo apiKey, passwordHashes).
 */
export async function saveSiteSettingsToFirestore(
  settings: Omit<FirestoreSiteSettings, 'updatedAt'>
): Promise<boolean> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) {
    return false;
  }

  // Strictly sanitize payload against firestore.rules bounds & field whitelist
  const cleanPayload = {
    branding: {
      siteTitle: String(settings.branding.siteTitle || 'AdPulse Global').slice(0, 200),
      siteShortName: String(settings.branding.siteShortName || 'AdPulse Global').slice(0, 100),
      logoUrl: String(settings.branding.logoUrl || '').slice(0, 1000),
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
    ...(settings.emailTemplates ? { emailTemplates: settings.emailTemplates } : {}),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'site_settings', 'public'), cleanPayload, { merge: false });
    return true;
  } catch (error) {
    handleFirestoreError(error, 'write', 'site_settings/public');
  }
}
