import React from 'react';
import { ArrowRight, MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import { AdvertisingPackage, Currency, WebsiteContent } from '../types/index.ts';
import heroAgencyImg from '../assets/images/hero_advertising_agency_1793249155582.jpg';

interface HeroSectionProps {
  headline?: string;
  subheadline?: string;
  content?: WebsiteContent;
  packages?: AdvertisingPackage[];
  currentCurrency?: Currency;
  onStartCampaign: () => void;
  onExploreServices?: () => void;
  onOpenCalculator?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  headline,
  subheadline,
  content,
  packages,
  currentCurrency,
  onStartCampaign,
  onOpenCalculator
}) => {
  const formatMiniPrice = (pkg: AdvertisingPackage) => {
    if (!currentCurrency || (currentCurrency.code === 'GHS' && pkg.priceGHS)) {
      return `GH₵ ${(pkg.priceGHS || 0).toLocaleString()}`;
    }
    const totalUSD = pkg.advertisingBudgetUSD + pkg.managementFeeUSD;
    const effectiveRate = currentCurrency.rateVsUSD * (1 + (currentCurrency.marginPercent || 0) / 100);
    const converted = totalUSD * effectiveRate;
    return `${currentCurrency.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: currentCurrency.precision,
      maximumFractionDigits: currentCurrency.precision
    })}`;
  };

  const quickTiers =
    packages && packages.length > 0
      ? packages
      : [
          { id: 'pkg-lite', tier: 'LITE', priceGHS: 100, expectedMessages: '20-40 WhatsApp Messages', isPopular: false } as any,
          { id: 'pkg-starter', tier: 'STARTER', priceGHS: 250, expectedMessages: '50-100 WhatsApp Messages', isPopular: false } as any,
          { id: 'pkg-standard', tier: 'STANDARD', priceGHS: 450, expectedMessages: '70-140 WhatsApp Messages ★', isPopular: true } as any,
          { id: 'pkg-pro', tier: 'PRO', priceGHS: 650, expectedMessages: '100-200 WhatsApp Messages', isPopular: false } as any
        ];

  return (
    <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-neutral-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Split Grid: Headline & Visual Anchor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Proposition */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 font-bold">
                {content?.heroBadgeText || 'Done-For-You Ads'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{content?.heroBadgeSubtext || 'Facebook & Instagram · Direct WhatsApp Buyers'}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-950 tracking-tight leading-[1.1] [text-wrap:balance]">
              {content?.headline || headline || 'FACEBOOK ADS - DONE FOR YOU'}
            </h1>

            <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-2xl font-medium">
              {content?.subheadline || subheadline || 'Hello boss, I will handle everything to bring you customers on WhatsApp. You just pay once.'}
            </p>

            {/* Quick Package Tiers Overview (Only Total Price) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {quickTiers.map((tierPkg: AdvertisingPackage) => {
                const isPop = Boolean(tierPkg.isPopular);
                return (
                  <div
                    key={tierPkg.id}
                    className={`p-3 rounded-xl border text-xs ${
                      isPop
                        ? 'bg-neutral-900 text-white border-neutral-800 shadow-xs'
                        : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className={`font-bold ${isPop ? 'text-emerald-400' : 'text-neutral-900'}`}>
                      {tierPkg.tier.toUpperCase()} · {formatMiniPrice(tierPkg)}
                    </div>
                    <div className={`text-[11px] mt-0.5 leading-snug ${isPop ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {tierPkg.expectedMessages?.replace(' Expected', '') || `${tierPkg.durationDays} Days`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clean Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onStartCampaign}
                className="px-6 py-3.5 text-sm font-semibold text-white bg-neutral-950 rounded-xl hover:bg-neutral-800 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{content?.heroPrimaryCta || 'Choose Your Package'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {onOpenCalculator && (
                <button
                  type="button"
                  onClick={onOpenCalculator}
                  className="px-5 py-3.5 text-sm font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>{content?.heroSecondaryCta || 'Go to Instant Checkout'}</span>
                </button>
              )}
            </div>

            {/* Trust Signals */}
            <div className="pt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-500 border-t border-neutral-100">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Paystack Verified Payments</span>
              </div>
              <span aria-hidden="true">·</span>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-neutral-800" />
                <span>24-Hour Ad Launch</span>
              </div>
              <span aria-hidden="true">·</span>
              <span>One-Time Total Price</span>
            </div>
          </div>

          {/* Right Column: Visual Focal Carrier */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 shadow-xl group">
              <img
                src={heroAgencyImg}
                alt="Done-For-You Meta Advertising Operations"
                className="w-full h-[380px] lg:h-[460px] object-cover transition-transform duration-700 group-hover:scale-102"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/85 via-neutral-950/25 to-transparent flex flex-col justify-end p-6 text-white">
                <span className="text-xs font-mono tracking-wider uppercase text-emerald-400">
                  {content?.heroVisualEyebrow || 'Done-For-You WhatsApp Ads'}
                </span>
                <p className="text-lg font-bold mt-1">
                  {content?.heroVisualTitle || 'Real Customers Messaging Your WhatsApp Daily'}
                </p>
                <p className="text-xs text-neutral-300 mt-1">
                  {content?.heroVisualSubtitle || 'Pick a package, drop your WhatsApp number, and pay once. We handle targeting, designs, and launch.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column KPI Strip */}
        <div className="mt-16 pt-8 border-t border-neutral-200 grid grid-cols-2 md:grid-cols-4 gap-6">
          {(content?.heroKpis && content.heroKpis.length > 0
            ? content.heroKpis
            : [
                { value: '50–200+', label: 'WhatsApp Buyer Inquiries', sublabel: 'Expected direct chats depending on selected tier' },
                { value: '1x Pay', label: 'All-Inclusive Total Price', sublabel: 'Pay once with zero extra setup charges or surprises' },
                { value: 'Paystack', label: 'MoMo & Card Checkout', sublabel: 'MTN MoMo, Telecel Cash, AT Money, Cards, GHS, NGN, USD' },
                { value: '24h', label: 'Fast Campaign Launch', sublabel: 'Ad design, audience targeting, and live launch handled for you' }
              ]
          ).map((kpi, idx) => (
            <div key={idx}>
              <div className="text-3xl font-extrabold text-neutral-950 font-mono tabular-nums tracking-tight">
                {kpi.value}
              </div>
              <div className="text-xs font-semibold text-neutral-900 mt-1">
                {kpi.label}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {kpi.sublabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
