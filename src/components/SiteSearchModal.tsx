import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AdvertisingPackage,
  Currency,
  CurrencyCode,
  WebsiteFaqItem
} from '../types/index.ts';
import { Search, X, ArrowRight, Package, HelpCircle, Globe, Sparkles, Check } from 'lucide-react';

interface SiteSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages: AdvertisingPackage[];
  faqs: WebsiteFaqItem[];
  currencies: Currency[];
  currentCurrency: Currency;
  onSelectPackage: (pkg: AdvertisingPackage) => void;
  onSelectCurrency: (code: CurrencyCode) => void;
  onJumpToFaq: (faqIndex: number) => void;
}

export const SiteSearchModal: React.FC<SiteSearchModalProps> = ({
  isOpen,
  onClose,
  packages,
  faqs,
  currencies,
  currentCurrency,
  onSelectPackage,
  onSelectCurrency,
  onJumpToFaq
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    const matchText = (haystack: string) => {
      if (tokens.length === 0) return true;
      const lower = haystack.toLowerCase();
      return tokens.every((t) => lower.includes(t));
    };

    const matchedPackages = packages.filter((pkg) => {
      const priceText = formatTotalPrice(pkg);
      const blob = [
        pkg.name,
        pkg.tier,
        pkg.recommendedFor,
        pkg.expectedMessages || '',
        `${pkg.durationDays} days`,
        priceText,
        String(pkg.priceGHS || ''),
        ...(pkg.includedServices || [])
      ].join(' ');
      return matchText(blob);
    });

    const matchedFaqs = faqs
      .map((faq, idx) => ({ faq, idx }))
      .filter(({ faq }) => matchText(`${faq.question} ${faq.answer} ${faq.category || ''}`));

    const matchedCurrencies = q
      ? currencies.filter((c) => matchText(`${c.code} ${c.name} ${c.symbol}`))
      : [];

    return { matchedPackages, matchedFaqs, matchedCurrencies };
  }, [query, packages, faqs, currencies, currentCurrency]);

  if (!isOpen) return null;

  const totalMatches =
    results.matchedPackages.length + results.matchedFaqs.length + results.matchedCurrencies.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-start justify-center p-4 sm:pt-20 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search packages and answers"
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-200 bg-neutral-50/70">
          <Search className="w-5 h-5 text-neutral-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search packages (e.g. 100 cedis, 2 days, WhatsApp, Pro), FAQs, or currency..."
            className="w-full bg-transparent text-sm text-neutral-950 placeholder:text-neutral-400 focus:outline-hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 px-2 py-1 rounded-md hover:bg-neutral-200/70"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-950 rounded-lg hover:bg-neutral-200/60"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results Body */}
        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-5">
          {totalMatches === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-neutral-300 mx-auto" />
              <div className="text-sm font-bold text-neutral-800">No matches found for &ldquo;{query}&rdquo;</div>
              <p className="text-xs text-neutral-500">
                Try searching for &ldquo;Lite&rdquo;, &ldquo;100&rdquo;, &ldquo;WhatsApp&rdquo;, &ldquo;MoMo&rdquo;, or &ldquo;Pro&rdquo;.
              </p>
            </div>
          ) : (
            <>
              {/* Matching Packages */}
              {results.matchedPackages.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span>Done-For-You Packages ({results.matchedPackages.length})</span>
                  </div>
                  <div className="space-y-2">
                    {results.matchedPackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => {
                          onSelectPackage(pkg);
                          onClose();
                        }}
                        className="w-full text-left p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-950 hover:bg-neutral-50 transition-all flex items-center justify-between gap-4 group cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-neutral-950">{pkg.name}</span>
                            {pkg.isPopular && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                MOST POPULAR
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-600 mt-0.5 line-clamp-1">
                            {pkg.durationDays} Days Campaign · {pkg.expectedMessages || pkg.recommendedFor}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-base font-black font-mono text-neutral-950">
                            {formatTotalPrice(pkg)}
                          </span>
                          <span className="w-7 h-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching FAQs */}
              {results.matchedFaqs.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Frequently Asked Questions ({results.matchedFaqs.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.matchedFaqs.map(({ faq, idx }) => (
                      <button
                        key={faq.id || idx}
                        type="button"
                        onClick={() => {
                          onJumpToFaq(idx);
                          onClose();
                        }}
                        className="w-full text-left p-3 rounded-xl border border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        <div className="text-xs font-bold text-neutral-900">{faq.question}</div>
                        <div className="text-[11px] text-neutral-500 mt-1 line-clamp-2">{faq.answer}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Currencies */}
              {results.matchedCurrencies.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Switch Display Currency</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {results.matchedCurrencies.map((curr) => (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => {
                          onSelectCurrency(curr.code);
                          onClose();
                        }}
                        className="p-2.5 rounded-xl border border-neutral-200 hover:border-neutral-950 text-left flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span>
                          <strong className="font-mono text-neutral-950">{curr.code}</strong>{' '}
                          <span className="text-neutral-500">{curr.symbol}</span>
                        </span>
                        {curr.code === currentCurrency.code && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded font-mono text-[10px]">Esc</kbd> to close</span>
          <span>Click any package to jump straight to instant checkout</span>
        </div>
      </div>
    </div>
  );
};
