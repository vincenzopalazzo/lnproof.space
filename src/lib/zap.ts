/**
 * NIP-102 BOLT12 zap presentation helpers.
 *
 * The explorer ships concept fixtures (see `data.ts`) so the feed/detail
 * screens match the design without contacting Nostr relays by default —
 * that preserves the project's "zero third-party requests" privacy stance.
 *
 * Structural checks mirror the NIP-102 validation steps a real client would
 * run before counting a kind 9736 as a verified zap. Live cryptographic
 * verification of embedded lnp proofs reuses the existing paste-and-decode
 * path (open the proof string in the Proof screen).
 *
 * Spec: https://github.com/matbalez/universal-lightning-wallet/blob/main/NIP-102.md
 * Offer discovery (NIP-100): kind 0 `lno` field.
 */
import { decodePayerProof, verifyPayerProof, extractInvoiceFields } from 'bolt12-utils';
import { fmt, short } from './format';
import type { SampleRelay, SampleZap } from './data';
import { SAMPLE_RELAYS, SAMPLE_ZAPS } from './data';

export const ZAP_KIND = 9736;
export const ZAP_INTENT_KIND = 9738;

export interface RelayRow {
	url: string;
	host: string;
	meta: string;
	count: string;
	/** CSS color token, e.g. `var(--green)`. */
	dot: string;
}

export interface ZapFeedItem {
	index: number;
	amountSats: number;
	amountLabel: string;
	payer: string;
	recipient: string;
	target: string;
	comment: string;
	hasComment: boolean;
	eventIdShort: string;
	ago: string;
	relayChips: string[];
	/** Structural NIP-102 checklist result for the fixture / event. */
	structurallyValid: boolean;
}

export interface ZapStat {
	k: string;
	v: string;
	color: string;
}

export interface BindingStep {
	n: string;
	title: string;
	code: string;
	line: boolean;
}

export interface TagRow {
	k: string;
	v: string;
}

export interface ValidationRow {
	t: string;
	d: string;
	pass: boolean;
}

export interface ZapDetailView {
	eventIdShort: string;
	amountLabel: string;
	payer: string;
	recipient: string;
	target: string;
	comment: string;
	hasComment: boolean;
	intentIdShort: string;
	binding: BindingStep[];
	tags: TagRow[];
	validation: ValidationRow[];
	relays: RelayRow[];
	relayCount: number;
	/** True only when every structural NIP-102 check passes. */
	structurallyValid: boolean;
	/** Canonical raw offer pinned in the zap (NIP-100 discovery is separate). */
	offerShort: string;
	proofShort: string;
}

