/** Structured JSON logs that work the same on Workers and Node. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void
  info(msg: string, data?: Record<string, unknown>): void
  warn(msg: string, data?: Record<string, unknown>): void
  error(msg: string, data?: Record<string, unknown>): void
}

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

export function createLogger(level: LogLevel = 'info', base: Record<string, unknown> = {}): Logger {
  const write = (lvl: LogLevel) => (msg: string, data?: Record<string, unknown>) => {
    if (ORDER[lvl] < ORDER[level]) return
    const line = JSON.stringify({ level: lvl, time: new Date().toISOString(), msg, ...base, ...data })
    if (lvl === 'error' || lvl === 'warn') console.error(line)
    // eslint-disable-next-line no-console -- the log sink: stdout on Node, Workers Logs on Cloudflare
    else console.log(line)
  }
  return { debug: write('debug'), info: write('info'), warn: write('warn'), error: write('error') }
}

/** Silent logger for tests. */
export const nullLogger: Logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }
