import { describe, expect, it } from 'vitest'
import { photonGeocoder, placeOf } from './geocoder'

const feature = (props: Record<string, string>, lng = 58.38, lat = 37.95) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] as [number, number] },
  properties: { countrycode: 'TM', ...props },
})

describe('the Photon geocoder (ADR 0027)', () => {
  it('reads a feature as a place: the house and street as the line, a place’s own name first', () => {
    expect(placeOf(feature({ housenumber: '247', street: 'Bitarap Türkmenistan Avenue', city: 'Ashgabat' }))).toEqual({
      label: '247 Bitarap Türkmenistan Avenue, Ashgabat',
      line: '247 Bitarap Türkmenistan Avenue',
      street: 'Bitarap Türkmenistan Avenue',
      lat: 37.95,
      lng: 58.38,
    })
    expect(placeOf(feature({ name: 'Berkarar', housenumber: '82', street: 'Atatürk Street', city: 'Ashgabat' }))?.label).toBe(
      'Berkarar, 82 Atatürk Street, Ashgabat',
    )
    // a street alone is a place to pick; something with no street isn't
    expect(placeOf(feature({ name: 'Magtymguly Avenue', city: 'Ashgabat' }))?.line).toBe('Magtymguly Avenue')
    expect(placeOf(feature({ housenumber: '5' }))).toBeNull()
  })

  it('asks near the city, named; keeps the market’s country, no repeats, as many as asked; a day’s answer isn’t asked again', async () => {
    const asked: { url: URL; ua: string | null }[] = []
    const fetcher = (async (input: URL, init?: RequestInit) => {
      asked.push({ url: new URL(input), ua: new Headers(init?.headers).get('user-agent') })
      return Response.json({
        features: [
          feature({ housenumber: '247', street: 'Bitarap Türkmenistan Avenue', city: 'Ashgabat' }),
          feature({ housenumber: '247', street: 'Bitarap Türkmenistan Avenue', city: 'Ashgabat' }),
          { ...feature({ street: 'Amir Temur Street', city: 'Tashkent' }), properties: { street: 'Amir Temur Street', countrycode: 'UZ' } },
          feature({ street: 'Atatürk Street', city: 'Ashgabat' }),
        ],
      })
    }) as typeof fetch
    let now = 0
    const geo = photonGeocoder('https://photon.test', 'Yeral/test', () => now, fetcher)
    const opts = { near: { lat: 37.95, lng: 58.38 }, country: 'tm', lang: 'en' as const, limit: 1 }
    const first = await geo.search(' Bitarap 247 ', opts)
    expect(first.map((p) => p.label)).toEqual(['247 Bitarap Türkmenistan Avenue, Ashgabat'])
    const { url, ua } = asked[0]!
    expect(url.origin + url.pathname).toBe('https://photon.test/api')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ q: 'Bitarap 247', lat: '37.95', lon: '58.38', lang: 'en', limit: '3' })
    expect(ua).toBe('Yeral/test')
    // the same letters within a day: from the cache
    expect(await geo.search('bitarap 247', opts)).toEqual(first)
    expect(asked).toHaveLength(1)
    now += 86_400_001
    await geo.search('bitarap 247', { ...opts, lang: 'tk', limit: 5 })
    expect(asked).toHaveLength(2)
    // Photon has English or the local names
    expect(asked[1]!.url.searchParams.get('lang')).toBe('default')
  })

  it('a geocoder that answers an error fails the search, for the endpoint to say so', async () => {
    const geo = photonGeocoder(
      'https://photon.test',
      'Yeral/test',
      Date.now,
      (async () => new Response('busy', { status: 429 })) as typeof fetch,
    )
    await expect(geo.search('Bitarap', { near: { lat: 37.95, lng: 58.38 }, country: 'tm', lang: 'en', limit: 5 })).rejects.toThrow(/429/)
  })
})
