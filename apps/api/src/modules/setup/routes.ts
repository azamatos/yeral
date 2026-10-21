/**
 * Setting a business up (book B-02–B-06, Q-200; `/setup`, `/me/setup`, `/w/{slug}/setup…`): start the draft, find it
 * again at sign-in, save the wizard's step, finish.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { mySetupSchema, setupSchema, setupStartSchema, setupStepInputSchema } from '@yeral/contract/setup'
import { workspaceParamSchema } from '@yeral/contract/team'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { requireUser } from '../auth/session'
import { requireMember } from '../team/service'
import { finishSetup, mySetup, saveStep, startSetup } from './service'

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
const finishRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/setup/finish',
  tags,
  summary: '"Senenama geç": into the switcher and Ýeral\'s review, with an address, an open day and a service',
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
  .openapi(finishRoute, async (c) => {
    const { user, business, actor } = await requireMember(c, c.req.valid('param').slug, { draft: true })
    await finishSetup(c.var.deps, business, actor, user)
    return c.body(null, 204)
  })
