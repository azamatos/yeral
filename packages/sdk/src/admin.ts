/**
 * The admin tool's calls (book F-178; ADR 0026). The Ýeral team's session is its own cookie, so nothing here touches
 * the person `me` holds: `me()` says who's signed in, null for nobody, and a 401 from any other call means the session
 * ended, which reads the same to the shell: it goes to the sign-in. One role (Q-011), so no call asks for more.
 */
import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import type {
  adminAddBusinessSchema,
  adminBusinessesQuerySchema,
  adminInviteSchema,
  adminNewRecoveryCodesSchema,
  adminPasswordChangeSchema,
  adminReasonSchema,
  adminReviewsQuerySchema,
  adminSetupConfirmSchema,
  adminSetupPasswordSchema,
  adminSignInSchema,
} from '@yeral/contract/admin'
import type { z } from 'zod'
import { abortWith, call, isApiError, type Client } from './client'
import { keys } from './keys'

/** A list of businesses: one view, maybe searched. */
export type AdminBusinessesParams = Pick<z.output<typeof adminBusinessesQuerySchema>, 'view' | 'q'>
export type AdminReviewView = z.output<typeof adminReviewsQuerySchema>['view']

export function createAdmin(client: Client, queryClient: QueryClient) {
  const admin = client.v1.admin
  const invalidate = (...queryKeys: readonly (readonly unknown[])[]) =>
    Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))

  /** Nobody is signed in any more: what the team saw leaves the cache. */
  const signedOut = () => {
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === keys.admin()[0] && q.queryKey[1] !== keys.adminMe()[1] })
    queryClient.setQueryData(keys.adminMe(), null)
  }

  const ask: typeof call = async (request) => {
    try {
      return await call(request)
    } catch (e) {
      if (isApiError(e, 'unauthorized')) signedOut()
      throw e
    }
  }

  /** A business changed: its page, and the lists it moved between. */
  const businessChanged = (id: string) => invalidate(keys.adminBusiness(id), keys.adminBusinesses())

  return {
    /** null when nobody is signed in (no error). */
    me: () =>
      queryOptions({
        queryKey: keys.adminMe(),
        queryFn: async ({ signal }) => {
          try {
            return await call(admin.me.$get(undefined, abortWith(signal)))
          } catch (e) {
            if (isApiError(e, 'unauthorized')) return null
            throw e
          }
        },
      }),
    signIn: () =>
      mutationOptions({
        mutationFn: (json: z.input<typeof adminSignInSchema>) => call(admin['sign-in'].$post({ json })),
        onSuccess: (me) => queryClient.setQueryData(keys.adminMe(), me),
      }),
    signOut: () =>
      mutationOptions({
        mutationFn: () => call(admin['sign-out'].$post()),
        onSuccess: signedOut,
      }),
    changePassword: () =>
      mutationOptions({
        mutationFn: (json: z.input<typeof adminPasswordChangeSchema>) => ask(admin.me.password.$put({ json })),
      }),
    /** The old codes stop working; the new ones are shown once. */
    newRecoveryCodes: () =>
      mutationOptions({
        mutationFn: (json: z.input<typeof adminNewRecoveryCodesSchema>) => ask(admin.me['recovery-codes'].$post({ json })),
        onSuccess: () => invalidate(keys.adminMe()),
      }),

    /** A setup link (24 hours): `setup_expired` when it ran out or was used. */
    setup: (token: string) =>
      queryOptions({
        queryKey: keys.adminSetup(token),
        queryFn: ({ signal }) => call(admin.setup[':token'].$get({ param: { token } }, abortWith(signal))),
        retry: false,
        // the steps change nothing it answers, and the last one uses the link up
        staleTime: Infinity,
      }),
    setupPassword: (token: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof adminSetupPasswordSchema>) =>
          call(admin.setup[':token'].password.$post({ param: { token }, json })),
      }),
    /** The app's first code: the account is active and signed in; its recovery codes come back, shown once. */
    setupConfirm: (token: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof adminSetupConfirmSchema>) =>
          call(admin.setup[':token'].confirm.$post({ param: { token }, json })),
        onSuccess: () => invalidate(keys.adminMe()),
      }),

    team: () =>
      queryOptions({
        queryKey: keys.adminTeam(),
        queryFn: ({ signal }) => ask(admin.team.$get(undefined, abortWith(signal))),
      }),
    /** A new account and its setup link, shown once; `login_taken`. */
    invite: () =>
      mutationOptions({
        mutationFn: (json: z.input<typeof adminInviteSchema>) => ask(admin.team.$post({ json })),
        onSuccess: () => invalidate(keys.adminTeam()),
      }),
    resetMember: () =>
      mutationOptions({
        mutationFn: (id: string) => ask(admin.team[':id'].reset.$post({ param: { id } })),
        onSuccess: () => invalidate(keys.adminTeam()),
      }),
    disableMember: () =>
      mutationOptions({
        mutationFn: (id: string) => ask(admin.team[':id'].disable.$post({ param: { id } })),
        onSuccess: () => invalidate(keys.adminTeam()),
      }),

    businesses: ({ view, q }: AdminBusinessesParams) =>
      queryOptions({
        queryKey: keys.adminBusinesses({ view, q }),
        queryFn: ({ signal }) => ask(admin.businesses.$get({ query: { view, ...(q ? { q } : {}) } }, abortWith(signal))),
      }),
    business: (id: string) =>
      queryOptions({
        queryKey: keys.adminBusiness(id),
        queryFn: ({ signal }) => ask(admin.businesses[':id'].$get({ param: { id }, query: {} }, abortWith(signal))),
      }),
    /** `moved`: the `addressChangedAt` the team looked at, for a move checked again. */
    verify: (id: string) =>
      mutationOptions({
        mutationFn: (moved?: number) =>
          ask(admin.businesses[':id'].verify.$post({ param: { id }, query: moved === undefined ? {} : { moved: String(moved) } })),
        onSuccess: () => businessChanged(id),
      }),
    /** Sent back with a reason the owner reads. */
    reject: (id: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof adminReasonSchema>) => ask(admin.businesses[':id'].reject.$post({ param: { id }, json })),
        onSuccess: () => businessChanged(id),
      }),
    hide: (id: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof adminReasonSchema>) => ask(admin.businesses[':id'].hide.$post({ param: { id }, json })),
        onSuccess: () => businessChanged(id),
      }),
    show: (id: string) =>
      mutationOptions({
        mutationFn: () => ask(admin.businesses[':id'].show.$post({ param: { id } })),
        onSuccess: () => businessChanged(id),
      }),
    /** As its owner asked (Q-213): says how many bookings ahead were cancelled. */
    close: (id: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof adminReasonSchema>) => ask(admin.businesses[':id'].close.$post({ param: { id }, json })),
        onSuccess: () => businessChanged(id),
      }),
    reopen: (id: string) =>
      mutationOptions({
        mutationFn: () => ask(admin.businesses[':id'].reopen.$post({ param: { id } })),
        onSuccess: () => businessChanged(id),
      }),
    /** For an owner the team has met (F-238): a draft their sign-in reopens. */
    addBusiness: () =>
      mutationOptions({
        mutationFn: (json: z.input<typeof adminAddBusinessSchema>) => ask(admin.businesses.$post({ json })),
        onSuccess: () => invalidate(keys.adminBusinesses()),
      }),

    reviews: (view: AdminReviewView) =>
      queryOptions({
        queryKey: keys.adminReviews(view),
        queryFn: ({ signal }) => ask(admin.reviews.$get({ query: { view } }, abortWith(signal))),
      }),
    clearReview: () =>
      mutationOptions({
        mutationFn: (id: string) => ask(admin.reviews[':id'].clear.$post({ param: { id } })),
        onSuccess: () => invalidate(keys.adminReviews()),
      }),
    removeReview: () =>
      mutationOptions({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
          ask(admin.reviews[':id'].remove.$post({ param: { id }, json: { reason } })),
        onSuccess: () => invalidate(keys.adminReviews()),
      }),
  }
}
