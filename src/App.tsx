/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CurrencyCode,
  Order,
  UserAccount
} from './types/index.ts';
import { api, PlatformConfigResponse } from './services/api.ts';
import { firebaseSignOutAll, testFirestoreConnection } from './firebase.ts';
import { Navbar } from './components/Navbar.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { PackagesSection } from './components/PackagesSection.tsx';
import { CheckoutSection } from './components/CheckoutSection.tsx';
import { HowItWorksAndFaqSection } from './components/HowItWorksAndFaqSection.tsx';
import { CustomerPortal } from './components/CustomerPortal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AuthPage } from './components/AuthPage.tsx';
import { Footer } from './components/Footer.tsx';
import { RefreshCw, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<PlatformConfigResponse>(() => api.getCachedOrFallbackConfig());
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const stored = localStorage.getItem('adpulse_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [authIntendedRole, setAuthIntendedRole] = useState<'admin' | 'customer'>('customer');

  // App View: 'home' | 'portal' | 'admin' | 'auth'
  const [activeView, setActiveView] = useState<'home' | 'portal' | 'admin' | 'auth'>('home');
  const [currentCurrencyCode, setCurrentCurrencyCode] = useState<CurrencyCode>('GHS');
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  // Flash Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const loadData = async (isRetry = false) => {
    try {
      const [cfg, ords] = await Promise.all([
        api.getConfig(),
        api.getOrders()
      ]);
      setConfig(cfg);
      setOrders(ords);
      setLoadError(null);

      // Dynamically sync browser tab title, meta description & OG tags with configured site branding
      if (cfg.branding?.siteTitle) {
        document.title = cfg.branding.siteTitle;
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', cfg.branding.siteTitle);
      }
      if (cfg.content?.metaDescription) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', cfg.content.metaDescription);
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', cfg.content.metaDescription);
      }
    } catch (err: any) {
      console.warn('LoadData notice:', err);
      if (!isRetry) {
        setTimeout(() => loadData(true), 1200);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    testFirestoreConnection().catch(() => {});

    // Verify Paystack redirect callback if user returned from hosted checkout.paystack.com
    const params = new URLSearchParams(window.location.search);
    const returnedRef = params.get('reference') || params.get('trxref');
    const returnedOrderId = params.get('orderId') || undefined;
    if (returnedRef) {
      api
        .verifyPaystack(returnedRef, returnedOrderId)
        .then((res) => {
          if (res?.verified && res.order) {
            showNotification(`Payment verified! Order #${res.order.id} is paid and queued for launch.`);
            loadData();
          }
        })
        .catch(() => {})
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }

    // Periodic background sync of exchange rates and orders
    const interval = setInterval(() => {
      loadData(true);
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAuthSuccess = (user: UserAccount, targetView?: 'home' | 'portal' | 'admin') => {
    setCurrentUser(user);
    try {
      localStorage.setItem('adpulse_auth_user', JSON.stringify(user));
    } catch {}

    const isAdmin = user.email.toLowerCase() === 'baffourgideon05@gmail.com' || user.role === 'admin';
    const destination = targetView || (isAdmin ? 'admin' : 'portal');
    setActiveView(destination);
    showNotification(`Welcome back, ${user.name}!`);
    loadData();
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('adpulse_auth_user');
    } catch {}
    await firebaseSignOutAll();
    setActiveView('home');
    showNotification('You have been logged out.');
  };

  const handleChangeView = (view: 'home' | 'portal' | 'admin' | 'auth') => {
    if (view === 'admin') {
      if (!currentUser) {
        setAuthIntendedRole('admin');
        setActiveView('auth');
        return;
      }
      const isAdmin = currentUser.email.toLowerCase() === 'baffourgideon05@gmail.com' || currentUser.role === 'admin';
      if (!isAdmin) {
        showNotification(
          `Access Restricted: ${currentUser.email} is a Client account. Sign in with your Administrator account to access Admin Suite.`,
          'info'
        );
        setAuthIntendedRole('admin');
        setActiveView('auth');
        return;
      }
    }

    if (view === 'portal') {
      if (!currentUser) {
        setAuthIntendedRole('customer');
        setActiveView('auth');
        return;
      }
    }

    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-bold text-sm tracking-tighter">
            AP
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
            <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
            <span>Initializing AdPulse Platform Engine...</span>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !config) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm max-w-md w-full text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">Service Initialization Error</h2>
          <p className="text-xs text-neutral-500">{loadError}</p>
          <button
            onClick={() => {
              setIsLoading(true);
              setLoadError(null);
              loadData();
            }}
            className="px-4 py-2 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const selectedCurrency = config.currencies.find(c => c.code === currentCurrencyCode) || config.currencies[0];

  const handleOrderSuccess = (order: Order) => {
    setActiveView('portal');
    showNotification(`Payment verified! Order #${order.id} is now registered in your campaign portal.`);
    loadData();
  };

  // Recent Auto Rate Detection Alert
  const latestDetection = config.autoRateEngine?.autoLogs?.[0];

  const activePackage = (config.packages || []).find(p => p.id === selectedPackageId) ||
    (config.packages && config.packages.length > 1 ? config.packages[1] : config.packages[0]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      {/* Flash Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-neutral-950 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Auto-Detection Live Ticker Banner */}
      {latestDetection && (
        <div className="bg-neutral-900 text-neutral-300 px-4 py-1.5 text-[11px] font-mono flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              FX Market Pulse: <strong>{latestDetection.currency}/USD</strong> rate updated to <strong>{latestDetection.currentRate.toFixed(4)}</strong> ({latestDetection.direction} {latestDetection.percentageChange > 0 ? `+${latestDetection.percentageChange}%` : `${latestDetection.percentageChange}%`})
            </span>
          </div>
          <span className="text-neutral-500 hidden sm:inline">
            Auto-Detection Engine Active · {new Date(latestDetection.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Top Bar Header */}
      <Navbar
        currentCurrency={currentCurrencyCode}
        currencies={config.currencies}
        onSelectCurrency={(code) => setCurrentCurrencyCode(code)}
        activeView={activeView}
        onChangeView={handleChangeView}
        onOpenCampaignBuilder={() => {
          const el = document.getElementById('packages');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        branding={config.branding}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {/* PUBLIC HOME VIEW: Pure 3-Section Flow (Headline -> Packages -> Checkout) */}
        {activeView === 'home' && (
          <>
            {/* Section 1: Headline */}
            <HeroSection
              headline={config.content.headline}
              subheadline={config.content.subheadline}
              content={config.content}
              packages={config.packages}
              currentCurrency={selectedCurrency}
              onStartCampaign={() => {
                const el = document.getElementById('packages');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onOpenCalculator={() => {
                const el = document.getElementById('checkout');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Section 2: Packages (Only Total Price & What's inside) */}
            <PackagesSection
              packages={config.packages}
              currentCurrency={selectedCurrency}
              selectedPackageId={activePackage?.id}
              content={config.content}
              onSelectPackage={(pkg) => {
                setSelectedPackageId(pkg.id);
                const el = document.getElementById('checkout');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Section 3: Instant Checkout (Name, WhatsApp, Email, Package, Pay) */}
            {activePackage && (
              <CheckoutSection
                packages={config.packages}
                currentCurrency={selectedCurrency}
                selectedPackage={activePackage}
                onSelectPackage={(pkg) => setSelectedPackageId(pkg.id)}
                onOrderSuccess={handleOrderSuccess}
                initialCustomerEmail={currentUser?.email || ''}
                paystackPublicKey={config.paystackPublicKey}
                content={config.content}
              />
            )}

            <HowItWorksAndFaqSection content={config.content} />
          </>
        )}

        {/* AUTHENTICATION PAGE (Single Page for Client and Admin) */}
        {activeView === 'auth' && (
          <AuthPage
            branding={config.branding}
            currentUser={currentUser}
            onAuthSuccess={handleAuthSuccess}
            onNavigateHome={() => setActiveView('home')}
            intendedTarget={authIntendedRole === 'admin' ? 'admin' : 'portal'}
          />
        )}

        {/* CLIENT CAMPAIGN PORTAL (Protected: Accessible only after authentication) */}
        {activeView === 'portal' && (
          currentUser ? (
            <CustomerPortal
              orders={orders}
              customerEmail={currentUser.email}
              onSetCustomerEmail={() => {}}
              onRefreshOrders={loadData}
              onOpenNewCampaign={() => {
                setActiveView('home');
                setTimeout(() => {
                  document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              currentUser={currentUser}
              onNavigateAdmin={() => handleChangeView('admin')}
              branding={config.branding}
              currencies={config.allCurrencies}
            />
          ) : (
            <div className="min-h-[50vh] flex items-center justify-center p-4">
              <div className="text-center space-y-3 max-w-sm">
                <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto" />
                <h3 className="text-sm font-bold text-neutral-900">Sign In Required</h3>
                <p className="text-xs text-neutral-500">
                  Please sign in to access your campaign orders and performance metrics.
                </p>
                <button
                  onClick={() => {
                    setAuthIntendedRole('customer');
                    setActiveView('auth');
                  }}
                  className="px-4 py-2 bg-neutral-950 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Go to Sign In
                </button>
              </div>
            </div>
          )
        )}

        {/* ADMIN DASHBOARD (Protected: Accessible ONLY by authenticated Admin Gideon Baffour) */}
        {activeView === 'admin' && (
          (currentUser?.email.toLowerCase() === 'baffourgideon05@gmail.com' || currentUser?.role === 'admin') ? (
            <AdminDashboard
              currencies={config.allCurrencies}
              pricingConfig={config.pricingConfig}
              services={config.allServices}
              packages={config.allPackages}
              orders={orders}
              content={config.content}
              rateHistory={config.rateHistory}
              branding={config.branding}
              footerConfig={config.footerConfig}
              autoRateEngine={config.autoRateEngine}
              emailTemplates={config.emailTemplates}
              onRefreshAll={loadData}
            />
          ) : (
            <div className="min-h-[50vh] flex items-center justify-center p-4">
              <div className="text-center space-y-3 max-w-sm bg-rose-50 border border-rose-200 p-6 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                <h3 className="text-sm font-bold text-rose-900">Access Restricted</h3>
                <p className="text-xs text-rose-700">
                  The Admin Area is strictly restricted to the authorized administrator account ({config.branding.adminGoogleEmail || 'baffourgideon05@gmail.com'}).
                </p>
                <button
                  onClick={() => {
                    setAuthIntendedRole('admin');
                    setActiveView('auth');
                  }}
                  className="px-4 py-2 bg-neutral-950 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Sign In with Admin Account
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <Footer
        footerConfig={config.footerConfig}
        branding={config.branding}
        currentUser={currentUser}
        packages={config.packages}
        onChangeView={handleChangeView}
        onOpenCampaignBuilder={() => {
          const el = document.getElementById('packages');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  );
}
