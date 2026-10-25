import { FlaskConical, type LucideProps } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Pill } from '../pill'

/**
 * The example mark alone, for a map pin (DS-Patterns `.y-mpin.y-exp`): 14 at stroke 1.75, before the name, n-600 on
 * the white pin, white on the chosen ink pin; the pin is named «Glow Studio, example».
 */
export function ExampleIcon(props: LucideProps) {
  return <FlaskConical aria-hidden size={14} strokeWidth={1.75} {...props} />
}

/**
 * ExampleBadge (DS-Patterns → Status «ExampleBadge»): «Example» on the first launch's sample businesses (book Q-004),
 * after the name, never in its place: the neutral Pill with a flask, S 20 on search rows and pins, M 24 on business
 * cards (on the photo, top-left 10) and the business page header. Never violet (current or chosen) nor a status
 * colour (it says nothing about a booking). Not interactive: the page header's line explains it. A card or row is
 * named by its words with the badge after the name in its markup (drawn on the photo where it sits) and a hidden comma
 * between, «Glow Studio, Example» (an `aria-label` over what's seen trips axe's label-content rule); a map pin, whose
 * words are the name, says «Glow Studio, example» and shows `ExampleIcon`. The word comes from the caller.
 */
export function ExampleBadge({ size = 'm', ...props }: Omit<ComponentProps<typeof Pill>, 'tone' | 'icon'> & { size?: 's' | 'm' }) {
  return <Pill {...props} tone="neutral" size={size} icon={<ExampleIcon />} />
}
