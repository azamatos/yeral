/** Public catalogue: categories, cities, search, suggestions, places, business pages, reviews. */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
  businessDetailSchema,
  businessQuerySchema,
  categoryListSchema,
  citiesQuerySchema,
  cityListSchema,
  placeListSchema,
  placeSuggestQuerySchema,
  reviewListSchema,
  reviewsQuerySchema,
  searchQuerySchema,
  searchResponseSchema,
  suggestQuerySchema,
  suggestResponseSchema,
} from '@yeral/contract/catalog'
import { langQuerySchema, slugSchema } from '@yeral/contract/common'
import { nearestCity } from '@yeral/domain/geo'
import { MARKET } from '@yeral/domain/market'
import { and, asc, desc, eq, inArray, or, sql, type AnyColumn, type SQL } from 'drizzle-orm'
import { anyTextLike, textIn } from '../../db/localized'
import { bookingItems, businesses, categories, places, reviews, services } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { errors, json } from '../../http/openapi'
import { loadCities } from './cities'
import { businessDetail, publicBusiness } from './detail'
import { text, visitWhat } from './map'
import { search, wordStartLikes } from './search'

const slugParam = z.object({ slug: slugSchema })

const categoriesRoute = createRoute({
  method: 'get',
  path: '/categories',
  tags: ['catalog'],
  summary: 'The category catalogue',
  request: { query: langQuerySchema },
  responses: { 200: json(categoryListSchema) },
})

const citiesRoute = createRoute({
  method: 'get',
  path: '/cities',
  tags: ['catalog'],
  summary: 'The cities for "Nirede?", the main one and the one the position is in',
  request: { query: citiesQuerySchema },
  responses: { 200: json(cityListSchema), 400: errors[400] },
})

const searchRoute = createRoute({
  method: 'get',
  path: '/search',
  tags: ['catalog'],
  summary: 'Search businesses with free time (Home uses it too)',
  request: { query: searchQuerySchema },
  responses: { 200: json(searchResponseSchema), 400: errors[400] },
})

const suggestRoute = createRoute({
  method: 'get',
  path: '/search/suggest',
  tags: ['catalog'],
  summary: '"Näme?" suggestions',
  request: { query: suggestQuerySchema },
  responses: { 200: json(suggestResponseSchema) },
})

const placesRoute = createRoute({
  method: 'get',
  path: '/places/suggest',
  tags: ['catalog'],
  summary: '"Nirede?" suggestions',
  request: { query: placeSuggestQuerySchema },
  responses: { 200: json(placeListSchema) },
})

const businessRoute = createRoute({
  method: 'get',
  path: '/businesses/{slug}',
  tags: ['catalog'],
  summary: 'A business page',
  request: { params: slugParam, query: businessQuerySchema },
  responses: { 200: json(businessDetailSchema), 404: errors[404] },
})

const reviewsRoute = createRoute({
  method: 'get',
  path: '/businesses/{slug}/reviews',
  tags: ['catalog'],
  summary: "A business's reviews, newest first",
  request: { params: slugParam, query: reviewsQuerySchema },
  responses: { 200: json(reviewListSchema), 404: errors[404] },
})

