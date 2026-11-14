import React, { useState } from 'react';
import { WebsiteContent } from '../types/index.ts';
import { ChevronDown, ChevronUp, Shield, MessageSquare, Target, Sparkles } from 'lucide-react';

interface HowItWorksAndFaqSectionProps {
  content: WebsiteContent;
}

export const HowItWorksAndFaqSection: React.FC<HowItWorksAndFaqSectionProps> = ({ content }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const stepIcons = [Target, MessageSquare, Shield, Sparkles];
  const defaultSteps = [
    {
      step: '01',
      title: 'Choose Your Package',
      description: 'Pick Lite (GH₵ 100), Starter (GH₵ 250), Standard (GH₵ 450), or Pro (GH₵ 650) with one simple total price.'
    },
    {
      step: '02',
      title: 'Enter Your WhatsApp Number',
      description: 'Tell us your name, email, and the WhatsApp number where interested buyers should message you.'
    },
    {
      step: '03',
      title: 'Pay Once via Paystack',
      description: 'Complete secure payment in seconds using MTN Mobile Money, Telecel Cash, Bank Card, or USD.'
    },
    {
      step: '04',
      title: 'We Handle Everything & Launch',
      description: 'We create your ad design, configure targeting, launch on Facebook & Instagram, and bring customers to your WhatsApp.'
    }
  ];

  const steps = content.processSteps && content.processSteps.length > 0 ? content.processSteps : defaultSteps;

  return (
    <div>
      {/* 1. Simple 4-Step Done For You Process */}
      <section className="py-16 sm:py-20 bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {content.processSectionEyebrow || 'Simple Done-For-You Process'}
            </div>
            <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight mt-1">
              {content.processSectionTitle || 'From Payment to Customers on Your WhatsApp'}
            </h2>
            <p className="text-neutral-600 mt-2 text-sm sm:text-base leading-relaxed">
              {content.processSectionSubtitle || 'No complicated forms or technical setup. You select your package, pay once, and we launch everything for you within 24 hours.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((st, idx) => {
              const Icon = stepIcons[idx % stepIcons.length];
              return (
                <div key={st.step + idx} className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-neutral-400">
                        STEP {st.step}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-neutral-950">
                      {st.title}
                    </h3>

                    <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                      {st.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. FAQ Section */}
      <section id="faq" className="py-16 sm:py-20 bg-white border-b border-neutral-200 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {content.faqSectionEyebrow || 'Common Questions'}
            </div>
            <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight mt-1">
              {content.faqSectionTitle || 'Frequently Asked Questions'}
            </h2>
            <p className="text-neutral-600 mt-2 text-sm">
              {content.faqSectionSubtitle || 'Quick answers about packages, Paystack payments, and receiving WhatsApp messages.'}
            </p>
          </div>

          <div className="space-y-3">
            {content.faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={faq.id || index}
                  className="border border-neutral-200 rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-neutral-50/70 transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-bold text-neutral-900">
                      {faq.question}
                    </span>
                    <span className="text-neutral-400 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3 bg-neutral-50/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
