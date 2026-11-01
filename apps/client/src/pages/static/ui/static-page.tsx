import { MARKET } from '@yeral/domain/market'
import { useTranslations } from 'use-intl'
import { site } from '@/shared/config'
import { wrap } from '@/shared/ui'
import texts from '../../../../messages/pages.en.json'

export type StaticPageName = keyof typeof texts

type Section = { heading?: string; paragraphs?: string[]; items?: string[] }

/**
 * About, Help, Privacy and Terms (design `/tk/about`… «Static pages», book F-034, Q-033): the site's header, a 720 text
 * column, the footer. Their words are in `messages/pages.en.json`, which only these routes load; who runs Ýeral comes from
 * the market and its address from the deployment, so no text names either.
 */
export function StaticPage({ page }: { page: StaticPageName }) {
  const t = useTranslations()
  const brand = t('common.brand')
  const text: { updated?: string; sections: Section[] } = texts[page]
  const fill = (words: string) =>
    words.replaceAll('{brand}', brand).replaceAll('{operator}', MARKET.legal.operator).replaceAll('{country}', MARKET.legal.country)
  const email = site.support.email
  return (
    <div className={`${wrap} py-10 sm:py-14`}>
      <article className="mx-auto flex w-full max-w-180 flex-col gap-8 text-body text-n-900">
        <header className="flex flex-col gap-2">
          <h1 className="m-0 text-h1 font-bold">{t(`pages.${page}.title`, { brand })}</h1>
          {text.updated && <p className="m-0 text-small text-n-600">{text.updated}</p>}
        </header>
        {text.sections.map((section, i) => (
          <section key={section.heading ?? i} className="flex flex-col gap-3">
            {section.heading && <h2 className="m-0 text-h3 font-semibold">{fill(section.heading)}</h2>}
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="m-0">
                {fill(paragraph)}
              </p>
            ))}
            {section.items && (
              <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
                {section.items.map((item) => (
                  <li key={item}>{fill(item)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        {email && (
          <p className="m-0">
            {t.rich('pages.contact', {
              email,
              a: (chunks) => (
                <a href={`mailto:${email}`} className="font-semibold text-a-600 underline">
                  {chunks}
                </a>
              ),
            })}
          </p>
        )}
      </article>
    </div>
  )
}
