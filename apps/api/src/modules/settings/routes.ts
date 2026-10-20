/**
 * Business settings (book B-37–B-43; `/w/{slug}/settings/…`): the owner and administrators change them ("change
 * business settings"); a specialist gets 403, someone not on the team 404.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  bookingRulesSchema,
  bookingRulesUpdateSchema,
  businessHoursResultSchema,
  businessHoursSettingsSchema,
  businessHoursUpdateSchema,
  businessProfileSchema,
  businessProfileUpdateSchema,
} from '@yeral/contract/settings'
import { workspaceParamSchema } from '@yeral/contract/team'
import { can } from '@yeral/domain/permissions'
import type { Context } from 'hono'
import { ApiError } from '../../http/errors'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody } from '../../http/openapi'
import { requireMember } from '../team/service'
import { hoursOf, updateHours } from './hours'
import { profileOf, rulesOf, updateProfile, updateRules } from './service'

const tags = ['settings']
const denied = { 401: errors[401], 403: errors[403], 404: errors[404] }

/** A team member who may change business settings. */
async function requireSettings(c: Context<AppEnv>, slug: string) {
  const m = await requireMember(c, slug)
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

export const settingsRoutes = new OpenAPIHono<AppEnv>()
  .openapi(rulesRoute, async (c) => {
    const { business } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await rulesOf(c.var.deps.db, business.id), 200)
  })
  .openapi(updateRulesRoute, async (c) => {
    const { business } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await updateRules(c.var.deps.db, business.id, c.req.valid('json')), 200)
  })
  .openapi(profileRoute, async (c) => {
    const { business } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await profileOf(c.var.deps.db, business.id), 200)
  })
  .openapi(updateProfileRoute, async (c) => {
    const { business } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await updateProfile(c.var.deps.db, business.id, c.req.valid('json'), c.var.deps.now()), 200)
  })
  .openapi(hoursRoute, async (c) => {
    const { business } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await hoursOf(c.var.deps.db, business.id), 200)
  })
  .openapi(updateHoursRoute, async (c) => {
    const { business } = await requireSettings(c, c.req.valid('param').slug)
    return c.json(await updateHours(c.var.deps, business.id, c.req.valid('json')), 200)
  })
