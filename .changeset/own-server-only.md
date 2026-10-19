---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/sdk': minor
---

The api runs only on the own server (ADR 0024): the Cloudflare Workers entry, Wrangler and Hyperdrive are gone.
`GET /v1/places/ip` is removed with `ipPlaceSchema` and `sdk.catalog.ipPlace()`: it read Cloudflare's request data and
always answered `{ place: null }` on Node. No app used it yet and the api isn't public, so `/v1` stays. The SMS log no
longer keeps every message in memory.