function relayHost(url: string): string {
	return url.replace(/^wss:\/\//, '').replace(/^ws:\/\//, '');
}

/** Shape + optional live lnp cross-checks for a concept fixture. */
export function validateZapStructure(z: SampleZap): ValidationRow[] {
	const hasP = !!z.recipientPubkey;
	const hasAmount = z.amountSats > 0;
	const hasOffer = !!z.offer && z.offer.toLowerCase().startsWith('lno');
	const hasProof = !!z.proof && z.proof.toLowerCase().startsWith('lnp');
	const hasIntent = !!z.intentId;
	const expectedNote = `nostr:nip102:${z.intentId}`;
	const hasPayerNote = z.payerNote === expectedNote;
	const exclusiveTarget = !(z.eventId && z.addressable);
	const tagsOk = hasP && hasAmount && hasOffer && hasProof && hasIntent;

	// Best-effort crypto cross-check against the fixture's real lnp (minted offline).
	let proofCryptoOk = false;
	let noteMatchesProof = false;
	let amountMatchesProof = false;
	let cryptoDetail = 'proof not decoded';
	if (hasProof) {
		try {
			const decoded = decodePayerProof(z.proof);
			const verdict = verifyPayerProof(decoded.proof);
			proofCryptoOk = !!verdict.valid;
			const proofNote = (decoded.proof as { proofNote?: string; payerNote?: string }).proofNote
				|| (decoded.proof as { payerNote?: string }).payerNote
				|| '';
			noteMatchesProof = proofNote === expectedNote;
			const inv = extractInvoiceFields(decoded.records);
			const msat = inv.invoice_amount ?? inv.invreq_amount ?? 0n;
			const sats = Math.round(Number(msat) / 1000);
			amountMatchesProof = sats === z.amountSats;
			cryptoDetail = proofCryptoOk
				? `preimage · sigs · Merkle OK · ${sats} sats`
				: (verdict.error || 'verifyPayerProof failed');
		} catch (e) {
			cryptoDetail = e instanceof Error ? e.message : String(e);
		}
	}

	return [
		{
			t: 'Zap event structure present',
			d: 'kind 9736 · single p · amount · offer · proof (fixture fields)',
			pass: tagsOk
		},
		{
			t: 'Intent fields present',
			d: `kind ${ZAP_INTENT_KIND} · zap_id present (fixture)`,
			pass: hasIntent && hasP && hasAmount && hasOffer
		},
		{
			t: 'Payer-note binds intent id',
			d: hasPayerNote
				? `nostr:nip102:${short(z.intentId, 8, 4)}`
				: 'missing invreq_payer_note binding',
			pass: hasPayerNote
		},
		{
			t: 'Target tags are exclusive',
			d: exclusiveTarget ? 'at most one of e / a' : 'both e and a present (invalid)',
			pass: exclusiveTarget
		},
		{
			t: 'lnp proof cryptographically valid',
			d: cryptoDetail,
			pass: proofCryptoOk
		},
		{
			t: 'Proof note matches zap intent',
			d: noteMatchesProof
				? 'proof note = nostr:nip102:<intentId>'
				: 'proof note does not match fixture payerNote',
			pass: noteMatchesProof
		},
		{
			t: 'Proof amount matches zap amount',
			d: amountMatchesProof
				? `${fmt(z.amountSats)} sats`
				: 'proof amount differs from zap amount tag',
			pass: amountMatchesProof
		}
	];
}

export function buildRelays(relays: SampleRelay[] = SAMPLE_RELAYS): RelayRow[] {
	return relays.map((r) => ({
		url: r.url,
		host: relayHost(r.url),
		meta: r.meta,
		count: r.count,
		dot: r.dot
	}));
}

export function buildZapFeed(zaps: SampleZap[] = SAMPLE_ZAPS): ZapFeedItem[] {
	return zaps.map((z, index) => {
		const validation = validateZapStructure(z);
		const structurallyValid = validation.every((v) => v.pass);
		return {
			index,
			amountSats: z.amountSats,
			amountLabel: fmt(z.amountSats),
			payer: z.payer,
			recipient: z.recipient,
			target: z.target,
			comment: z.comment,
			hasComment: z.comment.trim().length > 0,
			eventIdShort: short(z.eventIdFull, 4, 4),
			ago: z.ago,
			relayChips: z.relayIndexes.slice(0, 2).map((i) => relayHost(SAMPLE_RELAYS[i]?.url ?? '')),
			structurallyValid
		};
	});
}

export function buildZapStats(zaps: SampleZap[] = SAMPLE_ZAPS): ZapStat[] {
	// Dedup by payment_hash (NIP-102 counting rule); fixtures use unique hashes.
	const seen = new Set<string>();
	let total = 0;
	let counted = 0;
	for (const z of zaps) {
		if (seen.has(z.paymentHash)) continue;
		seen.add(z.paymentHash);
		total += z.amountSats;
		counted += 1;
	}
	return [
		{ k: 'Sample zaps', v: String(counted), color: 'var(--text)' },
		{ k: 'Total (sample)', v: fmt(total) + ' sats', color: 'var(--violet)' },
		{ k: 'Relays listed', v: String(SAMPLE_RELAYS.length), color: 'var(--text)' },
		{ k: 'Spec', v: 'NIP-102', color: 'var(--text2)' }
	];
}

export function buildZapDetail(index: number, zaps: SampleZap[] = SAMPLE_ZAPS): ZapDetailView {
	const z = zaps[index] ?? zaps[0];
	const intentShort = short(z.intentId, 8, 4);
	const validation = validateZapStructure(z);
	const structurallyValid = validation.every((v) => v.pass);

	const binding: BindingStep[] = [
		{
			n: '1',
			title: 'Payer signs a zap intent (kind 9738)',
			code: `{ kind:${ZAP_INTENT_KIND}, p, amount, offer, zap_id } → id ${intentShort}`,
			line: true
		},
		{
			n: '2',
			title: 'Payment carries the intent id as payer note',
			code: `invreq_payer_note = nostr:nip102:${intentShort}`,
			line: true
		},
		{
			n: '3',
			title: 'Settled lnp proof + intent embedded in the zap',
			code: `kind ${ZAP_KIND} · tags: description(9738) + proof(lnp1…)`,
			line: false
		}
	];

	const tags: TagRow[] = [
		{ k: 'description', v: `{"kind":${ZAP_INTENT_KIND},…,"id":"${intentShort}"}` },
		{ k: 'p', v: `${short(z.recipientPubkey, 6, 4)}  (recipient)` },
		...(z.payerPubkey
			? [{ k: 'P', v: `${short(z.payerPubkey, 6, 4)}  (payer)` }]
			: []),
		...(z.eventId ? [{ k: 'e', v: short(z.eventId, 6, 4) }] : []),
		...(z.addressable ? [{ k: 'a', v: z.addressable }] : []),
		...(z.eventKind != null ? [{ k: 'k', v: String(z.eventKind) }] : []),
		{ k: 'amount', v: `${z.amountSats * 1000} msat` },
		{ k: 'offer', v: short(z.offer, 10, 6) },
		{ k: 'proof', v: short(z.proof, 10, 6) }
	];

	const relays = z.relayIndexes
		.map((i) => SAMPLE_RELAYS[i])
		.filter((r): r is SampleRelay => !!r)
		.map((r) => ({
			url: r.url,
			host: relayHost(r.url),
			meta: r.meta,
			count: r.count,
			dot: r.dot
		}));

	return {
		eventIdShort: short(z.eventIdFull, 4, 4),
		amountLabel: fmt(z.amountSats),
		payer: z.payer,
		recipient: z.recipient,
		target: z.target,
		comment: z.comment,
		hasComment: z.comment.trim().length > 0,
		intentIdShort: intentShort,
		binding,
		tags,
		validation,
		relays,
		relayCount: relays.length,
		structurallyValid,
		offerShort: short(z.offer, 10, 6),
		proofShort: short(z.proof, 10, 6)
	};
}