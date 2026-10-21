/**
 * The business app's demo workspace (book F-242): "Try the business app" signs the visitor in to it, as its owner, for
 * a day, without a number of their own.
 */
import { z } from 'zod'
import { meSchema } from './account'
import { slugSchema } from './common'

export const demoSessionSchema = z
  .object({
    /** The demo account (`demo: true`). */
    me: meSchema,
    /** The demo workspace to open. */
    slug: slugSchema,
  })
  .meta({ id: 'DemoSession' })
