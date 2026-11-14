import React, { useState } from 'react';
import { AdvertisingPackage, Currency, Order, CampaignBrief, WebsiteContent } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  MessageSquare,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface CheckoutSectionProps {
  packages: AdvertisingPackage[];
  currentCurrency: Currency;
  selectedPackage: AdvertisingPackage;
  onSelectPackage: (pkg: AdvertisingPackage) => void;
  onOrderSuccess: (order: Order) => void;
  initialCustomerEmail?: string;
  paystackPublicKey?: string;
  content?: WebsiteContent;
}

function loadPaystackV2Script(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).PaystackPop) {
      resolve((window as any).PaystackPop);
      return;
    }
    const existing = document.querySelector('script[src*="js.paystack.co"]');
    if (existing) {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if ((window as any).PaystackPop) {
          clearInterval(timer);
          resolve((window as any).PaystackPop);
        } else if (attempts > 25) {
          clearInterval(timer);
          reject(new Error('Paystack payment library timed out loading.'));
        }
      }, 200);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).PaystackPop) resolve((window as any).PaystackPop);
      else reject(new Error('PaystackPop unavailable after script load.'));
    };
    script.onerror = () => reject(new Error('Failed to load Paystack checkout script.'));
    document.head.appendChild(script);
  });
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  packages,
  currentCurrency,
  selectedPackage,
  onSelectPackage,
  onOrderSuccess,
  initialCustomerEmail = '',
  paystackPublicKey = 'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b',
  content
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail);
  const [businessName, setBusinessName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Format only total price (zero fee talk)
  const formatTotalPrice = (pkg: AdvertisingPackage) => {
    if (currentCurrency.code === 'GHS' && pkg.priceGHS) {
      return `GH₵ ${pkg.priceGHS.toLocaleString()}`;
    }
    const totalUSD = pkg.advertisingBudgetUSD + pkg.managementFeeUSD;
    const margin = currentCurrency.marginPercent || 0;
    const effectiveRate = currentCurrency.rateVsUSD * (1 + margin / 100);
    const converted = totalUSD * effectiveRate;
    return `${currentCurrency.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: currentCurrency.precision,
      maximumFractionDigits: currentCurrency.precision
    })}`;
  };

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      setErrorMessage('Please provide your Name, WhatsApp Phone Number, and Email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
      const brief: CampaignBrief = {
        businessName: businessName.trim() || customerName.trim(),
        platform: 'both',
        objective: 'WhatsApp Conversations',
        targetLocations: 'Ghana (Accra, Kumasi & nationwide)',
        targetAge: '20 - 55',
        targetInterests: 'Interested buyers and shoppers',
        headline: `Special Offer - ${businessName || customerName}`,
        primaryText: 'Connect directly on WhatsApp to order or inquire today.',
        callToAction: 'Send WhatsApp Message',
        destinationUrl: cleanPhone ? `https://wa.me/${cleanPhone}` : 'https://wa.me/',
        specialInstructions: `Done For You ${selectedPackage.name}. WhatsApp number for messages: ${customerPhone}`
      };

      // 1. Create pending order on server with authoritative total
      const order = await api.createOrder({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        serviceId: selectedPackage.serviceId,
        packageId: selectedPackage.id,
        fundingArrangement: 'COMBINED',
        targetCurrency: currentCurrency.code,
        campaignBrief: brief
      });

      // 2. Initialize real live Paystack transaction on server (returns access_code & authorization_url)
      const paystackTx = await api.initializePaystack(order.id);
      if (!paystackTx || !paystackTx.reference) {
        throw new Error('Could not initialize live Paystack transaction.');
      }

      const activePaystackKey =
        paystackPublicKey ||
        (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY ||
        'pk_live_93621f2292fc2f1396ddc18fea182881a6f55e1b';

      // Helper called by standard synchronous Paystack callbacks
      const verifyCompletedTransaction = (verifiedRef: string) => {
        api
          .verifyPaystack(verifiedRef, order.id)
          .then((res) => {
            if (res && res.verified) {
              onOrderSuccess(res.order || order);
            } else {
              setErrorMessage('Payment could not be verified. Please contact support if debited.');
            }
          })
          .catch((err: any) => {
            setErrorMessage(err?.message || 'Payment verification failed. Please retry.');
          })
          .finally(() => {
            setIsLoading(false);
          });
      };

      const PaystackPop = await loadPaystackV2Script().catch(() => (window as any).PaystackPop);

      // 3A. Paystack InlineJS v2 (constructor function: new PaystackPop())
      if (typeof PaystackPop === 'function') {
        const popup = new PaystackPop();

        if (paystackTx.access_code && typeof popup.resumeTransaction === 'function') {
          popup.resumeTransaction(paystackTx.access_code, {
            onSuccess: function (transaction: any) {
              verifyCompletedTransaction(transaction?.reference || paystackTx.reference);
            },
            onCancel: function () {
              setIsLoading(false);
            },
            onError: function (error: any) {
              setErrorMessage(error?.message || 'Paystack checkout encountered an error.');
              setIsLoading(false);
            }
          });
          return;
        }

        if (typeof popup.newTransaction === 'function') {
          popup.newTransaction({
            key: activePaystackKey,
            email: customerEmail.trim(),
            amount: paystackTx.amount || Math.round(order.paymentTotal * 100),
            currency: paystackTx.currency || order.paymentCurrency || 'GHS',
            reference: paystackTx.reference,
            metadata: {
              custom_fields: [
                { display_name: 'Package', variable_name: 'package', value: selectedPackage.name },
                { display_name: 'WhatsApp Number', variable_name: 'whatsapp', value: customerPhone.trim() }
              ]
            },
            onSuccess: function (transaction: any) {
              verifyCompletedTransaction(transaction?.reference || paystackTx.reference);
            },
            onCancel: function () {
              setIsLoading(false);
            },
            onError: function (error: any) {
              setErrorMessage(error?.message || 'Paystack payment failed.');
              setIsLoading(false);
            }
          });
          return;
        }
      }

      // 3B. Fallback if Paystack v1 script object is cached: MUST pass standard synchronous function (NOT async)
      if (PaystackPop && typeof PaystackPop.setup === 'function') {
        const inlineRef = `${paystackTx.reference}_v1_${Date.now()}`;
        const onPaystackCallback = function (response: any) {
          verifyCompletedTransaction(response?.reference || inlineRef);
        };
        const onPaystackClose = function () {
          setIsLoading(false);
        };

        const handler = PaystackPop.setup({
          key: activePaystackKey,
          email: customerEmail.trim(),
          amount: paystackTx.amount || Math.round(order.paymentTotal * 100),
          currency: paystackTx.currency || order.paymentCurrency || 'GHS',
          ref: inlineRef,
          metadata: {
            orderId: order.id,
            custom_fields: [
              { display_name: 'Package', variable_name: 'package', value: selectedPackage.name },
              { display_name: 'WhatsApp Number', variable_name: 'whatsapp', value: customerPhone.trim() }
            ]
          },
          callback: onPaystackCallback,
          onClose: onPaystackClose
        });
        handler.openIframe();
        return;
      }

      // 3C. Hosted Paystack Checkout URL fallback (real live payment page)
      if (paystackTx.authorization_url && paystackTx.authorization_url.startsWith('https://')) {
        window.location.href = paystackTx.authorization_url;
        return;
      }

      throw new Error('Unable to launch Paystack payment window. Please check your internet connection and try again.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to proceed with Paystack checkout. Please verify your inputs.');
      setIsLoading(false);
    }
  };

  return (
    <section id="checkout" className="py-16 sm:py-24 bg-white border-b border-neutral-200 scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono">
            {content?.checkoutSectionEyebrow || 'SECTION 3 · INSTANT ORDER'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight mt-1">
            {content?.checkoutSectionTitle || 'Complete Your Order & Launch Today'}
          </h2>
          <p className="text-neutral-600 mt-2 text-sm sm:text-base">
            {content?.checkoutSectionSubtitle || 'Select your package, enter your WhatsApp number, and pay once. We handle all the ad work for you.'}
          </p>
        </div>

        <div className="bg-neutral-50 rounded-3xl border border-neutral-200 shadow-xl overflow-hidden">
          {/* Step 1: Package Selector Switcher */}
          <div className="p-6 sm:p-8 bg-neutral-900 text-white border-b border-neutral-800">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Selected Package (Click to switch):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {packages.map((pkg) => {
                const isSelected = selectedPackage.id === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => onSelectPackage(pkg)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-neutral-950 border-white shadow-md font-bold ring-2 ring-emerald-500'
                        : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{pkg.name}</div>
                    <div className={`text-lg font-black font-mono mt-1 ${isSelected ? 'text-neutral-950' : 'text-emerald-400'}`}>
                      {formatTotalPrice(pkg)}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {pkg.durationDays} Days · {pkg.expectedMessages?.replace('Expected', '') || ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: What You Get Summary */}
          <div className="p-6 sm:p-8 bg-emerald-50/70 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                What you are getting:
              </div>
              <div className="text-sm font-extrabold text-neutral-950">
                {selectedPackage.name} · {selectedPackage.durationDays} Days Active Delivery
              </div>
              {selectedPackage.expectedMessages && (
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>{selectedPackage.expectedMessages} directly to your WhatsApp</span>
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-xs font-semibold text-neutral-500">Total Price:</div>
              <div className="text-3xl font-black text-neutral-950 font-mono tracking-tight tabular-nums">
                {formatTotalPrice(selectedPackage)}
              </div>
            </div>
          </div>

          {/* Step 3: Customer Information Form */}
          <form onSubmit={handlePayNow} className="p-6 sm:p-8 space-y-5">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Samuel K. Mensah"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-950 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Phone / WhatsApp Number for Customers to Message *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +233 24 123 4567"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-950 font-mono font-medium"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  All customer chats will be delivered straight to this number.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Your Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-950 font-medium"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Receipt and campaign login details will be sent here.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Business / Brand Name (Optional)
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Accra Shoes Hub"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-950 font-medium"
                />
              </div>
            </div>

            {/* Pay Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-3 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Opening Live Paystack Checkout...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>Pay {formatTotalPrice(selectedPackage)} &amp; Launch Campaign</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Trust and Payment Security */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-neutral-500 text-xs border-t border-neutral-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Paystack Verified: Mobile Money (MTN, Telecel, AT) &amp; Cards</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span>100% Secure Checkout · Instant Receipt</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
