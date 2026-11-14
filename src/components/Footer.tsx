import React from 'react';
import { AdvertisingPackage, FooterConfig, SiteBranding, UserAccount } from '../types/index.ts';
import { ShieldCheck, Mail, Phone, MapPin, Globe } from 'lucide-react';

interface FooterProps {
  footerConfig: FooterConfig;
  branding: SiteBranding;
  currentUser: UserAccount | null;
  packages?: AdvertisingPackage[];
  onChangeView: (view: 'home' | 'portal' | 'admin' | 'auth') => void;
  onOpenCampaignBuilder: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  footerConfig,
  branding,
  currentUser,
  packages,
  onChangeView
}) => {
  return (
    <footer className="bg-neutral-950 text-neutral-400 text-xs border-t border-neutral-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-neutral-800/80">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5 text-white font-extrabold text-base">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.siteShortName}
                  className="w-7 h-7 rounded-lg object-contain bg-white p-0.5"
                />
              ) : (
                <span className="w-7 h-7 rounded-lg bg-white text-neutral-950 flex items-center justify-center font-bold text-xs tracking-tighter">
                  {branding.logoBadgeText || 'AP'}
                </span>
              )}
              <span>{branding.siteShortName || 'AdPulse Global'}</span>
            </div>

            <p className="text-neutral-400 text-xs leading-relaxed max-w-sm">
              {footerConfig.aboutText || 'International Meta advertising agency providing automated campaign pricing, multi-currency settlement, and high-ROI Facebook & Instagram performance marketing.'}
            </p>

            <div className="flex items-center gap-2 text-neutral-300 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Paystack Merchant Security (PCI-DSS)</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Advertising Packages
            </div>
            <ul className="space-y-2">
              {(packages && packages.length > 0
                ? packages
                : [
                    { id: 'pkg-lite', tier: 'Quick Start Lite', durationDays: 2 },
                    { id: 'pkg-starter', tier: 'Starter Package', durationDays: 5 },
                    { id: 'pkg-standard', tier: 'Standard Package', durationDays: 7 },
                    { id: 'pkg-pro', tier: 'Pro Package', durationDays: 10 }
                  ]
              ).map((pkg) => (
                <li key={pkg.id}>
                  <a href="#packages" className="hover:text-white transition-colors">
                    {pkg.tier} ({pkg.durationDays} Days)
                  </a>
                </li>
              ))}
              <li>
                <a href="#checkout" className="hover:text-white transition-colors font-semibold text-emerald-400">
                  Instant Checkout & Pay
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Agency Access */}
          <div>
            <div className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Client & Desk Access
            </div>
            <ul className="space-y-2">
              {currentUser ? (
                <>
                  <li>
                    <button
                      onClick={() => onChangeView('portal')}
                      className="hover:text-white transition-colors text-left font-medium cursor-pointer"
                    >
                      Client Campaign Portal
                    </button>
                  </li>
                  {(currentUser.email.toLowerCase() === 'baffourgideon05@gmail.com' || currentUser.role === 'admin') && (
                    <li>
                      <button
                        onClick={() => onChangeView('admin')}
                        className="hover:text-blue-400 transition-colors text-left font-medium cursor-pointer"
                      >
                        Admin Control Dashboard
                      </button>
                    </li>
                  )}
                </>
              ) : (
                <li>
                  <button
                    onClick={() => onChangeView('auth')}
                    className="hover:text-white transition-colors text-left font-semibold text-white cursor-pointer"
                  >
                    Portal & Admin Sign In →
                  </button>
                </li>
              )}
              <li>
                <a href="#packages" className="hover:text-white transition-colors">
                  Choose Campaign Package
                </a>
              </li>
            </ul>
          </div>

          {/* Company Contact & Headquarters Details */}
          <div>
            <div className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Official Headquarters
            </div>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <a href={`mailto:${footerConfig.email}`} className="hover:text-white truncate">
                  {footerConfig.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <a href={`tel:${footerConfig.phone}`} className="hover:text-white">
                  {footerConfig.phone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                <span className="leading-snug text-neutral-400">
                  {footerConfig.address}
                </span>
              </li>
              <li className="flex items-center gap-2 pt-1 text-neutral-500 text-[11px]">
                <Globe className="w-3 h-3 text-neutral-500" />
                <span>{footerConfig.businessHours}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-500 text-[11px]">
          <div>
            {footerConfig.copyrightNotice || `© ${new Date().getFullYear()} ${branding.siteShortName || 'AdPulse Global'} Agency Network. All rights reserved.`}
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-neutral-400 cursor-pointer">Terms of Service</span>
            <span>·</span>
            <span className="hover:text-neutral-400 cursor-pointer">Privacy & Data Security</span>
            <span>·</span>
            <span className="hover:text-neutral-400 cursor-pointer">Meta Advertising Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
