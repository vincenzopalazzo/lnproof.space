# BOLT12 privacy score on the decode page

## Clarified Problem Statement

**Goal:** On the offer, invoice, and payer-proof decode pages, show a health-style privacy score that says how much information the string reveals about the parties to each other and to anyone who later reads it.

**Decisions:**
- The score lives on the same page as the decode, next to the decoded fields. It is a health indicator, not a separate screen and not a redaction tool.
- Judgment is structural and local. No network calls. Pasted strings still never leave the browser.
- A leak is party identity plus route hints: issuer name or domain, issuer node id, payer id, payer note, metadata, introduction node, path length, and distinctive blinded-payinfo fees or CLTV.
- The wording addresses the reader of the page: "this string reveals X about its creator," not "you are about to share X."

**Constraints:**
- Ground every finding in BOLT 12 (lightning/bolts `12-offer-encoding.md`), and cite the rule in the finding.
- Must not break decoding. A string that decodes today still decodes, score or not.
- Must not send any identifier off the device. No node-directory or gossip lookup in this change.
- Description, amount, quantity, and expiry are not scored as leaks. They are the point of the string.

**Non-goals:**
- Redacting fields or re-encoding a shareable string.
- A live node lookup. Tracked as a follow-up issue.
- Scoring description, amount, quantity, and expiry as leaks. Tracked as a follow-up issue, because it needs a definition of "non-essential" that does not flag every normal offer.

**Success criteria:**
- An offer with `offer_issuer` containing a domain, a stable `offer_issuer_id` and no paths, or a one-hop `offer_paths` scores worse than an offer that identifies its issuer only through a multi-hop blinded path. A blinded hop id is derived, so it is not compared with the issuer key.
- An invoice or proof that reveals `invreq_payer_id`, `invreq_metadata`, or `invreq_payer_note` says exactly which of those is exposed and why the spec treats it as sensitive.
- A proof that omits those TLVs scores better than the same invoice with them present, so selective disclosure is visible in the score.
- The score renders on the existing offer, invoice, and proof views with no extra navigation.

## Approaches Considered

### Approach A: Per-field annotations only
- Sketch: add a one-line note under each sensitive decoded field. No aggregate score.
- Affected files: `src/lib/decode.ts`, `Offer.svelte`, `Invoice.svelte`, `Proof.svelte`.
- Tradeoffs: cheapest, but the user asked for a health score, and notes alone do not say how much is lost overall.
- Effort: S

### Approach B: Health score computed in the view model
- Sketch: a pure function maps the already-decoded view to a score and a short list of findings. The three decode views render one shared `PrivacyScore.svelte` panel. Findings are deterministic from the fields, so the same string always scores the same.
- Affected files: `src/lib/privacy.ts` (new), `src/lib/decode.ts`, `src/lib/components/PrivacyScore.svelte` (new), the three decode views, `scripts/check-privacy.mjs` (new).
- Tradeoffs: matches the request, stays inside the browser, and is testable without a dev server. The score is a heuristic, so the weights need to be written down and defended, not hidden.
- Effort: M

### Approach C: Live lookup against a node directory
- Sketch: hash or query `offer_issuer_id` and the introduction node against a node directory or gossip, and raise the score when the node is a known public node.
- Affected files: everything in B, plus a fetch path and a consent step.
- Tradeoffs: more accurate for "is this node already public", but it sends identifiers off the device and breaks the current privacy promise. Explicitly deferred to an issue.
- Effort: L

## Recommendation

Approach B. It is the only option that gives a health score without breaking the browser-only privacy promise. Approach C is filed as an issue, not built.

## Scoring sketch

Each finding carries a weight. The score is an exposure score: 0 means nothing identifying, 100 means maximally exposed. It is the share of a realistic worst case, capped at 100, and the badge reads "reveals a lot", "reveals some", or "reveals little" so the direction is unambiguous.

- High: `offer_issuer` containing an email, domain, or handle; `offer_issuer_id` present while `offer_paths` is absent; `invreq_payer_note` present. `invreq_metadata` is not scored: the spec requires it to be an unpredictable nonce, and the bytes do not say whether it is one.
- Medium: `offer_issuer_id` present alongside blinded paths; `invreq_payer_id` revealed in a proof; a blinded path of length 1, which is the spec's own opt-out of blinded-path privacy. The hop id is blinded, so it is not matched against the issuer key. `blinded_payinfo` whose fee or CLTV differs from the common baseline of zero fees and a CLTV delta of 144. That baseline is a heuristic, not a spec default, and it is labeled as such.
- Low: `offer_metadata` present but opaque; introduction node is a bare pubkey rather than a `sciddir`.

A proof is scored on the fields it reveals, not the fields it omits. Omitted TLVs are the privacy feature working, and the panel should say so.

## Open questions

- Exact weights. Settle them in the plan, and pin them with the regression script so they cannot drift silently.
- Whether `invoice_node_id` equal to `offer_issuer_id` is its own finding or just a restatement of the issuer-id finding. Lean toward one finding, not two.
