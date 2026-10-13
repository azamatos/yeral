import { getRequestConfig } from 'next-intl/server'

/**
 * Russian only for now. Turkmen ships later as /tk/... (needs locale routing in proxy.ts);
 * every UI string already lives in messages/<locale>.json.
 */
export const LOCALE = 'ru'
export const TIME_ZONE = 'Asia/Ashgabat'

export default getRequestConfig(async () => ({
  locale: LOCALE,
  timeZone: TIME_ZONE,
  messages: (await import(`../../messages/${LOCALE}.json`)).default,
}))
