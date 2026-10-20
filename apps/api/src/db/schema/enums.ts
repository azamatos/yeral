/** Postgres enums from the same lists the domain and the contract use (ADR 0017, ADR 0018). */
import {
  BOOKING_SOURCES,
  BOOKING_STATUSES,
  BOOKING_TYPES,
  BUSINESS_CANCEL_REASONS,
  CANCELLED_BY,
  CLIENT_SOURCES,
  COMPLAINT_TYPES,
  CONFIRM_MODES,
  DECLINE_REASONS,
  LOCALES,
  PRICE_TYPES,
  STAFF_STATUSES,
  VERIFICATION_STATUSES,
} from '@yeral/domain/model'
import { LEVELS } from '@yeral/domain/permissions'
import { REQUEST_ANSWERERS } from '@yeral/domain/rules'
import { pgEnum } from 'drizzle-orm/pg-core'

export const bookingType = pgEnum('booking_type', BOOKING_TYPES)
export const bookingStatus = pgEnum('booking_status', BOOKING_STATUSES)
export const cancelledBy = pgEnum('cancelled_by', CANCELLED_BY)
export const bookingSource = pgEnum('booking_source', BOOKING_SOURCES)
export const confirmMode = pgEnum('confirm_mode', CONFIRM_MODES)
export const declineReason = pgEnum('decline_reason', DECLINE_REASONS)
export const businessCancelReason = pgEnum('business_cancel_reason', BUSINESS_CANCEL_REASONS)
export const complaintType = pgEnum('complaint_type', COMPLAINT_TYPES)
export const priceType = pgEnum('price_type', PRICE_TYPES)
export const verificationStatus = pgEnum('verification_status', VERIFICATION_STATUSES)
export const staffStatus = pgEnum('staff_status', STAFF_STATUSES)
export const clientSource = pgEnum('client_source', CLIENT_SOURCES)
export const locale = pgEnum('locale', LOCALES)
export const level = pgEnum('level', LEVELS)
export const requestAnswerers = pgEnum('request_answerers', REQUEST_ANSWERERS)
/** An invite's answer; `pending` past its `expiresAt` reads as expired (no job needed). */
export const inviteStatus = pgEnum('invite_status', ['pending', 'accepted', 'declined', 'cancelled'])
export const codePurpose = pgEnum('code_purpose', ['login', 'change_phone'])
