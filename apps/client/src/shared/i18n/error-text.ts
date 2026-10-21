import { isApiError } from '@yeral/sdk'
import { useTranslations } from 'use-intl'

/** The words for a failed request: `errors.<code>` with the api's details as its values (systemPatterns "API errors"). */
export function useErrorText() {
  const t = useTranslations('errors')
  return (error: unknown): string => {
    if (!isApiError(error)) return t('internal')
    // every code has a message (CI checks); the details carry the values its message names
    return t(error.code as 'internal', error.details as never)
  }
}
