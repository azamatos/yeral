/**
 * The services menu (book B-38; `/w/{slug}/services…`): the whole team reads it (prices are booking information,
 * design §28.1: a specialist books for herself and filters the list by service); the owner and administrators ("change
 * services and prices") keep groups and services, a specialist's write gets 403, someone not on the team 404.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  groupInputSchema,
  groupParamSchema,
  menuGroupSchema,
  menuOrderSchema,
  menuSchema,
  menuServiceSchema,
  serviceInputSchema,
  serviceParamSchema,
  serviceUpdateSchema,
} from '@yeral/contract/services'
import { workspaceParamSchema } from '@yeral/contract/team'
import { can } from '@yeral/domain/permissions'
import type { Context } from 'hono'
import { ApiError } from '../../http/errors'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { requireMember } from '../team/service'
import { addGroup, addService, archiveService, deleteGroup, menuOf, orderMenu, renameGroup, updateService } from './service'

const tags = ['services']
const denied = { 401: errors[401], 403: errors[403], 404: errors[404] }

/** A team member who may change services and prices. */
async function requireServices(c: Context<AppEnv>, slug: string) {
  // the wizard's services step (book Q-200)
  const m = await requireMember(c, slug, { draft: true })
  if (!can(m.actor, 'services')) throw new ApiError('forbidden')
  return m
}

const menuRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/services',
  tags,
  summary: 'The services menu: groups and services in the clients’ order, with who does each (the whole team reads it)',
  request: { params: workspaceParamSchema },
  responses: { 200: json(menuSchema), ...denied },
})
const addServiceRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/services',
  tags,
  summary: 'Add a service, last in its group',
  request: { params: workspaceParamSchema, ...jsonBody(serviceInputSchema) },
  responses: { 201: json(menuServiceSchema), 400: errors[400], ...denied },
})
const updateServiceRoute = createRoute({
  method: 'patch',
  path: '/w/{slug}/services/{serviceId}',
  tags,
  summary: 'Change some of a service',
  request: { params: serviceParamSchema, ...jsonBody(serviceUpdateSchema) },
  responses: { 200: json(menuServiceSchema), 400: errors[400], ...denied },
})
const deleteServiceRoute = createRoute({
  method: 'delete',
  path: '/w/{slug}/services/{serviceId}',
  tags,
  summary: 'Delete a service: bookings keep their copy, the ones ahead stay (Q-210); undo with restore',
  request: { params: serviceParamSchema },
  responses: { ...noContent, 409: errors[409], ...denied },
})
const restoreServiceRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/services/{serviceId}/restore',
  tags,
  summary: '"Yzyna al": bring a deleted service back, last in its group',
  request: { params: serviceParamSchema },
  responses: { 200: json(menuServiceSchema), 409: errors[409], ...denied },
})
const addGroupRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/services/groups',
  tags,
  summary: 'Add a group, last on the menu',
  request: { params: workspaceParamSchema, ...jsonBody(groupInputSchema) },
  responses: { 201: json(menuGroupSchema), 400: errors[400], ...denied },
})
const renameGroupRoute = createRoute({
  method: 'patch',
  path: '/w/{slug}/services/groups/{groupId}',
  tags,
  summary: 'Rename a group',
  request: { params: groupParamSchema, ...jsonBody(groupInputSchema) },
  responses: { 200: json(menuGroupSchema), 400: errors[400], ...denied },
})
const deleteGroupRoute = createRoute({
  method: 'delete',
  path: '/w/{slug}/services/groups/{groupId}',
  tags,
  summary: 'Delete a group that holds no service (`group_not_empty` otherwise)',
  request: { params: groupParamSchema },
  responses: { ...noContent, 409: errors[409], ...denied },
})
const orderRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/services/order',
  tags,
  summary: 'The whole menu’s order: every group and service once; a service may change group',
  request: { params: workspaceParamSchema, ...jsonBody(menuOrderSchema) },
  responses: { 200: json(menuSchema), 400: errors[400], ...denied },
})

export const menuRoutes = new OpenAPIHono<AppEnv>()
  .openapi(menuRoute, async (c) => {
    // the whole team: a specialist books for herself from it and filters the bookings list by service
    const { business } = await requireMember(c, c.req.valid('param').slug, { draft: true })
    return c.json(await menuOf(c.var.deps.db, business.id, c.var.deps.now()), 200)
  })
  // the fixed paths before `{serviceId}`
  .openapi(orderRoute, async (c) => {
    const { business } = await requireServices(c, c.req.valid('param').slug)
    return c.json(await orderMenu(c.var.deps, business.id, c.req.valid('json')), 200)
  })
  .openapi(addGroupRoute, async (c) => {
    const { business } = await requireServices(c, c.req.valid('param').slug)
    return c.json(await addGroup(c.var.deps, business.id, c.req.valid('json').name), 201)
  })
  .openapi(renameGroupRoute, async (c) => {
    const { slug, groupId } = c.req.valid('param')
    const { business } = await requireServices(c, slug)
    return c.json(await renameGroup(c.var.deps, business.id, groupId, c.req.valid('json').name), 200)
  })
  .openapi(deleteGroupRoute, async (c) => {
    const { slug, groupId } = c.req.valid('param')
    const { business } = await requireServices(c, slug)
    await deleteGroup(c.var.deps, business.id, groupId)
    return c.body(null, 204)
  })
  .openapi(addServiceRoute, async (c) => {
    const { business } = await requireServices(c, c.req.valid('param').slug)
    return c.json(await addService(c.var.deps, business.id, c.req.valid('json')), 201)
  })
  .openapi(updateServiceRoute, async (c) => {
    const { slug, serviceId } = c.req.valid('param')
    const { business } = await requireServices(c, slug)
    return c.json(await updateService(c.var.deps, business.id, serviceId, c.req.valid('json')), 200)
  })
  .openapi(deleteServiceRoute, async (c) => {
    const { slug, serviceId } = c.req.valid('param')
    const { business } = await requireServices(c, slug)
    await archiveService(c.var.deps, business.id, serviceId, true)
    return c.body(null, 204)
  })
  .openapi(restoreServiceRoute, async (c) => {
    const { slug, serviceId } = c.req.valid('param')
    const { business } = await requireServices(c, slug)
    return c.json(await archiveService(c.var.deps, business.id, serviceId, false), 200)
  })
