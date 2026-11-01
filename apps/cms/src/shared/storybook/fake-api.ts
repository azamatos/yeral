/** The address a story's fake `fetch` was asked for, without its host. */
export const pathOf = (input: RequestInfo | URL) => new URL(input instanceof Request ? input.url : input.toString()).pathname

/** An answer like the api's: JSON, or nothing with `null`. */
export const json = (status: number, body: unknown) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
