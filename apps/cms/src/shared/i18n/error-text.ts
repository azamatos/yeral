import { isApiError } from '@yeral/sdk'
import { useTranslations } from 'use-intl'

/** The words for a failed request: `errors.<code>` with the api's details as its values (systemPatterns "API errors"). */
export function useErrorText() {
  const t = useTranslations()
  return (error: unknown): string => {
    if (!isApiError(error)) return t('errors.internal')
    // the shared words for it speak of a booking; here it's a business, a review or an account someone else just changed
    if (error.code === 'invalid_status') return t('failed.changed')
    // every code has a message (CI checks); the details carry the values its message names
    return t(`errors.${error.code}` as 'errors.internal', error.details as never)
  }
}
