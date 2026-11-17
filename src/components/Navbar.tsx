import React, { useState } from 'react';
import { CurrencyCode, Currency, UserAccount, SiteBranding } from '../types/index.ts';
import { Globe, Shield, Menu, X, ArrowRight, LogIn, LogOut, Search } from 'lucide-react';

interface NavbarProps {
  currentCurrency: CurrencyCode;
  currencies: Currency[];
  onSelectCurrency: (code: CurrencyCode) => void;
  activeView: 'home' | 'portal' | 'admin' | 'auth';
  onChangeView: (view: 'home' | 'portal' | 'admin' | 'auth') => void;
  onOpenCampaignBuilder: () => void;
  onOpenSearch: () => void;
  currentUser: UserAccount | null;
  onLogout: () => void;
  branding: SiteBranding;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCurrency,
  currencies,
  onSelectCurrency,
  activeView,
  onChangeView,
  onOpenCampaignBuilder,
  onOpenSearch,
  currentUser,
  onLogout,
  branding
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  const selectedCurr = currencies.find(c => c.code === currentCurrency) || currencies[0];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-18">
          {/* Zone 1: Brand wordmark & logo */}
          <button
            onClick={() => onChangeView('home')}
            className="text-xl font-extrabold tracking-tight text-neutral-950 whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity flex items-center gap-2.5 text-left"
          >
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.siteShortName}
                className="w-8 h-8 rounded-lg object-contain"
              />
            ) : (
              <span className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-bold text-xs tracking-tighter">
                {branding.logoBadgeText || 'AP'}
              </span>
            )}
            <span>{branding.siteShortName || 'AdPulse Global'}</span>
          </button>

          {/* Zone 2: Navigation Links (Clean: Packages, Checkout, FAQ) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
            {activeView === 'home' ? (
              <>
                <a href="#packages" className="hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0">
                  Packages & Prices
                </a>
                <a href="#checkout" className="hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0 font-semibold text-neutral-900">
                  Order / Checkout
                </a>
                <a href="#faq" className="hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0">
                  FAQ
                </a>
              </>
            ) : (
              <button
                onClick={() => onChangeView('home')}
                className="hover:text-neutral-950 transition-colors whitespace-nowrap shrink-0 font-medium cursor-pointer"
              >
                ← Return to Agency Homepage
              </button>
            )}
          </nav>

          {/* Zone 3: Search + Currency Selector + Auth State + Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Smart Site Search Trigger */}
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              title="Search packages & FAQs (Ctrl+K)"
              aria-label="Search packages and FAQs"
            >
              <Search className="w-3.5 h-3.5 text-neutral-600" />
              <span className="hidden xl:inline">Search</span>
              <kbd className="hidden xl:inline text-[10px] font-mono text-neutral-400 bg-white px-1 py-0.5 rounded border border-neutral-200">
                Ctrl+K
              </kbd>
            </button>

            {/* Currency Selector */}
            <div className="relative">
              <button
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap"
                title="Select Display Currency"
              >
                <Globe className="w-3.5 h-3.5 text-neutral-500" />
                <span>{selectedCurr ? `${selectedCurr.code} (${selectedCurr.symbol})` : 'USD ($)'}</span>
              </button>

              {currencyDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-neutral-100 text-[11px] font-medium text-neutral-400">
                    SELECT CURRENCY (BASE USD)
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {currencies.map(curr => (
                      <button
                        key={curr.code}
                        onClick={() => {
                          onSelectCurrency(curr.code);
                          setCurrencyDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 transition-colors ${
                          curr.code === currentCurrency ? 'bg-neutral-100/70 font-semibold text-neutral-900' : 'text-neutral-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-neutral-900 w-9">{curr.code}</span>
                          <span className="text-neutral-500 truncate max-w-[90px]">{curr.name}</span>
                        </div>
                        <span className="font-mono text-neutral-400 text-[11px]">
                          {curr.symbol}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-1.5 mt-1 border-t border-neutral-100 text-[10px] text-neutral-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-600" />
                    <span>Paystack Secure Settlement</span>
                  </div>
                </div>
              )}
            </div>

            {/* User Account / Auth Toggle */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={currentUser.role === 'admin' ? () => onChangeView('admin') : () => onChangeView('portal')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold"
                  title={`Logged in as ${currentUser.name} (${currentUser.role})`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="max-w-[110px] truncate">{currentUser.name.split(' ')[0]}</span>
                  {currentUser.role === 'admin' && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-mono font-bold">
                      ADMIN
                    </span>
                  )}
                </button>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-lg"
                  title="Sign out of account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onChangeView('auth')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-neutral-700" />
                <span>Sign In</span>
              </button>
            )}

            {/* Primary Action Button */}
            <a
              href="#packages"
              className="hidden lg:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-950 rounded-lg hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              <span>Choose Package</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-in fade-in">
          <div className="space-y-1 pb-2 border-b border-neutral-100">
            <button
              onClick={() => {
                onChangeView('home');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-medium ${
                activeView === 'home' ? 'bg-neutral-100 text-neutral-950 font-bold' : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              Agency Website
            </button>

            {/* Authenticated Links on Mobile */}
            {currentUser ? (
              <>
                <button
                  onClick={() => {
                    onChangeView('portal');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-medium ${
                    activeView === 'portal' ? 'bg-neutral-100 text-neutral-950 font-bold' : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  My Campaigns Portal
                </button>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => {
                      onChangeView('admin');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg text-xs font-medium ${
                      activeView === 'admin' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    Admin Dashboard
                  </button>
                )}
              </>
            ) : null}

            <a
              href="#packages"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left p-2.5 rounded-lg text-xs font-bold bg-neutral-950 text-white"
            >
              Choose Package & Pay Now →
            </a>
          </div>

          <div className="pt-2 text-xs">
            {currentUser ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 block text-[11px]">Logged in as:</span>
                  <span className="font-bold text-neutral-900">{currentUser.name}</span>
                  {currentUser.role === 'admin' && (
                    <span className="ml-1.5 text-[10px] text-blue-600 font-mono font-bold">[ADMIN]</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-rose-600 font-bold px-3 py-1.5 rounded-lg bg-rose-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onChangeView('auth');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 px-4 rounded-xl bg-neutral-950 text-white font-bold"
              >
                Sign In to Account
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
