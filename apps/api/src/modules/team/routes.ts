/**
 * The team (book chapter 3; ADR 0025): the person's workspaces and invites (`/me/…`, the invite link), and the team the
 * owner manages (`/w/{slug}/team…`). Only the owner changes the team; administrators see it; specialists don't.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { photoUploadSchema } from '@yeral/contract/common'
import {
  inviteCardSchema,
  inviteIdParamSchema,
  inviteInputSchema,
  inviteListSchema,
  inviteSentSchema,
  inviteTokenParamSchema,
  phoneOnlyInputSchema,
  removeMemberSchema,
  staffBookingsResultSchema,
  staffIdParamSchema,
  staffScheduleResultSchema,
  staffScheduleSchema,
  staffScheduleUpdateSchema,
  teamMemberSchema,
  teamSchema,
  updateMemberSchema,
  workspaceListSchema,
  workspaceParamSchema,
  workspaceSchema,
} from '@yeral/contract/team'
import { can, canManageTeam } from '@yeral/domain/permissions'
import { isMobile } from '@yeral/domain/phone'
import { inviteState } from '@yeral/domain/team'
import { and, asc, eq } from 'drizzle-orm'
import { businesses, invites, staff } from '../../db/schema'
import { ApiError, invalid } from '../../http/errors'
import type { AppEnv } from '../../http/env'
import { errors, formBody, json, jsonBody, noContent } from '../../http/openapi'
import { sha256Hex } from '../../lib/crypto'
import { requireUser } from '../auth/session'
import { loadHours } from '../availability/context'
import { removeMember, scheduleOf, updateSchedule } from './away'
import { uploadGuard } from '../media/photos'
import { removeStaffPhoto, setStaffPhoto } from './photo'
import {
  hasJoined,
  hasServices,
  inviteCards,
  inviteLink,
  issueInvite,
  member,
  members,
  removeRow,
  requireMember,
  reusableRow,
  rowsForPhone,
  setServices,
  teamChanged,
  teamRow,
  workspacesOf,
  type StaffRow,
} from './service'

const tags = ['team']
const ownerOnly = { 401: errors[401], 403: errors[403], 404: errors[404] }

// ── The person: workspaces and invites ──

const workspacesRoute = createRoute({
  method: 'get',
  path: '/me/workspaces',
  tags,
  summary: 'The workspaces I work in, with the requests I may answer in each (the switcher)',
  responses: { 200: json(workspaceListSchema), 401: errors[401] },
})
const openRoute = createRoute({
  method: 'post',
  path: '/me/workspaces/{slug}/open',
  tags,
  summary: 'Remember this workspace as the one I opened last',
  request: { params: workspaceParamSchema },
  responses: { ...noContent, 401: errors[401], 404: errors[404] },
})
const myInvitesRoute = createRoute({
  method: 'get',
  path: '/me/invites',
  tags,
  summary: 'Open and expired invites for my phone, oldest first (shown at sign-in)',
  responses: { 200: json(inviteListSchema), 401: errors[401] },
})
const acceptRoute = createRoute({
  method: 'post',
  path: '/me/invites/{id}/accept',
  tags,
  summary: 'Accept an invite: join the team with its level',
  request: { params: inviteIdParamSchema },
  responses: { 200: json(workspaceSchema), 401: errors[401], 404: errors[404], 409: errors[409] },
})
const declineRoute = createRoute({
  method: 'post',
  path: '/me/invites/{id}/decline',
  tags,
  summary: 'Decline an invite; joining later needs a new one',
  request: { params: inviteIdParamSchema },
  responses: { ...noContent, 401: errors[401], 404: errors[404], 409: errors[409] },
})
const byTokenRoute = createRoute({
  method: 'get',
  path: '/invites/{token}',
  tags,
  summary: 'The invite behind a link: it opens the invite and never signs anyone in',
  request: { params: inviteTokenParamSchema },
  responses: { 200: json(inviteCardSchema), 404: errors[404] },
})

// ── The team ──

const teamRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/team',
  tags,
  summary: 'The team with levels, invites and phones (owner and administrators)',
  request: { params: workspaceParamSchema },
  responses: { 200: json(teamSchema), ...ownerOnly },
})
const inviteRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/team/invites',
  tags,
  summary: 'Invite someone by phone (owner); the link is valid 7 days',
  request: { params: workspaceParamSchema, ...jsonBody(inviteInputSchema) },
  responses: { 201: json(inviteSentSchema, 'Invited'), 400: errors[400], 409: errors[409], ...ownerOnly },
})
const phoneOnlyRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/team/phone-only',
  tags,
  summary: 'Add a specialist without the app (owner): no invite, active at once (book Q-216)',
  request: { params: workspaceParamSchema, ...jsonBody(phoneOnlyInputSchema) },
  responses: { 201: json(teamMemberSchema, 'Added'), 400: errors[400], 409: errors[409], ...ownerOnly },
})
const sendInviteRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/team/{staffId}/invite',
  tags,
  summary: 'Send the invite again, or switch the app on for a specialist without it (owner): a new link, a new 7 days',
  request: { params: staffIdParamSchema },
  responses: { 201: json(inviteSentSchema, 'Invited'), 400: errors[400], 409: errors[409], ...ownerOnly },
})
const cancelInviteRoute = createRoute({
  method: 'delete',
  path: '/w/{slug}/team/{staffId}/invite',
  tags,
  summary: 'Cancel the open invite (owner)',
  request: { params: staffIdParamSchema },
  responses: { ...noContent, ...ownerOnly },
})
const updateRoute = createRoute({
  method: 'patch',
  path: '/w/{slug}/team/{staffId}',
  tags,
  summary: 'Change a level or the right to answer one’s own requests (owner)',
  request: { params: staffIdParamSchema, ...jsonBody(updateMemberSchema) },
  responses: { 200: json(teamMemberSchema), 400: errors[400], ...ownerOnly },
})
const removeRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/team/{staffId}/remove',
  tags,
  summary: 'Remove someone (owner): they lose access and leave the client site; their bookings ahead are moved, kept or cancelled',
  request: { params: staffIdParamSchema, ...jsonBody(removeMemberSchema) },
  responses: { 200: json(staffBookingsResultSchema, 'Removed'), 400: errors[400], 409: errors[409], ...ownerOnly },
})
const scheduleRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/team/{staffId}/schedule',
  tags,
  summary: 'A team member’s shift, breaks and days off (owner; administrators read them)',
  request: { params: staffIdParamSchema },
  responses: { 200: json(staffScheduleSchema), ...ownerOnly },
})
const scheduleUpdateRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/team/{staffId}/schedule',
  tags,
  summary: 'Save a team member’s schedule (owner); bookings it leaves outside their day are asked about first (409)',
  request: { params: staffIdParamSchema, ...jsonBody(staffScheduleUpdateSchema) },
  responses: { 200: json(staffScheduleResultSchema), 400: errors[400], 409: errors[409], ...ownerOnly },
})
const reactivateRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/team/{staffId}/reactivate',
  tags,
  summary: 'Bring a removed person back (owner); someone who never joined needs a new invite',
  request: { params: staffIdParamSchema },
  responses: { 200: json(teamMemberSchema), 409: errors[409], ...ownerOnly },
})
const leaveRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/leave',
  tags,
  summary: 'Leave this workspace ("Bu biznesden çyk"); the owner can’t',
  request: { params: workspaceParamSchema },
  responses: { ...noContent, 401: errors[401], 404: errors[404], 409: errors[409] },
})

/** The owner manages the team; anyone else gets "not allowed". */
const assertOwner = (actor: Parameters<typeof canManageTeam>[0]) => {
  if (!canManageTeam(actor)) throw new ApiError('forbidden')
}
/** The owner's own row isn't changed through the team. */
const notOwnerRow = (row: StaffRow) => {
  if (row.level === 'owner') throw new ApiError('forbidden')
}

const photoRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/team/{staffId}/photo',
  tags,
  summary: 'The picture clients see beside a team member (JPEG, PNG or WebP, up to 10 MB; owner)',
  middleware: [uploadGuard] as const,
  request: { params: staffIdParamSchema, ...formBody(photoUploadSchema) },
  responses: { 200: json(teamMemberSchema), 400: errors[400], 429: errors[429], ...ownerOnly },
})
const removePhotoRoute = createRoute({
  method: 'delete',
  path: '/w/{slug}/team/{staffId}/photo',
  tags,
  summary: "A team member's picture goes (owner)",
  request: { params: staffIdParamSchema },
  responses: { 200: json(teamMemberSchema), 400: errors[400], ...ownerOnly },
})

export const teamRoutes = new OpenAPIHono<AppEnv>()
  .openapi(photoRoute, async (c) => {
    const { slug, staffId } = c.req.valid('param')
    const { business, actor, user } = await requireMember(c, slug)
    assertOwner(actor)
    const { deps } = c.var
    const row = await setStaffPhoto(deps, business.id, staffId, c.req.valid('form').file)
    return c.json(await member(deps.db, deps, row, user.lang, deps.now()), 200)
  })
  .openapi(removePhotoRoute, async (c) => {
    const { slug, staffId } = c.req.valid('param')
    const { business, actor, user } = await requireMember(c, slug)
    assertOwner(actor)
    const { deps } = c.var
    const row = await removeStaffPhoto(deps, business.id, staffId)
    return c.json(await member(deps.db, deps, row, user.lang, deps.now()), 200)
  })
  .openapi(workspacesRoute, async (c) => c.json(await workspacesOf(c.var.deps, requireUser(c)), 200))
  .openapi(openRoute, async (c) => {
    const { member: row } = await requireMember(c, c.req.valid('param').slug)
    await c.var.deps.db
      .update(staff)
      .set({ lastOpenedAt: new Date(c.var.deps.now()) })
      .where(eq(staff.id, row.id))
    return c.body(null, 204)
  })
  .openapi(myInvitesRoute, async (c) => {
    const user = requireUser(c)
    const rows = await c.var.deps.db
      .select()
      .from(invites)
      .where(and(eq(invites.phone, user.phone), eq(invites.status, 'pending')))
      .orderBy(asc(invites.sentAt))
    return c.json({ items: await inviteCards(c.var.deps, rows, user.lang) }, 200)
  })
  .openapi(acceptRoute, async (c) => {
    const user = requireUser(c)
    const { deps } = c.var
    const now = deps.now()
    const businessId = await deps.db.transaction(async (tx) => {
      const invite = await openInvite(tx, c.req.valid('param').id, user.phone, now)
      const row = await teamRow(tx, invite.businessId, invite.staffId)
      // nobody joins twice: not beside another row with this phone (a specialist without the app, say) or this
      // account, and not onto a row that belongs to another account (a number that changed hands keeps its history)
      const { rows } = await rowsForPhone(tx, invite.businessId, user.phone)
      const twice = rows.some((r) => r.id !== row.id && (r.status !== 'removed' || r.userId === user.id))
      if (twice || (row.userId && row.userId !== user.id)) throw new ApiError('already_on_team')
      await tx
        .update(staff)
        .set({ userId: user.id, hasApp: true, status: row.status === 'invited' ? 'active' : row.status, lastOpenedAt: new Date(now) })
        .where(eq(staff.id, row.id))
      await tx
        .update(invites)
        .set({ status: 'accepted', answeredAt: new Date(now) })
        .where(eq(invites.id, invite.id))
      await teamChanged(tx, invite.businessId, { userId: user.id })
      return invite.businessId
    })
    const [joined] = await deps.db.select({ slug: businesses.slug }).from(businesses).where(eq(businesses.id, businessId))
    const workspace = (await workspacesOf(deps, user)).items.find((w) => w.slug === joined?.slug)
    if (!workspace) throw new ApiError('not_found')
    return c.json(workspace, 200)
  })
  .openapi(declineRoute, async (c) => {
    const user = requireUser(c)
    const { deps } = c.var
    const now = deps.now()
    await deps.db.transaction(async (tx) => {
      const invite = await openInvite(tx, c.req.valid('param').id, user.phone, now)
      await tx
        .update(invites)
        .set({ status: 'declined', answeredAt: new Date(now) })
        .where(eq(invites.id, invite.id))
      await teamChanged(tx, invite.businessId, { userId: user.id })
    })
    return c.body(null, 204)
  })
  .openapi(byTokenRoute, async (c) => {
    const { deps } = c.var
    const [row] = await deps.db
      .select()
      .from(invites)
      .where(eq(invites.tokenHash, await sha256Hex(c.req.valid('param').token)))
    if (!row) throw new ApiError('not_found')
    const [card] = await inviteCards(deps, [row], c.var.auth?.user.lang ?? 'en')
    if (!card) throw new ApiError('not_found')
    return c.json(card, 200)
  })
  .openapi(teamRoute, async (c) => {
    const { business, actor, user } = await requireMember(c, c.req.valid('param').slug)
    if (!can(actor, 'team')) throw new ApiError('forbidden')
    return c.json({ items: await members(c.var.deps, business.id, user.lang, c.var.deps.now()) }, 200)
  })
  .openapi(inviteRoute, async (c) => {
    const { business, actor, user } = await requireMember(c, c.req.valid('param').slug)
    assertOwner(actor)
    const body = c.req.valid('json')
    const { deps } = c.var
    const now = deps.now()
    const result = await deps.db.transaction(async (tx) => {
      const { rows, accountId } = await rowsForPhone(tx, business.id, body.phone)
      if (rows.some((r) => r.status !== 'removed')) throw new ApiError('already_on_team')
      const fields = {
        name: body.name,
        fullName: body.fullName ?? null,
        specialization: body.specialization ?? null,
        phone: body.phone,
        level: body.level,
        hasApp: true,
        status: 'invited' as const,
        bookable: (body.serviceIds?.length ?? 0) > 0,
      }
      // someone removed earlier comes back on their old row
      const reused = reusableRow(rows, accountId)
      const [row] = reused
        ? await tx.update(staff).set(fields).where(eq(staff.id, reused.id)).returning()
        : await tx
            .insert(staff)
            .values({ businessId: business.id, ...fields })
            .returning()
      if (!row) throw new Error('staff write failed')
      await setServices(tx, business.id, row.id, body.serviceIds ?? [])
      const { token } = await issueInvite(tx, now, { businessId: business.id, staffId: row.id, phone: body.phone, invitedBy: user.id })
      await teamChanged(tx, business.id, { phone: body.phone })
      return { member: await member(tx, deps, row, user.lang, now), link: inviteLink(deps.site, token) }
    })
    return c.json(result, 201)
  })
  .openapi(phoneOnlyRoute, async (c) => {
    const { business, actor, user } = await requireMember(c, c.req.valid('param').slug)
    assertOwner(actor)
    const body = c.req.valid('json')
    const { deps } = c.var
    const created = await deps.db.transaction(async (tx) => {
      const { rows } = await rowsForPhone(tx, business.id, body.phone)
      if (rows.some((r) => r.status !== 'removed')) throw new ApiError('already_on_team')
      const [row] = await tx
        .insert(staff)
        .values({
          businessId: business.id,
          name: body.name,
          fullName: body.fullName ?? null,
          specialization: body.specialization ?? null,
          phone: body.phone,
          level: 'specialist',
          hasApp: false,
          status: 'active',
          bookable: (body.serviceIds?.length ?? 0) > 0,
        })
        .returning()
      if (!row) throw new Error('staff insert failed')
      await setServices(tx, business.id, row.id, body.serviceIds ?? [])
      await teamChanged(tx, business.id)
      return member(tx, deps, row, user.lang, deps.now())
    })
    return c.json(created, 201)
  })
  .openapi(sendInviteRoute, async (c) => {
    const { slug, staffId } = c.req.valid('param')
    const { business, actor, user } = await requireMember(c, slug)
    assertOwner(actor)
    const { deps } = c.var
    const now = deps.now()
    const result = await deps.db.transaction(async (tx) => {
      const row = await teamRow(tx, business.id, staffId)
      notOwnerRow(row)
      if (row.status === 'removed') throw new ApiError('invalid_status')
      if (hasJoined(row)) throw new ApiError('already_on_team')
      // the invite goes to a phone that can get the SMS (book chapter 3)
      if (!row.phone || !isMobile(row.phone)) throw invalid({ path: ['phone'], code: 'not_mobile' })
      const { token } = await issueInvite(tx, now, { businessId: business.id, staffId: row.id, phone: row.phone, invitedBy: user.id })
      await teamChanged(tx, business.id, { phone: row.phone })
      return { member: await member(tx, deps, row, user.lang, now), link: inviteLink(deps.site, token) }
    })
    return c.json(result, 201)
  })
  .openapi(cancelInviteRoute, async (c) => {
    const { slug, staffId } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    assertOwner(actor)
    const { deps } = c.var
    await deps.db.transaction(async (tx) => {
      const cancelled = await tx
        .update(invites)
        .set({ status: 'cancelled', answeredAt: new Date(deps.now()) })
        .where(and(eq(invites.businessId, business.id), eq(invites.staffId, staffId), eq(invites.status, 'pending')))
        .returning({ phone: invites.phone })
      if (!cancelled.length) throw new ApiError('not_found')
      await teamChanged(tx, business.id, { phone: cancelled[0]!.phone })
    })
    return c.body(null, 204)
  })
  .openapi(updateRoute, async (c) => {
    const { slug, staffId } = c.req.valid('param')
    const { business, actor, user } = await requireMember(c, slug)
    assertOwner(actor)
    const body = c.req.valid('json')
    const { deps } = c.var
    const updated = await deps.db.transaction(async (tx) => {
      const row = await teamRow(tx, business.id, staffId)
      notOwnerRow(row)
      const [next] = await tx
        .update(staff)
        .set({
          ...(body.level ? { level: body.level } : {}),
          ...(body.canAnswerOwn !== undefined ? { canAnswerOwn: body.canAnswerOwn } : {}),
        })
        .where(eq(staff.id, row.id))
        .returning()
      await teamChanged(tx, business.id, { userId: row.userId })
      return member(tx, deps, next ?? row, user.lang, deps.now())
    })
    return c.json(updated, 200)
  })
  .openapi(removeRoute, async (c) => {
    const { slug, staffId } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    assertOwner(actor)
    return c.json(await removeMember(c.var.deps, business, staffId, c.req.valid('json')), 200)
  })
  .openapi(scheduleRoute, async (c) => {
    const { slug, staffId } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    if (!can(actor, 'team')) throw new ApiError('forbidden')
    return c.json(await scheduleOf(c.var.deps.db, business, staffId), 200)
  })
  .openapi(scheduleUpdateRoute, async (c) => {
    const { slug, staffId } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    assertOwner(actor)
    return c.json(await updateSchedule(c.var.deps, business, staffId, c.req.valid('json')), 200)
  })
  .openapi(reactivateRoute, async (c) => {
    const { slug, staffId } = c.req.valid('param')
    const { business, actor, user } = await requireMember(c, slug)
    assertOwner(actor)
    const { deps } = c.var
    const back = await deps.db.transaction(async (tx) => {
      const row = await teamRow(tx, business.id, staffId)
      notOwnerRow(row)
      if (row.status !== 'removed') throw new ApiError('invalid_status')
      // not beside a newer row of the same phone or account
      const byPhone = row.phone ? (await rowsForPhone(tx, business.id, row.phone)).rows : []
      const byAccount = row.userId
        ? await tx
            .select()
            .from(staff)
            .where(and(eq(staff.businessId, business.id), eq(staff.userId, row.userId)))
        : []
      if ([...byPhone, ...byAccount].some((r) => r.id !== row.id && r.status !== 'removed')) throw new ApiError('already_on_team')
      // someone who had joined (or works without the app) is back at once; someone who never joined needs an invite
      const back = hasJoined(row) || !row.hasApp
      // a row whose number passed to someone else (book Q-270) has no one to invite: the person is invited anew
      if (!back && !row.phone) throw new ApiError('invalid_status')
      const [next] = await tx
        .update(staff)
        .set({ status: back ? 'active' : 'invited', bookable: await hasServices(tx, row.id) })
        .where(eq(staff.id, row.id))
        .returning()
      await teamChanged(tx, business.id, { userId: row.userId })
      return member(tx, deps, next ?? row, user.lang, deps.now())
    })
    return c.json(back, 200)
  })
  .openapi(leaveRoute, async (c) => {
    const { business, member: row } = await requireMember(c, c.req.valid('param').slug)
    if (row.level === 'owner') throw new ApiError('owner_cannot_leave')
    const { deps } = c.var
    await deps.db.transaction(async (tx) => {
      // ordered with the bookings being made for them, as a removal is (their bookings stay for the owner, B-15)
      await loadHours(tx, business.id, { lock: 'no key update' })
      await removeRow(tx, row, deps.now())
      await teamChanged(tx, business.id, { userId: row.userId })
    })
    return c.body(null, 204)
  })

/** An invite the signed-in phone may still answer; someone else's is "not found". */
async function openInvite(db: Parameters<typeof teamRow>[0], id: string, phone: string, now: number) {
  const [invite] = await db.select().from(invites).where(eq(invites.id, id)).for('update')
  if (!invite || invite.phone !== phone) throw new ApiError('not_found')
  const state = inviteState({ status: invite.status, expiresAt: invite.expiresAt.getTime() }, now)
  if (state === 'expired') throw new ApiError('invite_expired')
  if (state !== 'pending') throw new ApiError('invite_answered')
  return invite
}
