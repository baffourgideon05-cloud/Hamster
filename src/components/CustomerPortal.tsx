import React, { useState } from 'react';
import { Order, CampaignBrief, UserAccount, SiteBranding, Currency } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  ExternalLink,
  Printer,
  Plus,
  Send,
  Sparkles,
  Search
} from 'lucide-react';

interface CustomerPortalProps {
  orders: Order[];
  customerEmail: string;
  onSetCustomerEmail: (email: string) => void;
  onRefreshOrders: () => void;
  onOpenNewCampaign: () => void;
  currentUser?: UserAccount | null;
  onNavigateAdmin?: () => void;
  branding?: SiteBranding;
  currencies?: Currency[];
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  orders,
  customerEmail,
  onSetCustomerEmail,
  onRefreshOrders,
  onOpenNewCampaign,
  currentUser,
  onNavigateAdmin,
  branding,
  currencies
}) => {
  const isAdminUser = Boolean(
    currentUser && (
      currentUser.email.toLowerCase() === 'baffourgideon05@gmail.com' ||
      currentUser.role === 'admin'
    )
  );
  const filteredOrders = orders.filter(
    (o) => !customerEmail || o.customerEmail.toLowerCase() === customerEmail.toLowerCase()
  );

  // Zero demo numbers: compute strictly from verified PAID orders
  const ghsCurrency = (currencies || []).find((c) => c.code === 'GHS');
  const ghsEffectiveRate = ghsCurrency
    ? ghsCurrency.rateVsUSD * (1 + (ghsCurrency.marginPercent || 0) / 100)
    : 15.45;
  const paidOrders = filteredOrders.filter((o) => o.paymentStatus === 'PAID');
  const totalSpentGHS = paidOrders.reduce((sum, o) => {
    if (o.paymentCurrency === 'GHS') return sum + (o.paymentTotal || 0);
    return sum + (o.totalUSD || 0) * ghsEffectiveRate;
  }, 0);
  const activeFlightsCount = paidOrders.filter((o) => o.campaignStatus === 'LAUNCHED_ACTIVE').length;
  const pendingSetupCount = paidOrders.filter(
    (o) => o.campaignStatus !== 'LAUNCHED_ACTIVE' && o.campaignStatus !== 'COMPLETED'
  ).length;
  const [briefError, setBriefError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(filteredOrders[0] || null);
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [briefForm, setBriefForm] = useState<CampaignBrief | null>(null);
  const [isSavingBrief, setIsSavingBrief] = useState(false);
  const [printReceiptOrder, setPrintReceiptOrder] = useState<Order | null>(null);

  const currentOrder = selectedOrder || filteredOrders[0] || null;

  const handleStartEditBrief = (order: Order) => {
    setBriefForm({ ...order.campaignBrief });
    setIsEditingBrief(true);
  };

  const handleSaveBrief = async () => {
    if (!currentOrder || !briefForm) return;
    setIsSavingBrief(true);
    setBriefError(null);
    try {
      const updated = await api.updateOrderBrief(currentOrder.id, briefForm);
      setSelectedOrder(updated);
      setIsEditingBrief(false);
      onRefreshOrders();
    } catch (err: any) {
      setBriefError(err?.message || 'Failed to update campaign brief.');
    } finally {
      setIsSavingBrief(false);
    }
  };

  // Status step index
  const getStatusIndex = (status: string) => {
    switch (status) {
      case 'DRAFT': return 0;
      case 'SUBMITTED': return 1;
      case 'UNDER_REVIEW': return 2;
      case 'APPROVED': return 3;
      case 'LAUNCHED_ACTIVE': return 4;
      case 'COMPLETED': return 5;
      default: return 1;
    }
  };

  return (
    <div className="py-10 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Administrator Exclusive Access Bar (Only visible to Gideon Baffour) */}
        {isAdminUser && (
          <div className="mb-6 p-4 rounded-2xl bg-neutral-950 text-white border border-neutral-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs tracking-wider">
                ADM
              </span>
              <div>
                <div className="text-xs font-bold text-neutral-200">
                  Authorized Administrator Detected
                </div>
                <div className="text-[11px] text-neutral-400">
                  Signed in with master account: <strong className="text-white">{currentUser?.email}</strong>
                </div>
              </div>
            </div>
            {onNavigateAdmin && (
              <button
                type="button"
                onClick={onNavigateAdmin}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-950 text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>Launch Admin Control Center</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
          <div>
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Client Campaign Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight mt-1">
              Active Campaigns & Performance
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenNewCampaign}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-950 rounded-xl hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Launch New Campaign</span>
            </button>
          </div>
        </div>

        {/* Authenticated Account Indicator */}
        <div className="mt-6 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Authenticated campaigns for:</span>
            <strong className="font-mono text-neutral-950">{customerEmail}</strong>
          </div>

          <div className="text-xs text-neutral-500 font-mono">
            {paidOrders.length} PAID CAMPAIGN ORDERS ON RECORD
          </div>
        </div>

        {/* Client Account KPI Bar (Zero Until Verified Purchase) */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
            <div className="text-[11px] font-semibold text-neutral-500">Total Spent (GH₵)</div>
            <div className="text-xl font-extrabold font-mono text-neutral-950 tabular-nums mt-1">
              GH₵ {totalSpentGHS.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              Verified Paystack purchases
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
            <div className="text-[11px] font-semibold text-neutral-500">Paid Orders</div>
            <div className="text-xl font-extrabold font-mono text-emerald-600 tabular-nums mt-1">
              {paidOrders.length}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              Completed checkout orders
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
            <div className="text-[11px] font-semibold text-neutral-500">Active Campaigns</div>
            <div className="text-xl font-extrabold font-mono text-blue-600 tabular-nums mt-1">
              {activeFlightsCount}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              Currently delivering ads
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
            <div className="text-[11px] font-semibold text-neutral-500">Pending Setup</div>
            <div className="text-xl font-extrabold font-mono text-neutral-950 tabular-nums mt-1">
              {pendingSetupCount}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              Queued for launch
            </div>
          </div>
        </div>

        {briefError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{briefError}</span>
          </div>
        )}

        {/* Main 2-Column Split */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Orders List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
              Your Orders & Flights
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-neutral-200 text-center">
                <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-neutral-800">No campaigns found</h3>
                <p className="text-xs text-neutral-500 mt-1 mb-4">
                  No orders associated with {customerEmail} yet.
                </p>
                <button
                  onClick={onOpenNewCampaign}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-950 rounded-lg"
                >
                  Start First Campaign
                </button>
              </div>
            ) : (
              filteredOrders.map((ord) => {
                const isSelected = currentOrder?.id === ord.id;
                return (
                  <button
                    key={ord.id}
                    onClick={() => {
                      setSelectedOrder(ord);
                      setIsEditingBrief(false);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-white border-neutral-950 ring-1 ring-neutral-950 shadow-sm'
                        : 'bg-white border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-neutral-900">{ord.id}</span>
                      <span className={`text-[11px] font-semibold ${
                        ord.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {ord.paymentStatus}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-neutral-950 truncate">
                      {ord.campaignBrief.businessName || ord.serviceName}
                    </div>

                    <div className="text-xs text-neutral-500 mt-1 truncate">
                      {ord.serviceName}
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                      <span className="text-neutral-500">
                        Done For You Package
                      </span>
                      <span className="font-mono font-bold text-neutral-900">
                        {ord.paymentCurrency} {ord.paymentTotal.toLocaleString()}
                      </span>
                    </div>

                    {/* Status pill-free indicator */}
                    <div className="mt-2 text-[11px] font-medium text-neutral-600 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        ord.campaignStatus === 'LAUNCHED_ACTIVE' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`} />
                      <span>Status: {ord.campaignStatus.replace('_', ' ')}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Order Details & Campaign Life Cycle */}
          <div className="lg:col-span-8">
            {currentOrder ? (
              <div className="space-y-6">
                {/* 1. Campaign Pipeline Bar */}
                <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs font-mono text-neutral-400 uppercase">
                        CAMPAIGN LIFECYCLE TRACKER
                      </div>
                      <h3 className="text-lg font-bold text-neutral-950 mt-0.5">
                        {currentOrder.campaignBrief.businessName}
                      </h3>
                    </div>

                    <button
                      onClick={() => setPrintReceiptOrder(currentOrder)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View Official Tax Receipt</span>
                    </button>
                  </div>

                  {/* Horizontal Stage Progress */}
                  <div className="grid grid-cols-5 gap-2 pt-2">
                    {[
                      { key: 'SUBMITTED', label: 'Brief Received' },
                      { key: 'UNDER_REVIEW', label: 'Targeting & Review' },
                      { key: 'APPROVED', label: 'Meta Approval' },
                      { key: 'LAUNCHED_ACTIVE', label: 'Delivering Ads' },
                      { key: 'COMPLETED', label: 'Flight Finished' }
                    ].map((st, i) => {
                      const currentIndex = getStatusIndex(currentOrder.campaignStatus);
                      const isComplete = currentIndex >= i + 1;
                      const isCurrent = currentIndex === i + 1;

                      return (
                        <div key={st.key} className="text-center">
                          <div className={`h-1.5 rounded-full mb-2 ${
                            isComplete ? 'bg-neutral-950' : 'bg-neutral-200'
                          }`} />
                          <div className={`text-[11px] font-semibold leading-tight ${
                            isCurrent ? 'text-neutral-950 font-bold' : isComplete ? 'text-neutral-700' : 'text-neutral-400'
                          }`}>
                            {st.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Campaign Specialist Review Note */}
                  {currentOrder.reviewNotes && (
                    <div className="mt-5 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 leading-relaxed">
                      <div className="font-bold text-neutral-900 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
                        <span>Campaign Launch Updates:</span>
                      </div>
                      {currentOrder.reviewNotes}
                    </div>
                  )}
                </div>

                {/* 2. Live Performance Metrics (if launched) */}
                {currentOrder.performance && (
                  <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-xs font-mono text-neutral-400 uppercase">
                          VERIFIED META ANALYTICS
                        </div>
                        <h4 className="text-base font-bold text-neutral-950">
                          Active Campaign Telemetry
                        </h4>
                      </div>
                      {currentOrder.performance.metaCampaignId && (
                        <span className="text-[11px] font-mono text-neutral-500">
                          Meta ID: {currentOrder.performance.metaCampaignId}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3 bg-neutral-50 rounded-xl">
                        <div className="text-xs text-neutral-500">Impressions</div>
                        <div className="text-xl font-bold font-mono text-neutral-950 tabular-nums mt-0.5">
                          {currentOrder.performance.impressions.toLocaleString()}
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 rounded-xl">
                        <div className="text-xs text-neutral-500">Link Clicks</div>
                        <div className="text-xl font-bold font-mono text-neutral-950 tabular-nums mt-0.5">
                          {currentOrder.performance.clicks.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          CTR: {currentOrder.performance.ctr}%
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 rounded-xl">
                        <div className="text-xs text-neutral-500">Leads / Inquiries</div>
                        <div className="text-xl font-bold font-mono text-neutral-950 tabular-nums mt-0.5">
                          {currentOrder.performance.conversions}
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 rounded-xl">
                        <div className="text-xs text-neutral-500">Current ROAS</div>
                        <div className="text-xl font-bold font-mono text-neutral-950 tabular-nums mt-0.5">
                          {currentOrder.performance.roas}x
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          Spend: ${currentOrder.performance.spendUSD}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Campaign Brief & Ad Creative Details */}
                <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-neutral-950">
                      Campaign Specifications & Ad Creative
                    </h4>

                    {currentOrder.campaignStatus !== 'COMPLETED' && !isEditingBrief && (
                      <button
                        onClick={() => handleStartEditBrief(currentOrder)}
                        className="text-xs font-semibold text-neutral-900 hover:text-blue-600 transition-colors"
                      >
                        Edit Brief Specifications
                      </button>
                    )}
                  </div>

                  {isEditingBrief && briefForm ? (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-600 uppercase">
                            Offer Headline
                          </label>
                          <input
                            type="text"
                            value={briefForm.headline}
                            onChange={(e) => setBriefForm({ ...briefForm, headline: e.target.value })}
                            className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-600 uppercase">
                            Target Locations
                          </label>
                          <input
                            type="text"
                            value={briefForm.targetLocations}
                            onChange={(e) => setBriefForm({ ...briefForm, targetLocations: e.target.value })}
                            className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-neutral-600 uppercase">
                          Primary Ad Body Copy
                        </label>
                        <textarea
                          rows={3}
                          value={briefForm.primaryText}
                          onChange={(e) => setBriefForm({ ...briefForm, primaryText: e.target.value })}
                          className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2 text-xs"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setIsEditingBrief(false)}
                          className="px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-950"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveBrief}
                          disabled={isSavingBrief}
                          className="px-4 py-1.5 bg-neutral-950 text-white rounded-lg text-xs font-semibold"
                        >
                          {isSavingBrief ? 'Saving...' : 'Save Updated Brief'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-2">
                        <div className="font-semibold text-neutral-900 text-sm">
                          &ldquo;{currentOrder.campaignBrief.headline}&rdquo;
                        </div>
                        <p className="text-neutral-600 leading-relaxed">
                          {currentOrder.campaignBrief.primaryText}
                        </p>
                        <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 border-t border-neutral-200/50">
                          <span>Platform: <strong>{currentOrder.campaignBrief.platform}</strong></span>
                          <span>Objective: <strong>{currentOrder.campaignBrief.objective}</strong></span>
                          <span>CTA: <strong>{currentOrder.campaignBrief.callToAction}</strong></span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <span className="text-neutral-400 uppercase text-[10px] font-semibold">Audience Locations</span>
                          <div className="text-neutral-800 font-medium">{currentOrder.campaignBrief.targetLocations}</div>
                        </div>
                        <div>
                          <span className="text-neutral-400 uppercase text-[10px] font-semibold">Age Brackets</span>
                          <div className="text-neutral-800 font-medium">{currentOrder.campaignBrief.targetAge}</div>
                        </div>
                      </div>

                      {currentOrder.campaignBrief.destinationUrl && (
                        <div>
                          <span className="text-neutral-400 uppercase text-[10px] font-semibold">Destination URL / Channel</span>
                          <div>
                            <a
                              href={currentOrder.campaignBrief.destinationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-neutral-900 font-medium underline flex items-center gap-1 mt-0.5"
                            >
                              <span>{currentOrder.campaignBrief.destinationUrl}</span>
                              <ExternalLink className="w-3 h-3 text-neutral-500" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Official Tax Receipt Modal */}
      {printReceiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 border border-neutral-200 shadow-2xl relative">
            <button
              onClick={() => setPrintReceiptOrder(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700"
            >
              ✕
            </button>

            <div className="text-center pb-6 border-b border-neutral-200">
              <div className="text-lg font-extrabold text-neutral-950">{branding?.siteShortName || 'AdPulse Global'}</div>
              <div className="text-xs text-neutral-500">Official Client Tax Invoice &amp; Receipt</div>
              <div className="text-xs font-mono text-neutral-400 mt-1">
                Receipt #{printReceiptOrder.receiptNumber || 'REC-PENDING'}
              </div>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Customer:</span>
                <span className="font-semibold text-neutral-900">{printReceiptOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Business / Brand:</span>
                <span className="font-semibold text-neutral-900">{printReceiptOrder.campaignBrief.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Date Paid:</span>
                <span className="font-mono text-neutral-900">{printReceiptOrder.paidAt ? new Date(printReceiptOrder.paidAt).toLocaleDateString() : 'Confirmed'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Paystack Reference:</span>
                <span className="font-mono text-neutral-900">{printReceiptOrder.paymentReference || 'pstk_inline'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Service Plan:</span>
                <span className="font-semibold text-neutral-900">
                  {printReceiptOrder.serviceName}
                </span>
              </div>
            </div>

            <div className="py-3 border-t border-neutral-100 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-neutral-600">
                <span>Campaign Delivery Status:</span>
                <span className="text-emerald-700 font-bold">100% Done For You Campaign</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200 text-sm font-bold text-neutral-950">
                <span>Total Amount Paid:</span>
                <span>{printReceiptOrder.paymentCurrency} {printReceiptOrder.paymentTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                Payment status: <strong className="text-emerald-700">VERIFIED PAID</strong>
              </span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
