/**
 * What a week block has room for (B7-Calendar · WeekBlock), in px at its 12/13 px type: the time range «10:00–11:00»,
 * the start «10:00», the status icon or dot with its gap, a marker (phone, alert), the request's TimerPill S, the
 * fewest letters worth showing of a name, and the block's side padding.
 */
const RANGE = 76
const START = 36
const ICON = 16
const DOT = 10
const MARK = 16
const TIMER = 64
const NAME = 36
const PAD = 12
/** Four lines of 14–15 px and the padding: where a long block's time left can have a line of its own. */
const FOUR_LINES = 62
/** Two lines: where a 30-minute block's time left can go under its start and client. */
const TWO_LINES = 30

/** The room the time left takes at the top right (WeekBlock pads the first line by it). */
export const TIMER_ROOM = TIMER

export type BlockSize = 'long' | 'medium' | 'short'

export type BlockFit = {
  /** The first line's time: the range (long blocks), the start, or none (the name only). */
  time: 'range' | 'start' | 'none'
  /** The client on the start's line (30 and 15 minutes; long blocks always have her line). */
  name: boolean
  /** The markers at the top right, or none when they would push the time out. */
  markers: boolean
  /** The time left at the top right, on a line of its own under the rest, or dropped (the name and the card keep it). */
  timer: 'top' | 'line' | 'none'
}

/**
 * The parts a block shows at its width and height, so no text is ever cut mid-time: the timer pill moves to its own
 * line and then drops first, then the markers, then the range shrinks to the start, then the client's name gives way
 * to the time (30 and 15 minutes) and at the narrowest only the name is left. The hover card and the block's
 * accessible name always carry everything.
 */
export function blockFit({
  width,
  height,
  size,
  markers,
  timer,
}: {
  width: number
  height: number
  size: BlockSize
  markers: number
  timer: boolean
}): BlockFit {
  const lead = size === 'short' ? DOT : ICON
  const marked = markers > 0 && width - PAD - markers * MARK >= lead + START
  const room = width - PAD - (marked ? markers * MARK : 0)
  const own = (size === 'long' ? height >= FOUR_LINES : size === 'medium' && height >= TWO_LINES) && width - PAD >= TIMER
  if (size === 'long') {
    const time = room >= lead + RANGE ? 'range' : room >= lead + START ? 'start' : 'none'
    const first = time === 'range' ? RANGE : START
    const top = time !== 'none' && room >= lead + first + TIMER
    return { time, name: true, markers: marked, timer: !timer ? 'none' : top ? 'top' : own ? 'line' : 'none' }
  }
  const both = room >= lead + START + NAME
  const time = room >= lead + START ? 'start' : 'none'
  const top = both && room >= lead + START + NAME + TIMER
  return {
    time,
    name: both || time === 'none',
    markers: marked,
    timer: !timer ? 'none' : top ? 'top' : own ? 'line' : 'none',
  }
}
