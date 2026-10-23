/**
 * Setting a business up (book B-02–B-06, Q-200; `/setup`, `/me/setup`, `/w/{slug}/setup…`): start the draft, find it
 * again at sign-in, save the wizard's step, finish.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { menuSchema } from '@yeral/contract/services'
import {
  mySetupSchema,
  setupSchema,
  setupServicesSchema,
  setupStartSchema,
  setupStepInputSchema,
  setupTeamSchema,
} from '@yeral/contract/setup'
import { teamSchema, workspaceParamSchema } from '@yeral/contract/team'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { requireUser } from '../auth/session'
import { requireMember } from '../team/service'
import { finishSetup, mySetup, saveStep, setupServices, setupTeam, startSetup } from './service'

const tags = ['setup']
const denied = { 401: errors[401], 403: errors[403], 404: errors[404] }

const startRoute = createRoute({
  method: 'post',
  path: '/setup',
  tags,
  summary: 'Step 2: the business as a draft, its name and category; one set up at a time (`setup_in_progress`)',
  request: jsonBody(setupStartSchema),
  responses: { 201: json(setupSchema.pick({ slug: true })), 400: errors[400], 401: errors[401], 409: errors[409] },
})
const mineRoute = createRoute({
  method: 'get',
  path: '/me/setup',
  tags,
  summary: "The person's unfinished setup and its step, or none (the login opens the wizard there)",
  responses: { 200: json(mySetupSchema), 401: errors[401] },
})
const stepRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/setup',
  tags,
  summary: "The wizard's step to reopen at (the owner, while setting up)",
  request: { params: workspaceParamSchema, ...jsonBody(setupStepInputSchema) },
  responses: { ...noContent, 400: errors[400], 409: errors[409], ...denied },
})
const servicesRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/setup/services',
  tags,
  summary: "Step 5: the draft's whole menu, the picked starters and the owner's own services, replacing the step's last save",
  request: { params: workspaceParamSchema, ...jsonBody(setupServicesSchema) },
  responses: { 200: json(menuSchema), 400: errors[400], 409: errors[409], ...denied },
})
const teamRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/setup/team',
  tags,
  summary: "Step 6: the draft's team besides its owner, replacing the step's last save; invites go out at the finish",
  request: { params: workspaceParamSchema, ...jsonBody(setupTeamSchema) },
  responses: { 200: json(teamSchema), 400: errors[400], 409: errors[409], ...denied },
})
const finishRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/setup/finish',
  tags,
  summary: '"Senenama geç": into the switcher and Ýeral\'s review, with an address, an open day and a service; the team\'s invites go out',
  request: { params: workspaceParamSchema },
  responses: { ...noContent, 409: errors[409], ...denied },
})

export const setupRoutes = new OpenAPIHono<AppEnv>()
  .openapi(startRoute, async (c) => c.json(await startSetup(c.var.deps, requireUser(c), c.req.valid('json')), 201))
  .openapi(mineRoute, async (c) => c.json(await mySetup(c.var.deps, requireUser(c)), 200))
  .openapi(stepRoute, async (c) => {
    const { business, actor } = await requireMember(c, c.req.valid('param').slug, { draft: true })
    await saveStep(c.var.deps, business, actor, c.req.valid('json').step)
    return c.body(null, 204)
  })
  .openapi(servicesRoute, async (c) => {
    const { business, actor } = await requireMember(c, c.req.valid('param').slug, { draft: true })
    return c.json(await setupServices(c.var.deps, business, actor, c.req.valid('json')), 200)
  })
  .openapi(teamRoute, async (c) => {
    const { user, business, actor } = await requireMember(c, c.req.valid('param').slug, { draft: true })
    return c.json({ items: await setupTeam(c.var.deps, business, actor, c.req.valid('json'), user.lang) }, 200)
  })
  .openapi(finishRoute, async (c) => {
    const { user, business, actor } = await requireMember(c, c.req.valid('param').slug, { draft: true })
    await finishSetup(c.var.deps, business, actor, user)
    return c.body(null, 204)
  })
