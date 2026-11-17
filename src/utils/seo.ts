import type { PlatformConfigResponse } from '../services/api.ts';

function upsertMeta(selector: string, attrName: 'name' | 'property', attrValue: string, content: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function syncDynamicSeo(
  config: PlatformConfigResponse,
  activeView: 'home' | 'portal' | 'admin' | 'auth' = 'home'
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const origin = window.location.origin;
  const canonicalUrl = `${origin}${window.location.pathname}`;
  const siteShort = config.branding?.siteShortName || 'AdPulse Global';
  const rawTitle = config.branding?.siteTitle || `${siteShort} | Done-For-You Meta Advertising Packages`;
  const rawDescription =
    config.content?.metaDescription ||
    config.content?.subheadline ||
    'Done-For-You Facebook & Instagram advertising packages with instant Paystack checkout and direct WhatsApp customer delivery.';

  const viewPrefix =
    activeView === 'portal'
      ? `Client Portal | ${siteShort}`
      : activeView === 'admin'
      ? `Admin Suite | ${siteShort}`
      : activeView === 'auth'
      ? `Sign In | ${siteShort}`
      : rawTitle;

  document.title = viewPrefix;

  // Crawlers index public landing page; block indexing on authenticated dashboards
  const robotsValue =
    activeView === 'home'
      ? 'index, follow, max-image-preview:large, max-snippet:-1'
      : 'noindex, nofollow';

  upsertMeta('meta[name="description"]', 'name', 'description', rawDescription);
  upsertMeta('meta[name="robots"]', 'name', 'robots', robotsValue);
  upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
  upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', siteShort);
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', viewPrefix);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', rawDescription);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', viewPrefix);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', rawDescription);

  upsertLink('canonical', canonicalUrl);

  // Inject/Update Schema.org JSON-LD (Strict Rule: Total Package Prices ONLY, zero fee breakdown)
  const activePackages = (config.packages || []).filter((p) => p.status !== 'inactive');
  const faqs = config.content?.faqs || [];

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: origin,
        name: siteShort,
        description: rawDescription,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${origin}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'ProfessionalService',
        '@id': `${origin}/#organization`,
        name: siteShort,
        url: origin,
        description: config.footerConfig?.aboutText || rawDescription,
        email: config.footerConfig?.email || config.content?.agencyEmail,
        telephone: config.footerConfig?.phone || config.content?.agencyPhone,
        address: {
          '@type': 'PostalAddress',
          streetAddress: config.footerConfig?.address || config.content?.agencyAddress || 'Accra, Ghana'
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Done-For-You Advertising Packages',
          itemListElement: activePackages.map((pkg, idx) => ({
            '@type': 'Offer',
            position: idx + 1,
            name: pkg.name,
            description: `${pkg.recommendedFor} Includes: ${(pkg.includedServices || []).join(', ')}.`,
            price: String(pkg.priceGHS || Number((pkg.advertisingBudgetUSD + pkg.managementFeeUSD).toFixed(2))),
            priceCurrency: pkg.priceGHS ? 'GHS' : 'USD',
            availability: 'https://schema.org/InStock',
            url: `${origin}/#packages`
          }))
        }
      },
      ...(faqs.length > 0
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${origin}/#faq`,
              mainEntity: faqs.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: f.answer
                }
              }))
            }
          ]
        : [])
    ]
  };

  let ldScript = document.getElementById('adpulse-jsonld') as HTMLScriptElement | null;
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.id = 'adpulse-jsonld';
    ldScript.type = 'application/ld+json';
    document.head.appendChild(ldScript);
  }
  ldScript.textContent = JSON.stringify(structuredData);
}
