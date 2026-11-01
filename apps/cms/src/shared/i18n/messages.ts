/**
 * The app's words (skill `i18n`, ADR 0022): the shared namespaces of `@yeral/i18n` (`common`, `status`, `errors`, `fmt`
 * …) plus the app's own from `messages/en.json`. The Ýeral team reads the tool in English in every market, so there's
 * no language to choose.
 */
import { appMessages, messages as shared, type SharedMessages } from '@yeral/i18n'
import en from '../../../messages/en.json'

export type CmsMessages = typeof en
export type Messages = SharedMessages & CmsMessages

/** The words (longer by Storybook's «Text: Russian length» when it's on, `appMessages`). */
export const messages = (): Messages => appMessages(shared.en, en)
