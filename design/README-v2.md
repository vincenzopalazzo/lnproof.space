# Design v2 handoff (BOLT12 Zaps)

Primary prototype for the NIP-102 zap feed + detail work:

- `design/project/BOLT12 Explorer v2.dc.html`

This extends the original BOLT12 Explorer prototype with:

- Landing card for **BOLT12 Zaps**
- Header **Zaps** nav chip
- Zap feed (stats, recent events, relay sidebar)
- Zap detail (proof binding, tags, NIP-102 validation, published relays)

Implemented in:

- `src/lib/components/ZapFeed.svelte`
- `src/lib/components/ZapDetail.svelte`
- `src/lib/zap.ts` / `src/lib/data.ts` (concept fixtures)
