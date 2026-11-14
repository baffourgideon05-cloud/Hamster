import React, { useState, useEffect } from 'react';
import {
  Currency,
  CurrencyCode,
  PricingConfig,
  AdvertisingService,
  AdvertisingPackage,
  Order,
  WebsiteContent,
  RateChangeDetection,
  SiteBranding,
  FooterConfig,
  AutoRateEngineConfig,
  UserAccount,
  PasswordResetRequest,
  EmailLog,
  EmailTemplatesConfig,
  EmailTemplateItem
} from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  DEFAULT_EMAIL_TEMPLATES,
  renderCustomEmailHtml
} from '../server/emailTemplates.ts';
import {
  getFirebaseCurrentUser,
  getGmailAccessToken,
  sendEmailViaGmail,
  signInWithGooglePopup,
  testFirestoreConnection
} from '../firebase.ts';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Sliders,
  Layers,
  Globe,
  CheckCircle2,
  Save,
  KeyRound,
  Zap,
  Phone,
  Mail,
  ExternalLink,
  Edit3,
  CreditCard,
  Send,
  AlertCircle,
  Package,
  FileText,
  Plus,
  Trash2,
  Database,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface AdminDashboardProps {
  currencies: Currency[];
  pricingConfig: PricingConfig;
  services: AdvertisingService[];
  packages: AdvertisingPackage[];
  orders: Order[];
  content: WebsiteContent;
  rateHistory: RateChangeDetection[];
  branding: SiteBranding;
  footerConfig: FooterConfig;
  autoRateEngine: AutoRateEngineConfig;
  emailTemplates?: EmailTemplatesConfig;
  onRefreshAll: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currencies,
  pricingConfig,
  services,
  packages,
  orders,
  content,
  rateHistory,
  branding,
  footerConfig,
  autoRateEngine,
  emailTemplates,
  onRefreshAll
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'integrations' | 'emails' | 'currencies' | 'autorate' | 'pricing' | 'branding' | 'footer' | 'accounts'>('orders');

  // Unified inline notification banner (zero window.alert popups)
  const [adminNotice, setAdminNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showAdminNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setAdminNotice({ type, message });
    setTimeout(() => setAdminNotice(null), 6500);
  };

  // Cloud Firestore & Gmail Workspace Connection Status
  const [firestoreOnline, setFirestoreOnline] = useState<boolean | null>(null);
  const [firebaseUserEmail, setFirebaseUserEmail] = useState<string | null>(
    () => getFirebaseCurrentUser()?.email || null
  );
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Selected Order for Review / Update
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderStatus, setOrderStatus] = useState('');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [metaCampaignId, setMetaCampaignId] = useState('');
  const [impressions, setImpressions] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [conversions, setConversions] = useState(0);
  const [spendUSD, setSpendUSD] = useState(0);
  const [roas, setRoas] = useState(0);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Currency Editing State
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [editMargin, setEditMargin] = useState<number>(0);
  const [editPaystackSupport, setEditPaystackSupport] = useState<boolean>(true);
  const [isSyncingRates, setIsSyncingRates] = useState(false);

  // Pricing & Package Editor State
  const [pricingForm, setPricingForm] = useState<PricingConfig>(pricingConfig);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [editablePackages, setEditablePackages] = useState<AdvertisingPackage[]>(packages);
  const [savingPackageId, setSavingPackageId] = useState<string | null>(null);
  const [confirmDeletePkgId, setConfirmDeletePkgId] = useState<string | null>(null);

  // Branding & Full Website Content Form State
  const [brandingForm, setBrandingForm] = useState<SiteBranding>(branding);
  const [contentForm, setContentForm] = useState<WebsiteContent>(content);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Email Templates Editor State
  const [templatesForm, setTemplatesForm] = useState<EmailTemplatesConfig>(
    emailTemplates || DEFAULT_EMAIL_TEMPLATES
  );
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<'orderReceipt' | 'adminOrderAlert' | 'passwordReset'>('orderReceipt');
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [previewRecipientEmail, setPreviewRecipientEmail] = useState(
    branding.adminGoogleEmail || 'baffourgideon05@gmail.com'
  );
  const [gmailConfirmOpen, setGmailConfirmOpen] = useState(false);
  const [isSendingGmail, setIsSendingGmail] = useState(false);

  // Footer Form State
  const [footerForm, setFooterForm] = useState<FooterConfig>(footerConfig);
  const [isSavingFooter, setIsSavingFooter] = useState(false);

  // Auto Rate Engine State
  const [autoRateForm, setAutoRateForm] = useState<Partial<AutoRateEngineConfig>>(autoRateEngine);
  const [isTriggeringAutoRate, setIsTriggeringAutoRate] = useState(false);

  // Accounts & Password Reset State
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [directResetEmail, setDirectResetEmail] = useState('');
  const [directNewPassword, setDirectNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Brevo & Paystack Live Integrations State
  const [paystackPublicKeyInput, setPaystackPublicKeyInput] = useState('pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b');
  const [paystackSecretKeyInput, setPaystackSecretKeyInput] = useState('');
  const [paystackSecretMasked, setPaystackSecretMasked] = useState('');
  const [paystackHasSecretKey, setPaystackHasSecretKey] = useState(false);
  const [paystackIsLive, setPaystackIsLive] = useState(true);
  const [isSavingPaystack, setIsSavingPaystack] = useState(false);

  const [brevoApiKeyInput, setBrevoApiKeyInput] = useState('');
  const [brevoApiKeyMasked, setBrevoApiKeyMasked] = useState('');
  const [brevoHasApiKey, setBrevoHasApiKey] = useState(false);
  const [brevoSenderEmail, setBrevoSenderEmail] = useState('baffourgideon05@gmail.com');
  const [brevoSenderName, setBrevoSenderName] = useState('AdPulse Global');
  const [brevoEnabled, setBrevoEnabled] = useState(true);
  const [brevoNotifyAdmin, setBrevoNotifyAdmin] = useState(true);
  const [brevoAdminEmail, setBrevoAdminEmail] = useState('baffourgideon05@gmail.com');
  const [isSavingBrevo, setIsSavingBrevo] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState('baffourgideon05@gmail.com');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [integrationFeedback, setIntegrationFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  useEffect(() => {
    setBrandingForm(branding);
  }, [branding]);

  useEffect(() => {
    setContentForm(content);
  }, [content]);

  useEffect(() => {
    setEditablePackages(packages);
  }, [packages]);

  useEffect(() => {
    setFooterForm(footerConfig);
  }, [footerConfig]);

  useEffect(() => {
    if (emailTemplates) {
      setTemplatesForm(emailTemplates);
    }
  }, [emailTemplates]);

  useEffect(() => {
    testFirestoreConnection().then(setFirestoreOnline).catch(() => setFirestoreOnline(false));
    setFirebaseUserEmail(getFirebaseCurrentUser()?.email || null);
  }, []);

  const loadAccountsAndResets = async () => {
    try {
      const [u, r] = await Promise.all([
        api.adminGetUsers(),
        api.adminGetResetRequests()
      ]);
      setUsersList(u);
      setResetRequests(r);
    } catch (e) {
      console.warn('Could not fetch users/resets', e);
    }
  };

  const loadIntegrations = async () => {
    try {
      const data = await api.adminGetIntegrations();
      if (data.paystackConfig) {
        setPaystackPublicKeyInput(data.paystackConfig.publicKey || 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b');
        setPaystackSecretMasked(data.paystackConfig.secretKeyMasked || '');
        setPaystackHasSecretKey(Boolean(data.paystackConfig.hasSecretKey || data.paystackConfig.secretKeyMasked));
        setPaystackIsLive(Boolean(data.paystackConfig.isLive));
      }
      if (data.brevoConfig) {
        setBrevoApiKeyMasked(data.brevoConfig.apiKey || '');
        setBrevoHasApiKey(Boolean(data.brevoConfig.hasApiKey));
        setBrevoSenderEmail(data.brevoConfig.senderEmail || 'baffourgideon05@gmail.com');
        setBrevoSenderName(data.brevoConfig.senderName || 'AdPulse Global');
        setBrevoEnabled(data.brevoConfig.isEnabled !== false);
        setBrevoNotifyAdmin(data.brevoConfig.notifyAdminOnOrder !== false);
        setBrevoAdminEmail(data.brevoConfig.adminNotifyEmail || 'baffourgideon05@gmail.com');
        setTestEmailTarget(data.brevoConfig.adminNotifyEmail || 'baffourgideon05@gmail.com');
      }
      if (Array.isArray(data.emailLogs)) {
        setEmailLogs(data.emailLogs);
      }
    } catch (e) {
      console.warn('Could not load integrations config', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'accounts') {
      loadAccountsAndResets();
    } else if (activeTab === 'integrations') {
      loadIntegrations();
    }
  }, [activeTab]);

  const openOrderManager = (order: Order) => {
    setEditingOrder(order);
    setOrderStatus(order.campaignStatus);
    setAssignedStaff(order.assignedStaff || 'Sarah Osei');
    setReviewNotes(order.reviewNotes || '');
    setMetaCampaignId(order.performance?.metaCampaignId || '');
    setImpressions(order.performance?.impressions || 0);
    setClicks(order.performance?.clicks || 0);
    setConversions(order.performance?.conversions || 0);
    setSpendUSD(order.performance?.spendUSD || 0);
    setRoas(order.performance?.roas || 0);
  };

  const handleSaveOrderUpdate = async () => {
    if (!editingOrder) return;
    setIsUpdatingOrder(true);
    try {
      const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
      await api.adminUpdateOrder(editingOrder.id, {
        campaignStatus: orderStatus,
        assignedStaff,
        reviewNotes,
        performance: {
          impressions,
          clicks,
          ctr,
          conversions,
          spendUSD,
          roas,
          metaCampaignId
        }
      });
      setIsUpdatingOrder(false);
      setEditingOrder(null);
      onRefreshAll();
      showAdminNotice(`Order ${editingOrder.id} updated.`);
    } catch (e: any) {
      showAdminNotice(e?.message || 'Failed to update order.', 'error');
      setIsUpdatingOrder(false);
    }
  };

  const handleSyncCurrencies = async () => {
    setIsSyncingRates(true);
    try {
      await api.adminSyncCurrencies();
      onRefreshAll();
      showAdminNotice('Live interbank currency rates synced.');
    } catch {
      showAdminNotice('Failed to sync rates.', 'error');
    } finally {
      setIsSyncingRates(false);
    }
  };

  const handleTriggerAutoRate = async () => {
    setIsTriggeringAutoRate(true);
    try {
      const res = await api.adminTriggerAutoRate();
      onRefreshAll();
      showAdminNotice(`Auto-detection completed! Found ${res.results?.detectedChanges?.length || 0} currency shifts.`);
    } catch {
      showAdminNotice('Auto-detection scan failed.', 'error');
    } finally {
      setIsTriggeringAutoRate(false);
    }
  };

  const handleSaveAutoRateConfig = async () => {
    try {
      await api.adminUpdateAutoRateConfig(autoRateForm);
      onRefreshAll();
      showAdminNotice('Auto-rate fluctuation engine configuration updated.');
    } catch {
      showAdminNotice('Failed to update auto rate config.', 'error');
    }
  };

  const handleConnectAdminGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const fbUser = await signInWithGooglePopup();
      setFirebaseUserEmail(fbUser.email);
      showAdminNotice(`Connected Google Workspace (${fbUser.email}). Cloud Firestore write sync and Gmail API are now active!`);
    } catch (err: any) {
      showAdminNotice(err?.message || 'Google connection cancelled or blocked.', 'error');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      await Promise.all([
        api.adminUpdateBranding(brandingForm),
        api.adminUpdateContent(contentForm)
      ]);
      if (brandingForm.siteTitle) {
        document.title = brandingForm.siteTitle;
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', brandingForm.siteTitle);
      }
      if (contentForm.metaDescription) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', contentForm.metaDescription);
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', contentForm.metaDescription);
      }
      onRefreshAll();
      showAdminNotice('Website titles, SEO meta, hero sections, FAQs, and branding saved permanently!');
    } catch (err: any) {
      showAdminNotice(err?.message || 'Failed to update branding and website content.', 'error');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleSavePaystack = async () => {
    setIsSavingPaystack(true);
    setIntegrationFeedback(null);
    try {
      const payload: any = {
        publicKey: paystackPublicKeyInput.trim(),
        isLive: paystackIsLive
      };
      if (paystackSecretKeyInput.trim()) {
        payload.secretKey = paystackSecretKeyInput.trim();
      }
      const res = await api.adminUpdatePaystack(payload);
      if (res.success) {
        setPaystackSecretKeyInput('');
        await loadIntegrations();
        onRefreshAll();
        setIntegrationFeedback({ type: 'success', message: 'Live Paystack credentials saved and active.' });
      } else {
        setIntegrationFeedback({ type: 'error', message: res.error || 'Failed to update Paystack config.' });
      }
    } catch (err: any) {
      setIntegrationFeedback({ type: 'error', message: err.message || 'Paystack update error.' });
    } finally {
      setIsSavingPaystack(false);
    }
  };

  const handleSaveBrevo = async () => {
    setIsSavingBrevo(true);
    setIntegrationFeedback(null);
    try {
      const payload: any = {
        senderEmail: brevoSenderEmail.trim(),
        senderName: brevoSenderName.trim(),
        isEnabled: brevoEnabled,
        notifyAdminOnOrder: brevoNotifyAdmin,
        adminNotifyEmail: brevoAdminEmail.trim()
      };
      if (brevoApiKeyInput.trim()) {
        payload.apiKey = brevoApiKeyInput.trim();
      }
      const res = await api.adminUpdateBrevo(payload);
      if (res.success) {
        setBrevoApiKeyInput('');
        await loadIntegrations();
        onRefreshAll();
        setIntegrationFeedback({
          type: 'success',
          message: res.hasApiKey
            ? 'Brevo Live SMTP settings saved and connected!'
            : 'Brevo sender details saved. Add a valid Brevo v3 API key (xkeysib-...) for live email delivery.'
        });
      } else {
        setIntegrationFeedback({ type: 'error', message: res.error || 'Failed to save Brevo settings.' });
      }
    } catch (err: any) {
      setIntegrationFeedback({ type: 'error', message: err.message || 'Failed to save Brevo settings.' });
    } finally {
      setIsSavingBrevo(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTarget.trim()) return;
    setIsSendingTestEmail(true);
    setIntegrationFeedback(null);
    try {
      const res = await api.adminSendTestEmail(testEmailTarget.trim(), 'Gideon Baffour');
      if (Array.isArray(res.emailLogs)) {
        setEmailLogs(res.emailLogs);
      } else {
        await loadIntegrations();
      }
      if (res.success) {
        setIntegrationFeedback({
          type: 'success',
          message: res.isSimulated
            ? `Test email logged in sandbox mode (ID: ${res.messageId}). Enter your Brevo API Key above to dispatch real inbox emails.`
            : `Live email sent to ${testEmailTarget.trim()} via Brevo! Message ID: ${res.messageId}`
        });
      } else {
        setIntegrationFeedback({ type: 'error', message: res.error || 'Brevo test email failed.' });
      }
    } catch (err: any) {
      setIntegrationFeedback({ type: 'error', message: err.message || 'Brevo test dispatch error.' });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleSaveSinglePackage = async (pkg: AdvertisingPackage) => {
    setSavingPackageId(pkg.id);
    try {
      const updatedList = await api.adminSavePackage(pkg);
      setEditablePackages(updatedList);
      onRefreshAll();
      showAdminNotice(`${pkg.name} saved successfully!`);
    } catch {
      showAdminNotice('Failed to update package.', 'error');
    } finally {
      setSavingPackageId(null);
    }
  };

  const handleDeletePackage = async (pkgId: string) => {
    try {
      const updatedList = await api.adminDeletePackage(pkgId);
      setEditablePackages(updatedList);
      setConfirmDeletePkgId(null);
      onRefreshAll();
      showAdminNotice('Package removed from storefront.');
    } catch {
      showAdminNotice('Failed to delete package.', 'error');
    }
  };

  const handleAddNewPackage = () => {
    const newId = `pkg-custom-${Date.now().toString().slice(-5)}`;
    const newPkg: AdvertisingPackage = {
      id: newId,
      name: `PACKAGE ${editablePackages.length + 1} - CUSTOM`,
      tier: 'Custom',
      serviceId: services[0]?.id || 'srv-whatsapp',
      recommendedFor: 'Targeted Done-For-You WhatsApp campaign for growing sellers.',
      advertisingBudgetUSD: 8,
      durationDays: 4,
      managementFeeUSD: 5,
      priceGHS: 200,
      advertisingBudgetGHS: 120,
      managementFeeGHS: 80,
      expectedMessages: '40-80 WhatsApp Messages Expected',
      includedServices: [
        '4 Days Campaign',
        '40-80 WhatsApp Messages Expected',
        'Done-For-You Ad Setup & Targeting',
        'Click-to-WhatsApp Buyer Routing'
      ],
      supportLevel: 'WhatsApp Support',
      reportingFrequency: 'End of campaign report',
      isPopular: false,
      status: 'active'
    };
    setEditablePackages([...editablePackages, newPkg]);
  };

  const handleSaveEmailTemplates = async () => {
    setIsSavingTemplates(true);
    try {
      await api.adminUpdateEmailTemplates(templatesForm);
      onRefreshAll();
      showAdminNotice('Email templates saved and synced with site branding!');
    } catch {
      showAdminNotice('Failed to save email templates.', 'error');
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const handleSaveFooter = async () => {
    setIsSavingFooter(true);
    try {
      await api.adminUpdateFooter(footerForm);
      onRefreshAll();
      showAdminNotice('Footer information saved and synced to email signatures.');
    } catch {
      showAdminNotice('Failed to update footer.', 'error');
    } finally {
      setIsSavingFooter(false);
    }
  };

  const handleResolveReset = async (requestId: string) => {
    const tempPass = 'TempPass' + Math.floor(1000 + Math.random() * 9000) + '!';
    try {
      await api.adminResolveReset(requestId, tempPass, branding.adminGoogleEmail);
      loadAccountsAndResets();
      showAdminNotice(`Password reset resolved! Temporary password issued: ${tempPass}`);
    } catch {
      showAdminNotice('Failed to resolve reset request.', 'error');
    }
  };

  const handleDirectReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directResetEmail || !directNewPassword) return;
    setIsResettingPassword(true);
    try {
      await api.adminDirectResetPassword(directResetEmail, directNewPassword);
      showAdminNotice(`Password updated successfully for ${directResetEmail}`);
      setDirectNewPassword('');
      loadAccountsAndResets();
    } catch {
      showAdminNotice('Failed to reset password.', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Aggregated KPIs strictly from verified PAID orders in Ghana Cedis (GH₵) — ZERO demo figures
  const ghsCurrency = currencies.find((c) => c.code === 'GHS');
  const ghsEffectiveRate = ghsCurrency
    ? ghsCurrency.rateVsUSD * (1 + (ghsCurrency.marginPercent || 0) / 100)
    : 15.45;
  const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
  const totalReceiptsGHS = paidOrders.reduce((sum, o) => {
    if (o.paymentCurrency === 'GHS') return sum + (o.paymentTotal || 0);
    return sum + (o.totalUSD || 0) * ghsEffectiveRate;
  }, 0);
  const totalAgencyFeesGHS = paidOrders.reduce((sum, o) => {
    if (o.paymentCurrency === 'GHS') return sum + (o.paymentAgencyFee || 0);
    return sum + (o.agencyFeeUSD || 0) * ghsEffectiveRate;
  }, 0);
  const totalAdBudgetGHS = paidOrders.reduce((sum, o) => {
    if (o.paymentCurrency === 'GHS') return sum + (o.paymentAdBudget || 0);
    return sum + (o.adBudgetUSD || 0) * ghsEffectiveRate;
  }, 0);
  const activeCampaignsCount = paidOrders.filter((o) => o.campaignStatus === 'LAUNCHED_ACTIVE').length;

  const isCloudAdminAuthed =
    firebaseUserEmail?.toLowerCase() === (brandingForm.adminGoogleEmail || 'baffourgideon05@gmail.com').toLowerCase();

  const liveEmailPreview = renderCustomEmailHtml({
    templateKey: selectedTemplateKey,
    emailTemplates: templatesForm,
    branding: brandingForm,
    footerConfig: footerForm,
    recipientEmail: previewRecipientEmail,
    recipientName: 'Valued Client'
  });

  return (
    <div className="py-8 bg-neutral-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <div className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
              <span>ADMINISTRATIVE CONSOLE</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700">Authenticated: {branding.adminGoogleEmail}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight mt-1">
              {branding.siteShortName} Management Suite
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isCloudAdminAuthed ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Firestore Cloud Sync Active ({firestoreOnline === false ? 'Offline Cache' : 'Live'})</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectAdminGoogle}
                disabled={isConnectingGoogle}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isConnectingGoogle ? 'Connecting...' : 'Connect Admin Google / Gmail for Cloud Sync'}</span>
              </button>
            )}

            <button
              onClick={onRefreshAll}
              className="p-2 bg-white text-neutral-700 hover:text-neutral-950 rounded-xl border border-neutral-200 transition-colors shadow-sm cursor-pointer"
              title="Refresh Global State"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Unified Admin Feedback Toast/Banner */}
        {adminNotice && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
              adminNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {adminNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{adminNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setAdminNotice(null)}
              className="text-xs opacity-60 hover:opacity-100 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Global KPI Strip (Strictly Ghana Cedis GH₵ · Zero Demo Figures) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="text-xs font-semibold text-neutral-500">Total Customer Receipts</div>
            <div className="text-2xl font-extrabold font-mono text-neutral-950 tabular-nums mt-1">
              GH₵ {totalReceiptsGHS.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              {paidOrders.length} Verified Paystack Transactions
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="text-xs font-semibold text-neutral-500">Agency Strategy Fees (Net)</div>
            <div className="text-2xl font-extrabold font-mono text-emerald-600 tabular-nums mt-1">
              GH₵ {totalAgencyFeesGHS.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Retained agency gross revenue
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="text-xs font-semibold text-neutral-500">Meta Ad Spend Deployed</div>
            <div className="text-2xl font-extrabold font-mono text-neutral-950 tabular-nums mt-1">
              GH₵ {totalAdBudgetGHS.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Allocated ad flight capital
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="text-xs font-semibold text-neutral-500">Active Live Flights</div>
            <div className="text-2xl font-extrabold font-mono text-blue-600 tabular-nums mt-1">
              {activeCampaignsCount}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Currently delivering on Meta
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-neutral-200/90 rounded-2xl">
          {[
            { id: 'orders', label: 'Campaigns & Orders', icon: Layers },
            { id: 'integrations', label: 'Brevo & Paystack Live', icon: CreditCard },
            { id: 'emails', label: 'Email Templates', icon: FileText },
            { id: 'branding', label: 'Website Content & SEO', icon: Edit3 },
            { id: 'pricing', label: 'Packages & Pricing', icon: Package },
            { id: 'currencies', label: 'Multi-Currency & FX', icon: Globe },
            { id: 'autorate', label: 'Auto-Fluctuation Engine', icon: Zap },
            { id: 'accounts', label: 'Client Accounts & Resets', icon: KeyRound },
            { id: 'footer', label: 'Footer Info & Contact', icon: Phone }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-neutral-950 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB: CUSTOMIZED EMAIL TEMPLATES EDITOR */}
        {activeTab === 'emails' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                <div>
                  <h2 className="text-base font-bold text-neutral-950">
                    Customized Brand Email Templates
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Dynamically synced with your site title (<strong className="text-neutral-900">{brandingForm.siteShortName}</strong>), logo, WhatsApp number, and footer details. Editing site branding automatically updates every email.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-xl">
                    <span>Accent:</span>
                    <input
                      type="color"
                      value={templatesForm.accentColor || '#059669'}
                      onChange={(e) => setTemplatesForm({ ...templatesForm, accentColor: e.target.value })}
                      className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-[11px]">{templatesForm.accentColor || '#059669'}</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templatesForm.includeLogo !== false}
                      onChange={(e) => setTemplatesForm({ ...templatesForm, includeLogo: e.target.checked })}
                      className="w-4 h-4 accent-neutral-950 rounded"
                    />
                    <span>Show Site Logo</span>
                  </label>
                </div>
              </div>

              {/* Template Selector */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'orderReceipt', label: 'Customer Order Receipt' },
                  { key: 'adminOrderAlert', label: 'Admin New Order Alert' },
                  { key: 'passwordReset', label: 'Password Reset Key' }
                ].map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => setSelectedTemplateKey(tpl.key as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      selectedTemplateKey === tpl.key
                        ? 'bg-neutral-950 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Editor Fields */}
                <div className="lg:col-span-6 space-y-4 text-xs">
                  {(() => {
                    const currentTpl: EmailTemplateItem =
                      templatesForm[selectedTemplateKey] || DEFAULT_EMAIL_TEMPLATES[selectedTemplateKey];
                    const updateTpl = (field: keyof EmailTemplateItem, val: string) => {
                      setTemplatesForm({
                        ...templatesForm,
                        [selectedTemplateKey]: {
                          ...currentTpl,
                          [field]: val
                        }
                      });
                    };

                    return (
                      <>
                        <div>
                          <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                            Email Subject Line
                          </label>
                          <input
                            type="text"
                            value={currentTpl.subject}
                            onChange={(e) => updateTpl('subject', e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs font-semibold text-neutral-900"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                              Banner Heading
                            </label>
                            <input
                              type="text"
                              value={currentTpl.heading}
                              onChange={(e) => updateTpl('heading', e.target.value)}
                              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                              Banner Subheading
                            </label>
                            <input
                              type="text"
                              value={currentTpl.subheading}
                              onChange={(e) => updateTpl('subheading', e.target.value)}
                              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                            Opening Greeting &amp; Intro Paragraph
                          </label>
                          <textarea
                            rows={3}
                            value={currentTpl.bodyIntro}
                            onChange={(e) => updateTpl('bodyIntro', e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                              Highlight Box Title
                            </label>
                            <input
                              type="text"
                              value={currentTpl.highlightTitle}
                              onChange={(e) => updateTpl('highlightTitle', e.target.value)}
                              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                              Sign-Off Signature
                            </label>
                            <input
                              type="text"
                              value={currentTpl.signOff}
                              onChange={(e) => updateTpl('signOff', e.target.value)}
                              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                            Highlight Box Content
                          </label>
                          <textarea
                            rows={2}
                            value={currentTpl.highlightBody}
                            onChange={(e) => updateTpl('highlightBody', e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                            Footer Note / Next Steps
                          </label>
                          <textarea
                            rows={2}
                            value={currentTpl.footerNote}
                            onChange={(e) => updateTpl('footerNote', e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                          />
                        </div>

                        {/* Variable Tokens Insert Chips */}
                        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                          <div className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                            Click to append dynamic site &amp; order tokens to Intro:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              '{{siteShortName}}',
                              '{{siteTitle}}',
                              '{{customerName}}',
                              '{{customerEmail}}',
                              '{{customerPhone}}',
                              '{{orderId}}',
                              '{{packageName}}',
                              '{{totalPaid}}',
                              '{{agencyPhone}}',
                              '{{whatsappNumber}}',
                              '{{agencyEmail}}',
                              '{{temporaryPassword}}'
                            ].map((token) => (
                              <button
                                key={token}
                                type="button"
                                onClick={() => updateTpl('bodyIntro', `${currentTpl.bodyIntro} ${token}`.trim())}
                                className="px-2 py-0.5 rounded-md bg-white border border-neutral-300 hover:border-neutral-950 font-mono text-[10px] text-neutral-800 cursor-pointer"
                              >
                                {token}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTemplatesForm({
                          ...templatesForm,
                          [selectedTemplateKey]: DEFAULT_EMAIL_TEMPLATES[selectedTemplateKey]
                        });
                        showAdminNotice('Template reset to default copy. Click Save Templates to persist.');
                      }}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Template</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveEmailTemplates}
                      disabled={isSavingTemplates}
                      className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingTemplates ? 'Saving...' : 'Save All Email Templates'}</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Live Rendered HTML Preview + Send Actions */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-100">
                    <div className="bg-neutral-900 text-white px-4 py-2.5 flex items-center justify-between text-xs">
                      <span className="font-mono font-bold truncate">
                        Subject: {liveEmailPreview.subject}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono shrink-0 ml-2">
                        LIVE SYNC PREVIEW
                      </span>
                    </div>
                    <iframe
                      title="Live Email Template Preview"
                      srcDoc={liveEmailPreview.htmlContent}
                      className="w-full h-[520px] bg-white border-0"
                    />
                  </div>

                  {/* Test Dispatch via Brevo or Connected Gmail OAuth */}
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3 text-xs">
                    <div className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
                      Test Template Delivery
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={previewRecipientEmail}
                        onChange={(e) => setPreviewRecipientEmail(e.target.value)}
                        placeholder="Recipient email address"
                        className="flex-1 bg-white border border-neutral-300 rounded-xl px-3 py-2 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!previewRecipientEmail.trim()) return;
                          setIsSendingTestEmail(true);
                          try {
                            const res = await api.adminSendTestEmail(
                              previewRecipientEmail.trim(),
                              'Valued Client',
                              selectedTemplateKey
                            );
                            if (res.success) {
                              showAdminNotice(
                                res.isSimulated
                                  ? `Logged preview in sandbox (${res.messageId}). Add Brevo key in Integrations or send via Gmail below.`
                                  : `Live template email sent via Brevo to ${previewRecipientEmail.trim()}!`
                              );
                            } else {
                              showAdminNotice(res.error || 'Brevo test dispatch failed.', 'error');
                            }
                          } catch (e: any) {
                            showAdminNotice(e?.message || 'Brevo dispatch failed.', 'error');
                          } finally {
                            setIsSendingTestEmail(false);
                          }
                        }}
                        disabled={isSendingTestEmail}
                        className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSendingTestEmail ? 'Sending...' : 'Send via Brevo'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!getGmailAccessToken()) {
                            handleConnectAdminGoogle();
                          } else {
                            setGmailConfirmOpen(true);
                          }
                        }}
                        className="px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-900 rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Mail className="w-3.5 h-3.5 text-rose-600" />
                        <span>{getGmailAccessToken() ? 'Send via Gmail' : 'Connect Gmail'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: BREVO EMAIL & PAYSTACK LIVE INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {integrationFeedback && (
              <div
                className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
                  integrationFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {integrationFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{integrationFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Paystack Live Credentials Card */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-5">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <h2 className="text-base font-bold text-neutral-950">Paystack Live Gateway</h2>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Permanently pre-connected for both Node/Express and Netlify serverless deployment — no reconnection needed after upload.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-mono shrink-0 ${
                      paystackHasSecretKey ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {paystackHasSecretKey ? (paystackIsLive ? 'LIVE CONNECTED' : 'TEST MODE') : 'SECRET KEY NEEDED'}
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                      Paystack Live Public Key
                    </label>
                    <input
                      type="text"
                      value={paystackPublicKeyInput}
                      onChange={(e) => setPaystackPublicKeyInput(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 font-mono text-xs text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                      Paystack Live Secret Key (Stored Server-Side Only)
                    </label>
                    <input
                      type="password"
                      value={paystackSecretKeyInput}
                      onChange={(e) => setPaystackSecretKeyInput(e.target.value)}
                      placeholder={
                        paystackSecretMasked
                          ? `Connected: ${paystackSecretMasked} (enter new key to replace)`
                          : 'Paste Paystack secret key or set PAYSTACK_SECRET_KEY on Netlify'
                      }
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 font-mono text-xs text-neutral-900"
                    />
                    <p className={`text-[11px] mt-1 font-medium ${paystackHasSecretKey ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {paystackHasSecretKey ? (
                        <>Active server key: <span className="font-mono">{paystackSecretMasked}</span></>
                      ) : (
                        <>Set <code className="font-mono bg-neutral-100 px-1 rounded">PAYSTACK_SECRET_KEY</code> in Netlify Environment Variables or paste it above.</>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="paystackLiveMode"
                      checked={paystackIsLive}
                      onChange={(e) => setPaystackIsLive(e.target.checked)}
                      className="w-4 h-4 accent-neutral-950 rounded"
                    />
                    <label htmlFor="paystackLiveMode" className="font-semibold text-neutral-800">
                      Production Live Checkout Mode Enabled
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePaystack}
                    disabled={isSavingPaystack}
                    className="px-5 py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingPaystack ? 'Saving...' : 'Save Paystack Keys'}</span>
                  </button>
                </div>
              </div>

              {/* Brevo Live Transactional Email Card */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-5">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <h2 className="text-base font-bold text-neutral-950">Brevo Live Transactional Email</h2>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Connects directly to Brevo REST API v3 to dispatch customer order receipts, admin alerts, and password resets.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-mono shrink-0 ${
                      brevoHasApiKey ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {brevoHasApiKey ? 'BREVO LIVE' : 'KEY NEEDED'}
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                      Brevo v3 API Key (xkeysib-...)
                    </label>
                    <input
                      type="password"
                      value={brevoApiKeyInput}
                      onChange={(e) => setBrevoApiKeyInput(e.target.value)}
                      placeholder={brevoApiKeyMasked ? `Configured: ${brevoApiKeyMasked} (enter to update)` : 'Paste xkeysib-... from Brevo SMTP & API settings'}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 font-mono text-xs text-neutral-900"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Set in Admin or as <code className="font-mono bg-neutral-100 px-1 rounded">BREVO_API_KEY</code> env var on Netlify for zero-reconfiguration deploys.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                        Verified Sender Name
                      </label>
                      <input
                        type="text"
                        value={brevoSenderName}
                        onChange={(e) => setBrevoSenderName(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                        Verified Sender Email
                      </label>
                      <input
                        type="email"
                        value={brevoSenderEmail}
                        onChange={(e) => setBrevoSenderEmail(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 font-mono text-xs text-neutral-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                      Admin New Order Alert Email
                    </label>
                    <input
                      type="email"
                      value={brevoAdminEmail}
                      onChange={(e) => setBrevoAdminEmail(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 font-mono text-xs text-neutral-900"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 font-semibold text-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={brevoEnabled}
                        onChange={(e) => setBrevoEnabled(e.target.checked)}
                        className="w-4 h-4 accent-neutral-950 rounded"
                      />
                      <span>Enable Automated Emails</span>
                    </label>

                    <label className="flex items-center gap-2 font-semibold text-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={brevoNotifyAdmin}
                        onChange={(e) => setBrevoNotifyAdmin(e.target.checked)}
                        className="w-4 h-4 accent-neutral-950 rounded"
                      />
                      <span>Notify Admin on Paid Order</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="email"
                      value={testEmailTarget}
                      onChange={(e) => setTestEmailTarget(e.target.value)}
                      placeholder="Test recipient email"
                      className="flex-1 bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={isSendingTestEmail}
                      className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingTestEmail ? 'Sending...' : 'Send Test'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveBrevo}
                    disabled={isSavingBrevo}
                    className="px-5 py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingBrevo ? 'Saving...' : 'Save Brevo Settings'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Brevo Email Delivery Audit Log */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-950">
                  Brevo Email Delivery Logs ({emailLogs.length})
                </h3>
                <button
                  type="button"
                  onClick={loadIntegrations}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-950 cursor-pointer"
                >
                  Refresh Logs
                </button>
              </div>
              <div className="overflow-x-auto">
                {emailLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    No transactional emails dispatched yet. Send a test email or complete a Paystack order to inspect delivery status.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-mono uppercase text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Timestamp</th>
                        <th className="py-2.5 px-4">Recipient</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Subject</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Message ID / Info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {emailLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-neutral-50/70">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-500">
                            {new Date(log.sentAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-semibold text-neutral-900">
                            {log.recipientEmail}
                          </td>
                          <td className="py-2.5 px-4 uppercase font-mono text-[10px] text-neutral-600">
                            {log.type.replace(/_/g, ' ')}
                          </td>
                          <td className="py-2.5 px-4 text-neutral-700 max-w-[240px] truncate">
                            {log.subject}
                          </td>
                          <td className="py-2.5 px-4 font-bold uppercase text-[10px]">
                            <span
                              className={
                                log.status === 'sent'
                                  ? 'text-emerald-700'
                                  : log.status === 'failed'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                              }
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-500">
                            {log.error || log.messageId || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: CAMPAIGNS & ORDERS */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-950">
                Campaign Orders & Paystack Settlements ({orders.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Order / Receipt</th>
                    <th className="py-3 px-4">Customer & Brand</th>
                    <th className="py-3 px-4">Service & Model</th>
                    <th className="py-3 px-4">Payable Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Campaign Stage</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 px-6 text-center text-xs text-neutral-500">
                        <div className="font-bold text-neutral-800 text-sm mb-1">
                          No verified orders yet
                        </div>
                        <p className="text-neutral-500">
                          Management Suite KPI totals remain at <strong>GH₵ 0.00</strong> until a real Paystack payment completes.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                          <div>{ord.id}</div>
                          <div className="text-[10px] text-neutral-400 font-normal">
                            {ord.receiptNumber || 'Ref: ' + (ord.paymentReference?.slice(-8) || 'N/A')}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-neutral-900">{ord.campaignBrief.businessName || ord.customerName}</div>
                          <div className="text-neutral-500 text-[11px]">{ord.customerEmail}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-neutral-900 font-medium truncate max-w-[180px]">{ord.serviceName}</div>
                          <div className="text-neutral-500 text-[10px]">
                            {ord.fundingArrangement === 'COMBINED' ? 'Combined (Budget+Fee)' : 'Fee Only (Direct)'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums">
                          <div className="font-bold text-neutral-950">
                            {ord.paymentCurrency} {ord.paymentTotal.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            (${ord.totalUSD} USD)
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block font-bold text-[11px] ${
                            ord.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {ord.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[11px] font-semibold ${
                            ord.campaignStatus === 'LAUNCHED_ACTIVE' ? 'text-emerald-700' : 'text-blue-700'
                          }`}>
                            {ord.campaignStatus.replace('_', ' ')}
                          </span>
                          {ord.assignedStaff && (
                            <div className="text-[10px] text-neutral-400">
                              By {ord.assignedStaff.split(' ')[0]}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openOrderManager(ord)}
                            className="px-3 py-1.5 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors"
                          >
                            Manage & Flight
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-CURRENCY & FX */}
        {activeTab === 'currencies' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                <div>
                  <h2 className="text-base font-bold text-neutral-950">
                    Live FX Rates & Currency Pairs
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Authoritative rates comparison with percentage delta calculation and automatic threshold alerts.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSyncCurrencies}
                    disabled={isSyncingRates}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRates ? 'animate-spin' : ''}`} />
                    <span>Sync Live Interbank Rates</span>
                  </button>
                </div>
              </div>

              {/* Currencies Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-mono uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-3">Currency</th>
                      <th className="py-3 px-3">Name</th>
                      <th className="py-3 px-3">Current vs USD</th>
                      <th className="py-3 px-3">Prev Rate</th>
                      <th className="py-3 px-3">Fluctuation (%)</th>
                      <th className="py-3 px-3">Agency Margin</th>
                      <th className="py-3 px-3">Paystack Settlement</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono">
                    {currencies.map((curr) => {
                      const pctChange = curr.previousRateVsUSD > 0
                        ? Number((((curr.rateVsUSD - curr.previousRateVsUSD) / curr.previousRateVsUSD) * 100).toFixed(2))
                        : 0;

                      return (
                        <tr key={curr.code} className="hover:bg-neutral-50/70">
                          <td className="py-3 px-3 font-bold text-neutral-900">
                            {curr.code} ({curr.symbol})
                          </td>
                          <td className="py-3 px-3 font-sans text-neutral-700">
                            {curr.name}
                          </td>
                          <td className="py-3 px-3 font-bold tabular-nums text-neutral-950">
                            {curr.rateVsUSD.toFixed(4)}
                          </td>
                          <td className="py-3 px-3 tabular-nums text-neutral-400">
                            {curr.previousRateVsUSD.toFixed(4)}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 font-bold ${
                              pctChange > 0 ? 'text-rose-600' : pctChange < 0 ? 'text-emerald-600' : 'text-neutral-500'
                            }`}>
                              {pctChange > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : pctChange < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                              <span>{pctChange > 0 ? `+${pctChange}%` : `${pctChange}%`}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 font-sans text-neutral-800">
                            +{curr.marginPercent}%
                          </td>
                          <td className="py-3 px-3 font-sans">
                            <span className={`text-[11px] font-semibold ${curr.supportedForPayment ? 'text-emerald-700' : 'text-neutral-400'}`}>
                              {curr.supportedForPayment ? 'Native Paystack' : 'Converted to USD'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-sans">
                            <button
                              onClick={() => {
                                setSelectedCurrency(curr);
                                setEditRate(curr.rateVsUSD);
                                setEditMargin(curr.marginPercent);
                                setEditPaystackSupport(curr.supportedForPayment);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg"
                            >
                              Edit Rate / Margin
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUTO-RATE FLUCTUATION DETECTION ENGINE */}
        {activeTab === 'autorate' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h2 className="text-base font-bold text-neutral-950">
                      Automatic Currency Fluctuation & Price Change Detector
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
                    Continuously monitors currency changes (e.g. when $1 changes from 11 GHS to 12 GHS or 15.2 to 15.6) automatically in the background without external intervention.
                  </p>
                </div>

                <button
                  onClick={handleTriggerAutoRate}
                  disabled={isTriggeringAutoRate}
                  className="px-4 py-2 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringAutoRate ? 'animate-spin' : ''}`} />
                  <span>Run Immediate Detection Scan</span>
                </button>
              </div>

              {/* Config Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                    Background Auto-Detection Engine
                  </label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRateForm.enabled}
                        onChange={(e) => setAutoRateForm({ ...autoRateForm, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-950"></div>
                    </label>
                    <span className="text-xs font-bold text-neutral-900">
                      {autoRateForm.enabled ? 'Active (Auto Monitoring)' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">Runs every 45s to track currency movements</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                    Detection Sensitivity Threshold (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={autoRateForm.sensitivityPercent}
                    onChange={(e) => setAutoRateForm({ ...autoRateForm, sensitivityPercent: Number(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs font-mono font-bold"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">Triggers log when rate moves $\ge$ this percentage</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                    Auto-Boost Margin Protection (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={autoRateForm.autoBoostMarginPercent}
                    onChange={(e) => setAutoRateForm({ ...autoRateForm, autoBoostMarginPercent: Number(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs font-mono font-bold"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">Boosts currency spread automatically when currency depreciates</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveAutoRateConfig}
                  className="px-5 py-2 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Save Detection Config
                </button>
              </div>

              {/* Auto Logs stream */}
              <div className="pt-6 border-t border-neutral-100">
                <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-wider mb-3">
                  Automatic Fluctuation Event Audit Stream
                </h3>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {(autoRateEngine.autoLogs || []).length === 0 ? (
                    <div className="text-xs text-neutral-400 py-3 text-center">No auto-detection events yet.</div>
                  ) : (
                    autoRateEngine.autoLogs.map((log, index) => (
                      <div
                        key={log.timestamp + index}
                        className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/70 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-neutral-950">{log.currency}/USD</span>
                          <span>{log.previousRate.toFixed(4)} → {log.currentRate.toFixed(4)}</span>
                          <span className={`font-bold ${log.direction === 'UP' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {log.direction} ({log.percentageChange > 0 ? `+${log.percentageChange}%` : `${log.percentageChange}%`})
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-neutral-500 text-[11px]">
                          {log.boostApplied && log.boostApplied > 0 ? (
                            <span className="text-amber-700 font-bold font-sans">
                              +{log.boostApplied}% Boost Applied
                            </span>
                          ) : null}
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CLIENT ACCOUNTS & RESET PASSWORD */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            {/* Password Reset Requests Queue */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-neutral-950">
                    Client Password Reset Inquiries ({resetRequests.filter(r => r.status === 'pending').length} Pending)
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Internal administration system to manage and resolve client password reset requests safely.
                  </p>
                </div>
                <button onClick={loadAccountsAndResets} className="text-xs text-neutral-600 hover:text-neutral-950">
                  Refresh Queue
                </button>
              </div>

              {resetRequests.length === 0 ? (
                <div className="text-xs text-neutral-400 py-4 text-center">
                  No password reset requests currently pending.
                </div>
              ) : (
                <div className="space-y-3">
                  {resetRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
                        req.status === 'pending'
                          ? 'border-amber-200 bg-amber-50/60'
                          : 'border-neutral-200 bg-neutral-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900">{req.userName}</span>
                          <span className="text-neutral-500">({req.userEmail})</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            req.status === 'pending' ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {req.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-neutral-400 text-[11px] mt-1 font-mono">
                          Requested: {new Date(req.requestedAt).toLocaleString()}
                        </div>
                        {req.temporaryPassword && (
                          <div className="mt-1 text-emerald-800 font-mono text-xs font-bold">
                            Temporary Password Issued: {req.temporaryPassword}
                          </div>
                        )}
                      </div>

                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleResolveReset(req.id)}
                          className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 shrink-0"
                        >
                          Issue Temporary Password
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Password Reset Form */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8">
              <h3 className="text-sm font-bold text-neutral-950 mb-2">
                Direct User Password Override
              </h3>
              <p className="text-xs text-neutral-500 mb-4">
                Administratively set a new password for any customer account in the database.
              </p>

              <form onSubmit={handleDirectReset} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                    User Email
                  </label>
                  <input
                    type="email"
                    required
                    value={directResetEmail}
                    onChange={(e) => setDirectResetEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                    New Password
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={directNewPassword}
                    onChange={(e) => setDirectNewPassword(e.target.value)}
                    placeholder="NewSecurePass2026!"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="w-full py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    {isResettingPassword ? 'Updating...' : 'Set Password'}
                  </button>
                </div>
              </form>
            </div>

            {/* Registered Users Database List */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8">
              <h3 className="text-sm font-bold text-neutral-950 mb-3">
                Registered Accounts Database ({usersList.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-mono uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Provider</th>
                      <th className="py-2.5 px-3">Registered Date</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-neutral-50/70">
                        <td className="py-3 px-3 font-semibold text-neutral-900">{u.name}</td>
                        <td className="py-3 px-3 font-mono">{u.email}</td>
                        <td className="py-3 px-3 font-bold">
                          <span className={u.role === 'admin' ? 'text-blue-700' : 'text-neutral-700'}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-neutral-500">{u.authProvider}</td>
                        <td className="py-3 px-3 text-neutral-400 font-mono">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setDirectResetEmail(u.email);
                              setDirectNewPassword('ResetPass' + Math.floor(1000 + Math.random() * 9000) + '!');
                            }}
                            className="text-neutral-900 font-bold hover:underline"
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FULL WEBSITE CONTENT, SITE TITLE, SEO, HERO, PROCESS & FAQS */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            {/* Block A: Site Title, Brand Identity & SEO Meta */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-neutral-950">
                    Site Title, Brand Wordmark, SEO &amp; Master Admin Account
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Every edit saves to the database and Cloud Firestore and automatically updates your website AND email templates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBranding}
                  disabled={isSavingBranding}
                  className="px-5 py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingBranding ? 'Saving...' : 'Save All Website Edits'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                    Full Site Title (Browser Tab &amp; SEO)
                  </label>
                  <input
                    type="text"
                    value={brandingForm.siteTitle}
                    onChange={(e) => setBrandingForm({ ...brandingForm, siteTitle: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                    Brand Short Name (Navbar, Footer &amp; Emails)
                  </label>
                  <input
                    type="text"
                    value={brandingForm.siteShortName}
                    onChange={(e) => setBrandingForm({ ...brandingForm, siteShortName: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                    SEO Meta Description
                  </label>
                  <input
                    type="text"
                    value={contentForm.metaDescription || ''}
                    onChange={(e) => setContentForm({ ...contentForm, metaDescription: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                    Custom Logo Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={brandingForm.logoUrl}
                    onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                    placeholder="https://... (leave empty for badge text)"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                    Logo Badge Monogram Text
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={brandingForm.logoBadgeText}
                    onChange={(e) => setBrandingForm({ ...brandingForm, logoBadgeText: e.target.value })}
                    placeholder="AP"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                    Authorized Admin Account Email *
                  </label>
                  <input
                    type="email"
                    value={brandingForm.adminGoogleEmail}
                    onChange={(e) => setBrandingForm({ ...brandingForm, adminGoogleEmail: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs font-mono font-bold text-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Block B: Hero Banner, Visual Overlay & 4 KPI Strip */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-5 text-xs">
              <h3 className="text-sm font-bold text-neutral-950 border-b border-neutral-100 pb-3">
                Homepage Hero Section &amp; Visual Card
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Hero Badge Pill</label>
                  <input
                    type="text"
                    value={contentForm.heroBadgeText || ''}
                    onChange={(e) => setContentForm({ ...contentForm, heroBadgeText: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Hero Badge Subtext</label>
                  <input
                    type="text"
                    value={contentForm.heroBadgeSubtext || ''}
                    onChange={(e) => setContentForm({ ...contentForm, heroBadgeSubtext: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Homepage Main Headline</label>
                  <input
                    type="text"
                    value={contentForm.headline}
                    onChange={(e) => setContentForm({ ...contentForm, headline: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Homepage Subheadline</label>
                  <textarea
                    rows={2}
                    value={contentForm.subheadline}
                    onChange={(e) => setContentForm({ ...contentForm, subheadline: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Primary CTA Button Text</label>
                  <input
                    type="text"
                    value={contentForm.heroPrimaryCta || ''}
                    onChange={(e) => setContentForm({ ...contentForm, heroPrimaryCta: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Secondary CTA Button Text</label>
                  <input
                    type="text"
                    value={contentForm.heroSecondaryCta || ''}
                    onChange={(e) => setContentForm({ ...contentForm, heroSecondaryCta: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Hero Image Eyebrow</label>
                  <input
                    type="text"
                    value={contentForm.heroVisualEyebrow || ''}
                    onChange={(e) => setContentForm({ ...contentForm, heroVisualEyebrow: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Hero Image Headline</label>
                  <input
                    type="text"
                    value={contentForm.heroVisualTitle || ''}
                    onChange={(e) => setContentForm({ ...contentForm, heroVisualTitle: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Hero Image Subtitle</label>
                  <input
                    type="text"
                    value={contentForm.heroVisualSubtitle || ''}
                    onChange={(e) => setContentForm({ ...contentForm, heroVisualSubtitle: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5"
                  />
                </div>
              </div>

              {/* 4 Hero KPIs Editor */}
              <div className="pt-2">
                <div className="font-bold text-neutral-800 mb-2">Hero KPI Highlights (4 Columns)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(contentForm.heroKpis || []).map((kpi, kIdx) => (
                    <div key={kIdx} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                      <input
                        type="text"
                        value={kpi.value}
                        placeholder="Value (e.g. 24h)"
                        onChange={(e) => {
                          const next = [...(contentForm.heroKpis || [])];
                          next[kIdx] = { ...kpi, value: e.target.value };
                          setContentForm({ ...contentForm, heroKpis: next });
                        }}
                        className="w-full bg-white border border-neutral-300 rounded-lg p-1.5 font-mono font-bold"
                      />
                      <input
                        type="text"
                        value={kpi.label}
                        placeholder="Label"
                        onChange={(e) => {
                          const next = [...(contentForm.heroKpis || [])];
                          next[kIdx] = { ...kpi, label: e.target.value };
                          setContentForm({ ...contentForm, heroKpis: next });
                        }}
                        className="w-full bg-white border border-neutral-300 rounded-lg p-1.5 font-semibold"
                      />
                      <input
                        type="text"
                        value={kpi.sublabel}
                        placeholder="Sublabel"
                        onChange={(e) => {
                          const next = [...(contentForm.heroKpis || [])];
                          next[kIdx] = { ...kpi, sublabel: e.target.value };
                          setContentForm({ ...contentForm, heroKpis: next });
                        }}
                        className="w-full bg-white border border-neutral-300 rounded-lg p-1.5 text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Block C: Packages, Checkout & How-It-Works Headers */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-5 text-xs">
              <h3 className="text-sm font-bold text-neutral-950 border-b border-neutral-100 pb-3">
                Storefront Section Headings &amp; 4-Step Process
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Packages Section Badge</label>
                  <input
                    type="text"
                    value={contentForm.packagesSectionBadge || ''}
                    onChange={(e) => setContentForm({ ...contentForm, packagesSectionBadge: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Packages Section Title</label>
                  <input
                    type="text"
                    value={contentForm.packagesSectionTitle || ''}
                    onChange={(e) => setContentForm({ ...contentForm, packagesSectionTitle: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Packages Section Subtitle</label>
                  <input
                    type="text"
                    value={contentForm.packagesSectionSubtitle || ''}
                    onChange={(e) => setContentForm({ ...contentForm, packagesSectionSubtitle: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Checkout Eyebrow</label>
                  <input
                    type="text"
                    value={contentForm.checkoutSectionEyebrow || ''}
                    onChange={(e) => setContentForm({ ...contentForm, checkoutSectionEyebrow: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Checkout Title</label>
                  <input
                    type="text"
                    value={contentForm.checkoutSectionTitle || ''}
                    onChange={(e) => setContentForm({ ...contentForm, checkoutSectionTitle: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">Checkout Subtitle</label>
                  <input
                    type="text"
                    value={contentForm.checkoutSectionSubtitle || ''}
                    onChange={(e) => setContentForm({ ...contentForm, checkoutSectionSubtitle: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {(contentForm.processSteps || []).map((st, sIdx) => (
                  <div key={sIdx} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                    <div className="font-mono font-bold text-neutral-500">STEP {st.step}</div>
                    <input
                      type="text"
                      value={st.title}
                      onChange={(e) => {
                        const next = [...(contentForm.processSteps || [])];
                        next[sIdx] = { ...st, title: e.target.value };
                        setContentForm({ ...contentForm, processSteps: next });
                      }}
                      className="w-full bg-white border border-neutral-300 rounded-lg p-1.5 font-bold"
                    />
                    <textarea
                      rows={3}
                      value={st.description}
                      onChange={(e) => {
                        const next = [...(contentForm.processSteps || [])];
                        next[sIdx] = { ...st, description: e.target.value };
                        setContentForm({ ...contentForm, processSteps: next });
                      }}
                      className="w-full bg-white border border-neutral-300 rounded-lg p-1.5 text-[11px]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Block D: FAQs Editor */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-950">
                    Frequently Asked Questions Editor ({(contentForm.faqs || []).length})
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Add, edit, or delete public FAQs shown below checkout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setContentForm({
                      ...contentForm,
                      faqs: [
                        ...(contentForm.faqs || []),
                        {
                          id: `faq-${Date.now().toString().slice(-5)}`,
                          question: 'New question here?',
                          answer: 'Clear, helpful answer here.',
                          category: 'General'
                        }
                      ]
                    })
                  }
                  className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add FAQ</span>
                </button>
              </div>

              <div className="space-y-3">
                {(contentForm.faqs || []).map((faq, fIdx) => (
                  <div key={faq.id || fIdx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={faq.question}
                        placeholder="FAQ Question"
                        onChange={(e) => {
                          const next = [...contentForm.faqs];
                          next[fIdx] = { ...faq, question: e.target.value };
                          setContentForm({ ...contentForm, faqs: next });
                        }}
                        className="flex-1 bg-white border border-neutral-300 rounded-lg p-2 font-bold text-neutral-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = contentForm.faqs.filter((_, i) => i !== fIdx);
                          setContentForm({ ...contentForm, faqs: next });
                        }}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Remove FAQ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={faq.answer}
                      placeholder="FAQ Answer"
                      onChange={(e) => {
                        const next = [...contentForm.faqs];
                        next[fIdx] = { ...faq, answer: e.target.value };
                        setContentForm({ ...contentForm, faqs: next });
                      }}
                      className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-700"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-neutral-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveBranding}
                  disabled={isSavingBranding}
                  className="px-6 py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingBranding ? 'Saving...' : 'Save Site Titles, Content & FAQs'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: FOOTER INFORMATION & CONTACT */}
        {activeTab === 'footer' && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-base font-bold text-neutral-950">
                Official Footer Information & Corporate Details
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Update the company phone number, official email, physical headquarters, WhatsApp link, and copyright notice displayed on the footer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Company Official Phone Number
                </label>
                <input
                  type="text"
                  value={footerForm.phone}
                  onChange={(e) => setFooterForm({ ...footerForm, phone: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Official Company Email
                </label>
                <input
                  type="email"
                  value={footerForm.email}
                  onChange={(e) => setFooterForm({ ...footerForm, email: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  WhatsApp Support Number
                </label>
                <input
                  type="text"
                  value={footerForm.whatsappNumber}
                  onChange={(e) => setFooterForm({ ...footerForm, whatsappNumber: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Business Working Hours
                </label>
                <input
                  type="text"
                  value={footerForm.businessHours}
                  onChange={(e) => setFooterForm({ ...footerForm, businessHours: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Headquarters Physical Address
                </label>
                <input
                  type="text"
                  value={footerForm.address}
                  onChange={(e) => setFooterForm({ ...footerForm, address: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Footer About Narrative
                </label>
                <textarea
                  rows={2}
                  value={footerForm.aboutText}
                  onChange={(e) => setFooterForm({ ...footerForm, aboutText: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Copyright Notice
                </label>
                <input
                  type="text"
                  value={footerForm.copyrightNotice}
                  onChange={(e) => setFooterForm({ ...footerForm, copyrightNotice: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                onClick={handleSaveFooter}
                disabled={isSavingFooter}
                className="px-6 py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingFooter ? 'Saving Footer...' : 'Save Footer Information'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: PACKAGES & PRICING ENGINE */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Direct Package Editor */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-neutral-950">
                    Done-For-You Packages Editor (Homepage Prices)
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Update package titles, tiers, total GHS prices, duration days, deliverables list, or add/remove packages.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewPackage}
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Package</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {editablePackages.map((pkg, idx) => (
                  <div key={pkg.id} className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/70 space-y-3 text-xs flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={pkg.tier}
                          onChange={(e) => {
                            const next = [...editablePackages];
                            next[idx] = { ...pkg, tier: e.target.value };
                            setEditablePackages(next);
                          }}
                          className="w-24 bg-white border border-neutral-300 rounded-lg px-2 py-1 font-mono font-bold text-neutral-700 uppercase text-[11px]"
                        />
                        <label className="flex items-center gap-1.5 font-semibold text-neutral-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(pkg.isPopular)}
                            onChange={(e) => {
                              const next = [...editablePackages];
                              next[idx] = { ...pkg, isPopular: e.target.checked };
                              setEditablePackages(next);
                            }}
                            className="accent-neutral-950 rounded"
                          />
                          <span>Popular</span>
                        </label>
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-600 mb-1">Package Title</label>
                        <input
                          type="text"
                          value={pkg.name}
                          onChange={(e) => {
                            const next = [...editablePackages];
                            next[idx] = { ...pkg, name: e.target.value };
                            setEditablePackages(next);
                          }}
                          className="w-full bg-white border border-neutral-300 rounded-xl p-2 font-bold text-neutral-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block font-semibold text-neutral-600 mb-1">Total Price (GH₵)</label>
                          <input
                            type="number"
                            value={pkg.priceGHS || 0}
                            onChange={(e) => {
                              const next = [...editablePackages];
                              next[idx] = { ...pkg, priceGHS: Number(e.target.value) };
                              setEditablePackages(next);
                            }}
                            className="w-full bg-white border border-neutral-300 rounded-xl p-2 font-mono font-bold text-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-neutral-600 mb-1">Days</label>
                          <input
                            type="number"
                            value={pkg.durationDays}
                            onChange={(e) => {
                              const next = [...editablePackages];
                              next[idx] = { ...pkg, durationDays: Number(e.target.value) };
                              setEditablePackages(next);
                            }}
                            className="w-full bg-white border border-neutral-300 rounded-xl p-2 font-mono font-bold text-neutral-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-600 mb-1">Expected Messages</label>
                        <input
                          type="text"
                          value={pkg.expectedMessages || ''}
                          onChange={(e) => {
                            const next = [...editablePackages];
                            next[idx] = { ...pkg, expectedMessages: e.target.value };
                            setEditablePackages(next);
                          }}
                          className="w-full bg-white border border-neutral-300 rounded-xl p-2 text-neutral-900"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-600 mb-1">Short Description</label>
                        <textarea
                          rows={2}
                          value={pkg.recommendedFor}
                          onChange={(e) => {
                            const next = [...editablePackages];
                            next[idx] = { ...pkg, recommendedFor: e.target.value };
                            setEditablePackages(next);
                          }}
                          className="w-full bg-white border border-neutral-300 rounded-xl p-2 text-neutral-900"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-600 mb-1">
                          Deliverables (One per line)
                        </label>
                        <textarea
                          rows={4}
                          value={(pkg.includedServices || []).join('\n')}
                          onChange={(e) => {
                            const next = [...editablePackages];
                            next[idx] = {
                              ...pkg,
                              includedServices: e.target.value.split('\n').filter((line) => line.trim() !== '')
                            };
                            setEditablePackages(next);
                          }}
                          className="w-full bg-white border border-neutral-300 rounded-xl p-2 text-[11px] text-neutral-900"
                        />
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <button
                        type="button"
                        onClick={() => handleSaveSinglePackage(pkg)}
                        disabled={savingPackageId === pkg.id}
                        className="w-full py-2 bg-neutral-950 text-white rounded-xl font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        {savingPackageId === pkg.id ? 'Saving...' : 'Save Package'}
                      </button>

                      {confirmDeletePkgId === pkg.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="flex-1 py-1.5 bg-rose-600 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePkgId(null)}
                            className="px-2.5 py-1.5 bg-neutral-200 text-neutral-700 rounded-lg text-[11px] font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePkgId(pkg.id)}
                          className="w-full py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Package</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-base font-bold text-neutral-950">
                  Authoritative Agency Pricing Engine Rules
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Configure default percentage markups, fixed management charges, price rounding, and quote locks without altering code.
                </p>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Default Pricing Method
                </label>
                <select
                  value={pricingForm.defaultMethod}
                  onChange={(e) => setPricingForm({ ...pricingForm, defaultMethod: e.target.value as any })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs font-medium"
                >
                  <option value="PERCENTAGE">Method A: Percentage Markup</option>
                  <option value="FIXED">Method B: Fixed Fee</option>
                  <option value="COMBINED">Method C: Combined (Percentage + Fixed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Default Markup Percentage (%)
                </label>
                <input
                  type="number"
                  value={pricingForm.defaultMarkupPercent}
                  onChange={(e) => setPricingForm({ ...pricingForm, defaultMarkupPercent: Number(e.target.value) })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Default Fixed Agency Fee ($ USD)
                </label>
                <input
                  type="number"
                  value={pricingForm.defaultFixedFee}
                  onChange={(e) => setPricingForm({ ...pricingForm, defaultFixedFee: Number(e.target.value) })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Minimum Agency Fee ($ USD)
                </label>
                <input
                  type="number"
                  value={pricingForm.minimumAgencyFee}
                  onChange={(e) => setPricingForm({ ...pricingForm, minimumAgencyFee: Number(e.target.value) })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Min Campaign Budget ($ USD)
                </label>
                <input
                  type="number"
                  value={pricingForm.minCampaignBudget}
                  onChange={(e) => setPricingForm({ ...pricingForm, minCampaignBudget: Number(e.target.value) })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Max Campaign Budget ($ USD)
                </label>
                <input
                  type="number"
                  value={pricingForm.maxCampaignBudget}
                  onChange={(e) => setPricingForm({ ...pricingForm, maxCampaignBudget: Number(e.target.value) })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                onClick={async () => {
                  setIsSavingPricing(true);
                  try {
                    await api.adminUpdatePricing(pricingForm);
                    onRefreshAll();
                    showAdminNotice('Pricing engine rules updated and persisted.');
                  } finally {
                    setIsSavingPricing(false);
                  }
                }}
                disabled={isSavingPricing}
                className="px-6 py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingPricing ? 'Saving...' : 'Save Pricing Engine Configuration'}</span>
              </button>
            </div>
            </div>
          </div>
        )}

        {/* Order Flight Manager Modal */}
        {editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 border border-neutral-200 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <div>
                  <div className="text-xs font-mono text-neutral-400">FLIGHT MANAGER · {editingOrder.id}</div>
                  <h3 className="text-base font-bold text-neutral-950">
                    {editingOrder.campaignBrief.businessName || editingOrder.customerName}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="text-neutral-400 hover:text-neutral-700 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-neutral-600 block mb-1">Campaign Status Stage</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="w-full border border-neutral-300 rounded-xl p-2 bg-neutral-50 font-bold"
                  >
                    <option value="SUBMITTED">Brief Submitted</option>
                    <option value="UNDER_REVIEW">Under Strategy Review</option>
                    <option value="APPROVED">Meta Ad Approved</option>
                    <option value="LAUNCHED_ACTIVE">Launched & Delivering Ads</option>
                    <option value="COMPLETED">Flight Completed</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-neutral-600 block mb-1">Assigned Specialist</label>
                  <input
                    type="text"
                    value={assignedStaff}
                    onChange={(e) => setAssignedStaff(e.target.value)}
                    className="w-full border border-neutral-300 rounded-xl p-2 bg-neutral-50"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-600 block mb-1 text-xs">Meta Campaign ID (Graph API)</label>
                <input
                  type="text"
                  value={metaCampaignId}
                  onChange={(e) => setMetaCampaignId(e.target.value)}
                  placeholder="e.g. act_89123891_cmp_99214"
                  className="w-full border border-neutral-300 rounded-xl p-2 bg-neutral-50 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                <div>
                  <label className="text-[10px] text-neutral-500 font-semibold uppercase">Impressions</label>
                  <input
                    type="number"
                    value={impressions}
                    onChange={(e) => setImpressions(Number(e.target.value))}
                    className="w-full border border-neutral-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 font-semibold uppercase">Link Clicks</label>
                  <input
                    type="number"
                    value={clicks}
                    onChange={(e) => setClicks(Number(e.target.value))}
                    className="w-full border border-neutral-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 font-semibold uppercase">Conversions / Leads</label>
                  <input
                    type="number"
                    value={conversions}
                    onChange={(e) => setConversions(Number(e.target.value))}
                    className="w-full border border-neutral-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 font-semibold uppercase">Current ROAS (x)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={roas}
                    onChange={(e) => setRoas(Number(e.target.value))}
                    className="w-full border border-neutral-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-600 block mb-1 text-xs">Strategy & Review Notes for Client</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Notes visible in client portal..."
                  className="w-full border border-neutral-300 rounded-xl p-2.5 bg-neutral-50 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOrderUpdate}
                  disabled={isUpdatingOrder}
                  className="px-5 py-2 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800"
                >
                  {isUpdatingOrder ? 'Saving...' : 'Update Campaign State'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Currency Modal */}
        {selectedCurrency && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-neutral-200 shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                <h3 className="font-bold text-neutral-950 text-sm">
                  Edit Currency: {selectedCurrency.name} ({selectedCurrency.code})
                </h3>
                <button onClick={() => setSelectedCurrency(null)} className="text-neutral-400">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Exchange Rate (Units per 1 USD)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editRate}
                    onChange={(e) => setEditRate(Number(e.target.value))}
                    className="w-full border border-neutral-300 rounded-xl p-2.5 font-mono text-sm"
                  />
                  <div className="text-[10px] text-neutral-400 mt-1">
                    Previous valid rate: {selectedCurrency.previousRateVsUSD.toFixed(4)}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Agency Spread Margin (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editMargin}
                    onChange={(e) => setEditMargin(Number(e.target.value))}
                    className="w-full border border-neutral-300 rounded-xl p-2.5 font-mono text-sm"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="paystackSupport"
                    checked={editPaystackSupport}
                    onChange={(e) => setEditPaystackSupport(e.target.checked)}
                    className="w-4 h-4 accent-neutral-950 rounded"
                  />
                  <label htmlFor="paystackSupport" className="font-semibold text-neutral-800">
                    Native Paystack Checkout Enabled
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedCurrency(null)}
                  className="px-3 py-1.5 text-xs text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await api.adminUpdateCurrency(selectedCurrency.code, {
                      rateVsUSD: editRate || selectedCurrency.rateVsUSD,
                      marginPercent: editMargin !== undefined ? editMargin : selectedCurrency.marginPercent,
                      supportedForPayment: editPaystackSupport
                    });
                    setSelectedCurrency(null);
                    onRefreshAll();
                  }}
                  className="px-4 py-2 bg-neutral-950 text-white rounded-xl text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gmail API Send Confirmation Modal (Mandatory explicit user confirmation) */}
        {gmailConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-neutral-200 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-neutral-950 text-sm">
                    Confirm Gmail Dispatch
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setGmailConfirmOpen(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs text-neutral-600">
                <p>
                  You are about to send a real email using your connected Gmail account (<strong>{firebaseUserEmail}</strong>):
                </p>
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1 font-mono text-[11px] text-neutral-800">
                  <div><strong>To:</strong> {previewRecipientEmail}</div>
                  <div><strong>Subject:</strong> {liveEmailPreview.subject}</div>
                  <div><strong>Brand:</strong> {brandingForm.siteShortName}</div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGmailConfirmOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSendingGmail}
                  onClick={async () => {
                    setIsSendingGmail(true);
                    try {
                      const res = await sendEmailViaGmail({
                        toEmail: previewRecipientEmail.trim(),
                        subject: liveEmailPreview.subject,
                        htmlBody: liveEmailPreview.htmlContent,
                        fromName: brandingForm.siteShortName,
                        fromEmail: firebaseUserEmail || undefined
                      });
                      setGmailConfirmOpen(false);
                      showAdminNotice(`Email dispatched via Gmail API! Message ID: ${res.id}`);
                    } catch (err: any) {
                      showAdminNotice(err?.message || 'Gmail API dispatch failed.', 'error');
                    } finally {
                      setIsSendingGmail(false);
                    }
                  }}
                  className="px-5 py-2 bg-neutral-950 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 cursor-pointer disabled:opacity-50"
                >
                  {isSendingGmail ? 'Sending via Gmail...' : 'Confirm & Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