export const catalogRoutes = new OpenAPIHono<AppEnv>()
  .openapi(categoriesRoute, async (c) => {
    const { lang } = c.req.valid('query')
    const rows = await c.var.deps.db.select().from(categories).orderBy(asc(categories.sort))
    const items = rows.map((r) => ({
      id: r.id,
      icon: r.icon,
      name: text(r.name, lang),
      hint: text(r.hint, lang),
      bookingTypes: r.bookingTypes,
      specialistWord: text(r.specialistWord, lang),
      intro: text(r.intro, lang),
    }))
    return c.json({ items }, 200)
  })
  .openapi(citiesRoute, async (c) => {
    const { lang, lat, lng } = c.req.valid('query')
    const rows = await loadCities(c.var.deps.db)
    const nearest = lat !== undefined && lng !== undefined ? nearestCity(rows, { lat, lng }) : null
    return c.json(
      {
        items: rows.map((r) => ({ id: r.id, name: text(r.name, lang), lat: r.lat, lng: r.lng })),
        main: MARKET.mainCity,
        nearest: nearest?.id ?? null,
      },
      200,
    )
  })
  .openapi(searchRoute, async (c) => c.json(await search(c.var.deps, c.req.valid('query')), 200))
  .openapi(suggestRoute, async (c) => {
    const { q, lang } = c.req.valid('query')
    const { db } = c.var.deps
    const [start, word] = wordStartLikes(q)
    const matches = (col: SQL | AnyColumn) => or(sql`${col} ilike ${start}`, sql`${col} ilike ${word}`)
    const [cats, svc, biz] = await Promise.all([
      db
        .select()
        .from(categories)
        .where(anyTextLike(categories.name, start, word))
        .orderBy(asc(categories.sort))
        .limit(4),
      db
        .selectDistinct({ name: textIn(services.name, lang) })
        .from(services)
        .innerJoin(businesses, eq(businesses.id, services.businessId))
        .where(and(eq(businesses.verification, 'verified'), eq(services.archived, false), anyTextLike(services.name, start, word)))
        .limit(6),
      db
        .select()
        .from(businesses)
        .where(and(eq(businesses.verification, 'verified'), matches(businesses.name)))
        .orderBy(desc(businesses.reviewsCount))
        .limit(6),
    ])
    return c.json(
      {
        categories: cats.map((x) => ({ id: x.id, name: text(x.name, lang) })),
        services: svc.map((x) => x.name).sort((x, y) => x.localeCompare(y)),
        businesses: biz.map((x) => ({ slug: x.slug, name: x.name, category: text(x.kind, lang) })),
      },
      200,
    )
  })
  .openapi(placesRoute, async (c) => {
    const { q, lang, city } = c.req.valid('query')
    const [start, word] = wordStartLikes(q)
    const rows = await c.var.deps.db
      .select()
      .from(places)
      .where(and(anyTextLike(places.label, start, word), city ? eq(places.cityId, city) : undefined))
      .limit(6)
    return c.json({ items: rows.map((p) => ({ label: text(p.label, lang), lat: p.lat, lng: p.lng })) }, 200)
  })
  .openapi(businessRoute, async (c) => {
    const { slug } = c.req.valid('param')
    const { lang, lat, lng } = c.req.valid('query')
    const position = lat !== undefined && lng !== undefined ? { lat, lng } : null
    return c.json(await businessDetail(c.var.deps, slug, lang, position), 200)
  })
  .openapi(reviewsRoute, async (c) => {
    const { slug } = c.req.valid('param')
    const { cursor, limit, lang } = c.req.valid('query')
    const b = await publicBusiness(c.var.deps, slug)
    const offset = Number(cursor ?? 0) || 0
    const rows = await c.var.deps.db
      .select()
      .from(reviews)
      .where(eq(reviews.businessId, b.id))
      .orderBy(desc(reviews.createdAt))
      .limit(limit + 1)
      .offset(offset)
    const page = rows.slice(0, limit)
    const ids = page.flatMap((r) => (r.bookingId ? [r.bookingId] : []))
    const visitItems = ids.length
      ? await c.var.deps.db.select().from(bookingItems).where(inArray(bookingItems.bookingId, ids)).orderBy(asc(bookingItems.sort))
      : []
    const items = page.map((r) => ({
      id: r.id,
      author: r.authorName,
      rating: r.rating,
      tags: r.tags,
      text: r.text,
      createdAt: r.createdAt.getTime(),
      what:
        visitWhat(
          visitItems.filter((i) => i.bookingId === r.bookingId),
          lang,
        ) || r.what,
      reply: r.replyText && r.replyAt ? { text: r.replyText, createdAt: r.replyAt.getTime() } : null,
    }))
    return c.json({ items, cursor: rows.length > limit ? String(offset + limit) : null }, 200)
  })
