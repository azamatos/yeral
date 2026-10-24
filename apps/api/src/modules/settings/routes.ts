/**
 * Business settings (book B-37–B-43; `/w/{slug}/settings/…`): the owner and administrators change them ("change
 * business settings"); a specialist gets 403, someone not on the team 404.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  addressSearchQuerySchema,
  addressSearchSchema,
  bookingRulesSchema,
  bookingRulesUpdateSchema,
  businessHoursResultSchema,
  businessHoursSettingsSchema,
  businessHoursUpdateSchema,
  businessLogoSchema,
  businessProfileSchema,
  businessProfileUpdateSchema,
  galleryOrderSchema,
  galleryPhotoParamSchema,
  gallerySchema,
  internalStatusInputSchema,
  internalStatusListSchema,
  internalStatusParamSchema,
  internalStatusSchema,
  internalStatusUpdateSchema,
} from '@yeral/contract/settings'
import { photoUploadSchema } from '@yeral/contract/common'
import { workspaceParamSchema } from '@yeral/contract/team'
import { MAX_INTERNAL_STATUSES } from '@yeral/domain/model'
import { can } from '@yeral/domain/permissions'
import type { Context } from 'hono'
import { ApiError } from '../../http/errors'
import type { AppEnv } from '../../http/env'
import { errors, formBody, json, jsonBody, noContent } from '../../http/openapi'
import { sendForReview } from '../admin/businesses'
import { requireMember } from '../team/service'
import { hoursOf, updateHours } from './hours'
import { profileOf, rulesOf, updateProfile, updateRules } from './service'
import { uploadGuard } from '../media/photos'
import { clientIp } from '../../lib/rate-limit'
import { searchAddress } from './address-search'
import { removeLogo, setLogo } from './logo'
import { addPhoto, galleryOf, orderPhotos, removePhoto } from './photos'
import { addStatus, deleteStatus, statusesOf, updateStatus } from './statuses'

const tags = ['settings']
const denied = { 401: errors[401], 403: errors[403], 404: errors[404] }

const sendAgainRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/verification',
  tags: ['settings'],
  summary: 'The owner sends a business the Ýeral team sent back for review again, once it’s fixed (Q-274)',
  request: { params: workspaceParamSchema },
  responses: { ...noContent, 409: errors[409], ...denied },
})

/** A team member who may change business settings. */
async function requireSettings(c: Context<AppEnv>, slug: string) {
  // the wizard fills a business in through these (book Q-200)
  const m = await requireMember(c, slug, { draft: true })
  if (!can(m.actor, 'settings')) throw new ApiError('forbidden')
  return m
}

const rulesRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/settings/rules',
  tags,
  summary: 'The booking rules (B-41) and who answers requests (B-42)',
  request: { params: workspaceParamSchema },
  responses: { 200: json(bookingRulesSchema), ...denied },
})
const updateRulesRoute = createRoute({
  method: 'patch',
  path: '/w/{slug}/settings/rules',
  tags,
  summary: 'Change some of the booking rules; waiting requests keep theirs (Q-205)',
  request: { params: workspaceParamSchema, ...jsonBody(bookingRulesUpdateSchema) },
  responses: { 200: json(bookingRulesSchema), 400: errors[400], ...denied },
})

const profileRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/settings/profile',
  tags,
  summary: 'The business profile (B-37): what the public page says',
  request: { params: workspaceParamSchema },
  responses: { 200: json(businessProfileSchema), ...denied },
})
const updateProfileRoute = createRoute({
  method: 'patch',
  path: '/w/{slug}/settings/profile',
  tags,
  summary: 'Change some of the profile; a new address is noted for the Ýeral team (Q-215)',
  request: { params: workspaceParamSchema, ...jsonBody(businessProfileUpdateSchema) },
  responses: { 200: json(businessProfileSchema), 400: errors[400], ...denied },
})

const hoursRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/settings/hours',
  tags,
  summary: 'The week (B-39) and the special days (B-40)',
  request: { params: workspaceParamSchema },
  responses: { 200: json(businessHoursSettingsSchema), ...denied },
})
const updateHoursRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/settings/hours',
  tags,
  summary: 'Save the week and the special days; bookings left outside are kept or cancelled with offered times (Q-211)',
  request: { params: workspaceParamSchema, ...jsonBody(businessHoursUpdateSchema) },
  responses: { 200: json(businessHoursResultSchema), 400: errors[400], 409: errors[409], ...denied },
})

const statusesRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/settings/statuses',
  tags,
  summary: 'The internal statuses: the presets and the business’s own (the whole team reads them for the booking drawer)',
  request: { params: workspaceParamSchema },
  responses: { 200: json(internalStatusListSchema), ...denied },
})
const addStatusRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/settings/statuses',
  tags,
  summary: '"Ýagdaý goş": an internal status of the business’s own, five in all',
  request: { params: workspaceParamSchema, ...jsonBody(internalStatusInputSchema) },
  responses: { 201: json(internalStatusSchema, 'Added'), 400: errors[400], 409: errors[409], ...denied },
})
const updateStatusRoute = createRoute({
  method: 'patch',
  path: '/w/{slug}/settings/statuses/{id}',
  tags,
  summary: 'Switch an internal status on or off, or change its icon, colour or (not a preset’s) name',
  request: { params: internalStatusParamSchema, ...jsonBody(internalStatusUpdateSchema) },
  responses: { 200: json(internalStatusSchema), 400: errors[400], ...denied },
})
const deleteStatusRoute = createRoute({
  method: 'delete',
  path: '/w/{slug}/settings/statuses/{id}',
  tags,
  summary: 'Delete one of the business’s own internal statuses (a preset is switched off instead)',
  request: { params: internalStatusParamSchema },
  responses: { ...noContent, 400: errors[400], ...denied },
})

const addressSearchRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/settings/address-search',
  tags,
  summary: 'Addresses to pick for the map pin, in the market and near the city (3 letters or more; ADR 0027)',
  request: { params: workspaceParamSchema, query: addressSearchQuerySchema },
  responses: { 200: json(addressSearchSchema), 400: errors[400], 429: errors[429], 503: errors[503], ...denied },
})

const setLogoRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/settings/logo',
  tags,
  summary: 'The logo (JPEG, PNG or WebP, up to 10 MB; square, the app crops it); the old one goes',
  middleware: [uploadGuard] as const,
  request: { params: workspaceParamSchema, ...formBody(photoUploadSchema) },
  responses: { 200: json(businessLogoSchema), 400: errors[400], 429: errors[429], ...denied },
})
const removeLogoRoute = createRoute({
  method: 'delete',
  path: '/w/{slug}/settings/logo',
  tags,
  summary: 'No logo: the apps draw a letter tile',
  request: { params: workspaceParamSchema },
  responses: { 200: json(businessLogoSchema), ...denied },
})

const galleryRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/settings/photos',
  tags,
  summary: '"Suratlar": the gallery, the first the cover',
  request: { params: workspaceParamSchema },
  responses: { 200: json(gallerySchema), ...denied },
})
const addPhotoRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/settings/photos',
  tags,
  summary: 'A photo at the end of the gallery (JPEG, PNG or WebP, up to 10 MB); `gallery_full` past 20',
  middleware: [uploadGuard] as const,
  request: { params: workspaceParamSchema, ...formBody(photoUploadSchema) },
  responses: { 201: json(gallerySchema), 400: errors[400], 409: errors[409], 429: errors[429], ...denied },
})
const removePhotoRoute = createRoute({
  method: 'delete',
  path: '/w/{slug}/settings/photos/{id}',
  tags,
  summary: 'A photo goes from the gallery',
  request: { params: galleryPhotoParamSchema },
  responses: { 200: json(gallerySchema), 400: errors[400], ...denied },
})
const orderPhotosRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/settings/photos/order',
  tags,
  summary: 'The gallery in a new order: every photo once, the first the cover',
  request: { params: workspaceParamSchema, ...jsonBody(galleryOrderSchema) },
  responses: { 200: json(gallerySchema), 400: errors[400], ...denied },
})

