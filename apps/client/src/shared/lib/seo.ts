import type { BusinessDetail } from '@yeral/contract/catalog'

type SitemapData = { businesses: readonly { slug: string; changedAt: number }[]; categories: readonly string[] }

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const url = (loc: string, lastmod?: number) =>
  `<url><loc>${escapeXml(loc)}</loc>${lastmod === undefined ? '' : `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>`}</url>`

/** The public pages for search engines (book F-197), in every language the site has: home, search, categories, businesses. */
const STATIC_PAGES = ['about', 'help', 'privacy', 'terms']

export function sitemapXml(origin: string, locales: readonly string[], data: SitemapData): string {
  const pages = locales.flatMap((lang) => [
    url(`${origin}/${lang}`),
    url(`${origin}/${lang}/search`),
    ...STATIC_PAGES.map((page) => url(`${origin}/${lang}/${page}`)),
    ...data.categories.map((category) => url(`${origin}/${lang}/c/${category}`)),
    ...data.businesses.map((b) => url(`${origin}/${lang}/b/${b.slug}`, b.changedAt)),
  ])
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.join('')}</urlset>\n`
}

/** Everything but the person's own pages, and where the sitemap is. Whether the site may be indexed at all is the edge's `X-Robots-Tag`. */
export const robotsTxt = (origin: string) =>
  `User-agent: *\nDisallow: /*/account\nDisallow: /*/login\nDisallow: /*/b/*/book\nSitemap: ${origin}/sitemap.xml\n`

/** A business page's structured data (book F-197); `<` is escaped, as it goes inside a script tag. */
export function businessJsonLd(
  detail: Pick<BusinessDetail, 'name' | 'rating' | 'reviewsCount' | 'phone' | 'address' | 'geo'>,
  url: string,
) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: detail.name,
    url,
    address: detail.address,
    // a business that hides its exact address shows only an approximate point (book C-08): that one isn't said here
    ...(detail.geo.approximate ? {} : { geo: { '@type': 'GeoCoordinates', latitude: detail.geo.lat, longitude: detail.geo.lng } }),
    ...(detail.phone ? { telephone: detail.phone } : {}),
    ...(detail.rating !== null && detail.reviewsCount > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: detail.rating, reviewCount: detail.reviewsCount } }
      : {}),
  }).replace(/</g, '\\u003c')
}
