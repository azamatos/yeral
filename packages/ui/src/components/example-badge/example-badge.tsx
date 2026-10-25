import { FlaskConical, type LucideProps } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Pill } from '../pill'

/** The example mark alone, for a map pin: before the name, n-600 on the white pin, white on the selected ink pin. */
export function ExampleIcon(props: LucideProps) {
  return <FlaskConical aria-hidden strokeWidth={2} {...props} />
}

/**
 * ExampleBadge (DS-Patterns → Status «ExampleBadge»): «Example» on the first launch's sample businesses (book Q-004),
 * after the name, never in its place: the neutral Pill with a flask, S 20 on search rows and pins, M 24 on business
 * cards (on the photo, top-left 10) and the business page header. Never violet (current or chosen) nor a status
 * colour (it says nothing about a booking). Not interactive: the page header's line explains it. A card or row named
 * by its words puts the badge after the name in its markup («Glow Studio Example», drawn on the photo where it sits);
 * a pin named «Glow Studio, example» carries only the flask (`ExampleIcon`). The word comes from the caller.
 */
export function ExampleBadge({ size = 'm', ...props }: Omit<ComponentProps<typeof Pill>, 'tone' | 'icon'> & { size?: 's' | 'm' }) {
  return <Pill {...props} tone="neutral" size={size} icon={<ExampleIcon />} />
}
