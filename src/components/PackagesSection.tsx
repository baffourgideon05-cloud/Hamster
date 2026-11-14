import React from 'react';
import { AdvertisingPackage, Currency, WebsiteContent } from '../types/index.ts';
import { Check, ArrowRight, MessageSquare, Sparkles } from 'lucide-react';

interface PackagesSectionProps {
  packages: AdvertisingPackage[];
  currentCurrency: Currency;
  onSelectPackage: (pkg: AdvertisingPackage) => void;
  selectedPackageId?: string;
  content?: WebsiteContent;
}

export const PackagesSection: React.FC<PackagesSectionProps> = ({
  packages,
  currentCurrency,
  onSelectPackage,
  selectedPackageId,
  content
}) => {
  // Only display the single total price with zero fee/breakdown talk
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

  return (
    <section id="packages" className="py-16 sm:py-20 bg-neutral-50 border-b border-neutral-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section 1 / Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs font-bold uppercase tracking-wider mb-3">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
            <span>{content?.packagesSectionBadge || 'FACEBOOK ADS - DONE FOR YOU'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
            {content?.packagesSectionTitle || 'Choose Your Package & Get Started Today'}
          </h2>

          <p className="text-neutral-600 mt-3 text-base sm:text-lg font-medium">
            {content?.packagesSectionSubtitle || 'Hello boss, I will handle everything to bring you customers on WhatsApp. You just pay once.'}
          </p>
        </div>

        {/* Section 2: Packages (Only Total Price, Description, Select Button) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {packages.map((pkg) => {
            const isPopular = pkg.isPopular || pkg.name.toLowerCase().includes('popular') || pkg.tier === 'Standard';
            const isSelected = selectedPackageId === pkg.id;

            return (
              <div
                key={pkg.id}
                className={`rounded-2xl p-7 flex flex-col justify-between transition-all bg-white relative ${
                  isSelected
                    ? 'border-2 border-emerald-600 shadow-xl ring-4 ring-emerald-500/20'
                    : isPopular
                    ? 'border-2 border-neutral-950 shadow-lg ring-2 ring-neutral-950/5'
                    : 'border border-neutral-200 shadow-xs hover:border-neutral-300 hover:shadow-md'
                }`}
              >
                {/* Most Popular Tag */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-neutral-950 text-white px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-md">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>★ MOST POPULAR</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-mono">
                      {pkg.tier}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-900">
                      {pkg.durationDays} Days Campaign
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-neutral-950 mt-2">
                    {pkg.name}
                  </h3>

                  {/* Expected Messages Highlight */}
                  {pkg.expectedMessages && (
                    <div className="mt-3 py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-extrabold flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{pkg.expectedMessages}</span>
                    </div>
                  )}

                  <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
                    {pkg.recommendedFor}
                  </p>

                  {/* Price Box: ONLY TOTAL PRICE */}
                  <div className="mt-6 pt-5 border-t border-neutral-100">
                    <div className="text-3xl font-black text-neutral-950 font-mono tracking-tight tabular-nums">
                      {formatTotalPrice(pkg)}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1 font-medium">
                      Total all-inclusive price. Pay once, no hidden charges.
                    </div>
                  </div>

                  {/* What Dey Inside (Deliverables) */}
                  <div className="mt-6 space-y-2.5">
                    <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-mono">
                      What is included:
                    </div>
                    {pkg.includedServices.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-800">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 font-bold" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Select Button */}
                <div className="mt-8 pt-5 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => onSelectPackage(pkg)}
                    className={`w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : isPopular
                        ? 'bg-neutral-950 text-white hover:bg-neutral-800'
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    <span>Select This Package / Pay Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
