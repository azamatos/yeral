import { describe, expect, it } from 'vitest'
import { businessJsonLd, robotsTxt, sitemapXml } from './seo'

describe('sitemapXml', () => {
  const xml = sitemapXml('https://yeral.app', ['en'], {
    businesses: [{ slug: 'barber-loft', changedAt: Date.parse('2026-10-20T10:00:00Z') }],
    categories: ['barber'],
  })

  it('lists home, search, categories and businesses', () => {
    expect(xml).toContain('<loc>https://yeral.app/en</loc>')
    expect(xml).toContain('<loc>https://yeral.app/en/search</loc>')
    expect(xml).toContain('<loc>https://yeral.app/en/c/barber</loc>')
    expect(xml).toContain('<loc>https://yeral.app/en/b/barber-loft</loc><lastmod>2026-10-20</lastmod>')
  })

  it('repeats them per language', () => {
    expect(sitemapXml('https://x.test', ['en', 'tk'], { businesses: [], categories: [] }).match(/<url>/g)).toHaveLength(4)
  })
})

describe('robotsTxt', () => {
  it('keeps the person’s own pages out and points at the sitemap', () => {
    expect(robotsTxt('https://yeral.app')).toContain('Disallow: /*/account')
    expect(robotsTxt('https://yeral.app')).toContain('Sitemap: https://yeral.app/sitemap.xml')
  })
})

describe('businessJsonLd', () => {
  const base = {
    name: 'Barber </script>',
    rating: 4.8,
    reviewsCount: 12,
    phone: '+99364754591',
    address: 'A street',
    geo: { lat: 37.9, lng: 58.3, approximate: false },
  }

  it('says what search engines read', () => {
    const data = JSON.parse(businessJsonLd(base, 'https://yeral.app/en/b/x')) as Record<string, unknown>
    expect(data).toMatchObject({ '@type': 'LocalBusiness', telephone: '+99364754591' })
    expect(data.aggregateRating).toMatchObject({ ratingValue: 4.8, reviewCount: 12 })
  })

  it('keeps a hidden address’s point out', () => {
    const hidden = { ...base, geo: { ...base.geo, approximate: true } }
    expect(JSON.parse(businessJsonLd(hidden, 'https://x.test'))).not.toHaveProperty('geo')
  })

  it('can’t close its script tag', () => {
    expect(businessJsonLd(base, 'https://x.test')).not.toContain('</script>')
  })

  it('leaves out a rating nobody gave', () => {
    expect(JSON.parse(businessJsonLd({ ...base, rating: null, reviewsCount: 0 }, 'https://x.test'))).not.toHaveProperty('aggregateRating')
  })
})
