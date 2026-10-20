/**
 * "Teswirler" as the team reads them (book B-53, B-54; `/w/{slug}/reviews…`): the summary, the filters and sort, the
 * reply, and reporting a review to Ýeral. The owner and administrators reply and report; a specialist reads the reviews
 * of their own visits, without the summary.
 */
import { REVIEW_REPLY_MAX } from '@yeral/domain/lifecycle'
import { REVIEW_REPORT_REASONS } from '@yeral/domain/model'
import { z } from 'zod'
import { boolQuery, cursorQuerySchema, epochSchema, idSchema, langQuerySchema, listOf, slugSchema } from './common'
import { ratingBreakdownSchema } from './catalog'

export const reviewParamSchema = z.object({ slug: slugSchema, id: idSchema })

export const REVIEW_SORTS = ['newest', 'oldest', 'lowest', 'highest'] as const

/** "Ählisi · Jogapsyz · ★5 … ★1 · Hünärmen ▾", sorted; 20 a page ("Ýene görkez"). */
export const teamReviewsQuerySchema = langQuerySchema.extend(cursorQuerySchema.shape).extend({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unanswered: boolQuery.optional(),
  stars: z.coerce.number().int().min(1).max(5).optional(),
  staff: idSchema.optional(),
  sort: z.enum(REVIEW_SORTS).default('newest'),
})

/**
 * A report to Ýeral (B-54): `checking` while it isn't counted (Ýeral decides, 48 hours at most), `counted` once the 48
 * hours passed without a decision, `cleared` once Ýeral kept the review (it can't be reported again).
 */
export const reviewReportSchema = z.object({
  reason: z.enum(REVIEW_REPORT_REASONS),
  text: z.string().nullable(),
  at: epochSchema,
  by: z.string().nullable(),
  state: z.enum(['checking', 'counted', 'cleared']),
})

export const teamReviewSchema = z
  .object({
    id: idSchema,
    author: z.string(),
    rating: z.number().int().min(1).max(5),
    tags: z.array(z.string()),
    text: z.string().nullable(),
    createdAt: epochSchema,
    /** "Aýal saç kesimi · Aýna" */
    what: z.string(),
    /** "Glow Studio · Maýsa": `by` is who on the team wrote it. */
    reply: z.object({ text: z.string(), at: epochSchema, by: z.string().nullable() }).nullable(),
    report: reviewReportSchema.nullable(),
  })
  .meta({ id: 'TeamReview' })

/** The summary as clients see it (reported reviews Ýeral is checking aren't counted); null for a specialist. */
export const teamReviewsSchema = listOf(teamReviewSchema)
  .extend({
    summary: z
      .object({
        rating: z.number().nullable(),
        count: z.number().int(),
        breakdown: ratingBreakdownSchema,
        /** "Jogapsyz · 4". */
        unanswered: z.number().int(),
      })
      .nullable(),
  })
  .meta({ id: 'TeamReviews' })

/** "Jogaby çap et": everyone sees it ("Gysga we hormatly ýazyň"). */
export const reviewReplyInputSchema = z
  .object({ text: z.string().trim().min(1).max(REVIEW_REPLY_MAX) })
  .strict()
  .meta({ id: 'ReviewReplyInput' })

/** "Näme üçin arz edýärsiňiz?" with an optional "Düşündiriş". */
export const reviewReportInputSchema = z
  .object({ reason: z.enum(REVIEW_REPORT_REASONS), text: z.string().trim().min(1).max(300).optional() })
  .strict()
  .meta({ id: 'ReviewReportInput' })
