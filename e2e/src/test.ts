import { test as base } from '@playwright/test'

export { expect } from '@playwright/test'

/**
 * The flows' `test`: every browser context a flow opened (a client's, the owner's, a second client's) closes with
 * the flow. Left open, their push streams (ADR 0028) would pile up to the end of the run, and the owner's, the same
 * account in every flow, against the api's per-user limit (`STREAMS_PER_USER` in `modules/events/live.ts`).
 */
export const test = base.extend<{ closeContexts: void }>({
  closeContexts: [
    async ({ browser }, use) => {
      await use()
      await Promise.all(browser.contexts().map((context) => context.close()))
    },
    { auto: true },
  ],
})