export const settingsRoutes = new OpenAPIHono<AppEnv>()
  .openapi(sendAgainRoute, async (c) => {
    const { business, member } = await requireMember(c, c.req.valid('param').slug)
    if (member.level !== 'owner') throw new ApiError('forbidden')
    await sendForReview(c.var.deps, business.id)
    return c.body(null, 204)
  })
  .openapi(addressSearchRoute, async (c) => {
    const { user } = await requireSettings(c, c.req.valid('param').slug)
    const { q, cityId, lang } = c.req.valid('query')
    const ip = clientIp((n) => c.req.header(n), c.var.deps.trustedIpHeader)
    return c.json(await searchAddress(c.var.deps, user, ip, q, cityId, lang ?? user.lang), 200)
  })
  .openapi(setLogoRoute, async (c) => {
    const { business, user } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await setLogo(c.var.deps, business, c.req.valid('form').file, user.lang), 200)
  })
  .openapi(removeLogoRoute, async (c) => {
    const { business } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await removeLogo(c.var.deps, business), 200)
  })
  .openapi(galleryRoute, async (c) => {
    const { business, user } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await galleryOf(c.var.deps, business, user.lang), 200)
  })
  .openapi(addPhotoRoute, async (c) => {
    const { business, user } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await addPhoto(c.var.deps, business, c.req.valid('form').file, user.lang), 201)
  })
  .openapi(orderPhotosRoute, async (c) => {
    const { business, user } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await orderPhotos(c.var.deps, business, c.req.valid('json').ids, user.lang), 200)
  })
  .openapi(removePhotoRoute, async (c) => {
    const { slug, id } = c.req.valid('param')
    const { business, user } = await requireSettings(c, slug)
    return c.json(await removePhoto(c.var.deps, business, id, user.lang), 200)
  })
  .openapi(statusesRoute, async (c) => {
    const { business } = await requireMember(c, c.req.valid('param').slug, { draft: true })
    return c.json({ items: await statusesOf(c.var.deps.db, business.id), max: MAX_INTERNAL_STATUSES }, 200)
  })
  .openapi(addStatusRoute, async (c) => {
    const { business } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await addStatus(c.var.deps.db, business.id, c.req.valid('json')), 201)
  })
  .openapi(updateStatusRoute, async (c) => {
    const { slug, id } = c.req.valid('param')
    const { business } = await requireSettings(c, slug)
    return c.json(await updateStatus(c.var.deps.db, business.id, id, c.req.valid('json')), 200)
  })
  .openapi(deleteStatusRoute, async (c) => {
    const { slug, id } = c.req.valid('param')
    const { business } = await requireSettings(c, slug)
    await deleteStatus(c.var.deps.db, business.id, id)
    return c.body(null, 204)
  })
  .openapi(rulesRoute, async (c) => {
    const { business } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await rulesOf(c.var.deps.db, business.id), 200)
  })
  .openapi(updateRulesRoute, async (c) => {
    const { business } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await updateRules(c.var.deps.db, business.id, c.req.valid('json')), 200)
  })
  .openapi(profileRoute, async (c) => {
    const { business, user } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await profileOf(c.var.deps, business.id, user.lang), 200)
  })
  .openapi(updateProfileRoute, async (c) => {
    const { business, user } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await updateProfile(c.var.deps, business.id, c.req.valid('json'), user.lang), 200)
  })
  .openapi(hoursRoute, async (c) => {
    const { business } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await hoursOf(c.var.deps.db, business.id), 200)
  })
  .openapi(updateHoursRoute, async (c) => {
    const { business, user } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await updateHours(c.var.deps, business.id, c.req.valid('json'), user.lang), 200)
  })
