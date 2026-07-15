/**
 * NIP-102 BOLT12 zap (kind 9736) parsing, validation, and relay fetch.
 *
 * Spec: https://github.com/matbalez/universal-lightning-wallet/blob/main/NIP-102.md
 *
 * Kind 9736 is also used by unrelated protocols on the public network — we only
 * surface events that carry NIP-102 tags (`proof` / `offer` / `description`).
 */
import { SimplePool, verifyEvent, type Event, type Filter } from 'nostr-tools';
import { decodePayerProof, verifyPayerProof, extractInvoiceFields } from 'bolt12-utils';
import { fmt, short } from './format';
import { loadRelays, relayHost } from './relays';

export const ZAP_KIND = 9736;
export const ZAP_INTENT_KIND = 9738;

export interface RelayStat {
	url: string;
	host: string;
	/** NIP-102-shaped events seen on this relay in the last query. */
	count: number;
	status: 'ok' | 'warn' | 'err';
	meta: string;
	dot: string;
}

export interface ValidationRow {
	t: string;
	d: string;
	pass: boolean;
}

export interface ParsedZap {
	event: Event;
	eventId: string;
	recipientPubkey: string;
	payerPubkey: string;
	amountMsat: number;
	amountSats: number;
	offer: string;
	proof: string;
	targetEventId: string;
	addressable: string;
	eventKind: number | null;
	comment: string;
	intentId: string;
	payerNote: string;
	paymentHash: string;
	createdAt: number;
	/** Relays that returned this event id in the last fetch. */
	seenOn: string[];
	validation: ValidationRow[];
	structurallyValid: boolean;
}

export interface FetchZapsResult {
	zaps: ParsedZap[];
	relays: RelayStat[];
	totalSats: number;
	validCount: number;
	rawKindCount: number;
}

function tagValues(event: Event, name: string): string[] {
	return event.tags.filter((t) => t[0] === name && t[1] != null).map((t) => t[1]!);
}

function singleTag(event: Event, name: string): string {
	const vals = tagValues(event, name);
	return vals.length === 1 ? vals[0]! : '';
}

function countTag(event: Event, name: string): number {
	return event.tags.filter((t) => t[0] === name).length;
}

function isPositiveIntString(s: string): boolean {
	return /^[1-9]\d*$/.test(s);
}

function canonicalizeBolt12(s: string): string {
	return s.toLowerCase().replace(/\s+/g, '').replace(/\+/g, '');
}

/** True when the event looks like a NIP-102 zap (vs other kind-9736 uses). */
export function looksLikeNip102(event: Event): boolean {
	const proof = singleTag(event, 'proof') || tagValues(event, 'proof')[0] || '';
	const offer = singleTag(event, 'offer') || tagValues(event, 'offer')[0] || '';
	const desc = singleTag(event, 'description') || tagValues(event, 'description')[0] || '';
	if (proof.toLowerCase().startsWith('lnp')) return true;
	if (offer.toLowerCase().startsWith('lno')) return true;
	if (desc.includes('"kind":9738') || desc.includes('"kind": 9738')) return true;
	return false;
}

function parseIntentId(description: string): { intentId: string; intentPubkey: string; intentOk: boolean; detail: string } {
	if (!description) return { intentId: '', intentPubkey: '', intentOk: false, detail: 'missing description tag' };
	try {
		const raw = JSON.parse(description) as Event;
		if (raw.kind !== ZAP_INTENT_KIND) {
			return { intentId: '', intentPubkey: '', intentOk: false, detail: `intent kind ${raw.kind}, expected ${ZAP_INTENT_KIND}` };
		}
		if (!raw.id || !raw.pubkey || !raw.sig) {
			return { intentId: '', intentPubkey: '', intentOk: false, detail: 'intent missing id/pubkey/sig' };
		}
		const sigOk = verifyEvent(raw);
		if (!sigOk) {
			return { intentId: raw.id, intentPubkey: raw.pubkey, intentOk: false, detail: 'intent signature invalid' };
		}
		return { intentId: raw.id, intentPubkey: raw.pubkey, intentOk: true, detail: `kind ${ZAP_INTENT_KIND} · id ${short(raw.id, 8, 4)}` };
	} catch (e) {
		return {
			intentId: '',
			intentPubkey: '',
			intentOk: false,
			detail: e instanceof Error ? e.message : String(e)
		};
	}
}

export function parseBolt12Zap(event: Event, seenOn: string[] = []): ParsedZap {
	const validation: ValidationRow[] = [];

	const sigOk =
		event.kind === ZAP_KIND && !!event.id && !!event.pubkey && !!event.sig && verifyEvent(event);
	validation.push({
		t: 'Zap event signature valid',
		d: sigOk ? 'schnorr · kind 9736' : 'invalid signature or kind',
		pass: sigOk
	});

	const structureOk =
		countTag(event, 'description') === 1 &&
		countTag(event, 'p') === 1 &&
		countTag(event, 'amount') === 1 &&
		countTag(event, 'offer') === 1 &&
		countTag(event, 'proof') === 1 &&
		countTag(event, 'e') <= 1 &&
		countTag(event, 'a') <= 1 &&
		!(countTag(event, 'e') === 1 && countTag(event, 'a') === 1);

	const amountStr = singleTag(event, 'amount');
	const amountOk = !!amountStr && isPositiveIntString(amountStr);
	const offerRaw = singleTag(event, 'offer');
	const proofRaw = singleTag(event, 'proof');
	const recipientPubkey = singleTag(event, 'p');
	const payerTag = singleTag(event, 'P');
	const pTagOk = !payerTag || payerTag === event.pubkey;
	const exclusiveTarget = !(singleTag(event, 'e') && singleTag(event, 'a'));

	validation.push({
		t: 'Zap event structure present',
		d:
			structureOk && amountOk && pTagOk
				? 'kind 9736 · single p · amount · offer · proof'
				: 'missing/duplicate tags or invalid amount / P mismatch',
		pass: structureOk && amountOk && pTagOk
	});

	const { intentId, intentPubkey, intentOk, detail: intentDetail } = parseIntentId(
		singleTag(event, 'description')
	);
	validation.push({
		t: 'Intent fields present',
		d: intentDetail,
		pass: intentOk && intentPubkey === event.pubkey
	});

	validation.push({
		t: 'Target tags are exclusive',
		d: exclusiveTarget ? 'at most one of e / a' : 'both e and a present (invalid)',
		pass: exclusiveTarget
	});

	const expectedNote = intentId ? `nostr:nip102:${intentId}` : '';
	let proofCryptoOk = false;
	let noteMatchesProof = false;
	let amountMatchesProof = false;
	let cryptoDetail = 'proof not decoded';
	let paymentHash = '';
	let proofNote = '';

	if (proofRaw && proofRaw.toLowerCase().startsWith('lnp')) {
		try {
			const decoded = decodePayerProof(proofRaw);
			const verdict = verifyPayerProof(decoded.proof);
			proofCryptoOk = !!verdict.valid;
			proofNote =
				(decoded.proof as { proofNote?: string; payerNote?: string }).proofNote ||
				(decoded.proof as { payerNote?: string }).payerNote ||
				'';
			noteMatchesProof = !!expectedNote && proofNote === expectedNote;
			const inv = extractInvoiceFields(decoded.records);
			const msat = inv.invoice_amount ?? inv.invreq_amount ?? 0n;
			const amountMsat = amountStr ? Number(amountStr) : 0;
			amountMatchesProof = Number(msat) === amountMsat;
			paymentHash = toHexMaybe(inv.invoice_payment_hash);
			cryptoDetail = proofCryptoOk
				? `preimage · sigs · Merkle OK · ${Math.round(Number(msat) / 1000)} sats`
				: verdict.error || 'verifyPayerProof failed';
		} catch (e) {
			cryptoDetail = e instanceof Error ? e.message : String(e);
		}
	} else {
		cryptoDetail = proofRaw ? 'proof tag is not an lnp bech32' : 'missing proof tag';
	}

	validation.push({
		t: 'Payer-note binds intent id',
		d: noteMatchesProof
			? `nostr:nip102:${short(intentId, 8, 4)}`
			: expectedNote
				? 'missing or mismatched invreq_payer_note binding'
				: 'need intent id to bind',
		pass: noteMatchesProof
	});
	validation.push({
		t: 'lnp proof cryptographically valid',
		d: cryptoDetail,
		pass: proofCryptoOk
	});
	validation.push({
		t: 'Proof note matches zap intent',
		d: noteMatchesProof ? 'proof note = nostr:nip102:<intentId>' : 'proof note does not match intent',
		pass: noteMatchesProof
	});
	validation.push({
		t: 'Proof amount matches zap amount',
		d: amountMatchesProof
			? `${fmt(Math.round(Number(amountStr || 0) / 1000))} sats`
			: 'proof amount differs from zap amount tag',
		pass: amountMatchesProof
	});

	const amountMsat = amountStr && isPositiveIntString(amountStr) ? Number(amountStr) : 0;
	const kTag = singleTag(event, 'k');
	const eventKind = kTag && /^\d+$/.test(kTag) ? Number(kTag) : null;

	return {
		event,
		eventId: event.id,
		recipientPubkey,
		payerPubkey: payerTag || (sigOk ? event.pubkey : ''),
		amountMsat,
		amountSats: Math.round(amountMsat / 1000),
		offer: offerRaw ? canonicalizeBolt12(offerRaw) : '',
		proof: proofRaw ? canonicalizeBolt12(proofRaw) : '',
		targetEventId: singleTag(event, 'e'),
		addressable: singleTag(event, 'a'),
		eventKind,
		comment: event.content ?? '',
		intentId,
		payerNote: expectedNote,
		paymentHash,
		createdAt: event.created_at,
		seenOn,
		validation,
		structurallyValid: validation.every((v) => v.pass)
	};
}

function toHexMaybe(bytes: Uint8Array | undefined): string {
	if (!bytes) return '';
	let s = '';
	for (const b of bytes) s += b.toString(16).padStart(2, '0');
	return s;
}

/**
 * Deduplicate by payment_hash (NIP-102). On conflict keep the lower amount.
 * Falls back to event id when payment_hash is unavailable.
 */
export function dedupeZaps(zaps: ParsedZap[]): ParsedZap[] {
	const byKey = new Map<string, ParsedZap>();
	for (const z of zaps) {
		const key = z.paymentHash || z.eventId;
		const prev = byKey.get(key);
		if (!prev) {
			byKey.set(key, z);
			continue;
		}
		const mergedSeen = [...new Set([...prev.seenOn, ...z.seenOn])];
		if (z.amountMsat < prev.amountMsat) {
			byKey.set(key, { ...z, seenOn: mergedSeen });
		} else if (z.amountMsat === prev.amountMsat && z.createdAt > prev.createdAt) {
			byKey.set(key, { ...z, seenOn: mergedSeen });
		} else {
			byKey.set(key, { ...prev, seenOn: mergedSeen });
		}
	}
	return [...byKey.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function targetLabel(z: ParsedZap): string {
	if (z.targetEventId) return z.eventKind != null ? `zap on kind ${z.eventKind} event` : 'zap on a note';
	if (z.addressable) {
		return z.eventKind != null ? `zap on kind ${z.eventKind} addressable` : 'zap on an addressable event';
	}
	return 'profile zap';
}

export function displayHandle(pubkey: string, anonLabel = 'anon'): string {
	if (!pubkey) return anonLabel;
	return `@${short(pubkey, 4, 4)}`;
}

function statusMeta(count: number, err: boolean): Pick<RelayStat, 'status' | 'meta' | 'dot'> {
	if (err) return { status: 'err', meta: 'error · unreachable', dot: 'var(--red)' };
	if (count === 0) return { status: 'warn', meta: 'read · no NIP-102 zaps', dot: 'var(--amber)' };
	return { status: 'ok', meta: 'read · kind 9736', dot: 'var(--green)' };
}

/**
 * Query relays for kind 9736, keep NIP-102-shaped events, parse + dedupe.
 */
export async function fetchBolt12Zaps(opts?: {
	relays?: string[];
	limit?: number;
	ids?: string[];
}): Promise<FetchZapsResult> {
	const relays = [...new Set((opts?.relays ?? loadRelays()).filter(Boolean))];
	const limit = opts?.limit ?? 100;
	const filter: Filter = { kinds: [ZAP_KIND], limit };
	if (opts?.ids?.length) filter.ids = opts.ids;

	const pool = new SimplePool();
	const perRelay = new Map<string, { nip102: Event[]; raw: number; err: boolean }>();
	for (const r of relays) perRelay.set(r, { nip102: [], raw: 0, err: false });

	try {
		await Promise.all(
			relays.map(async (url) => {
				try {
					const evs = await pool.querySync([url], filter);
					const nip102 = evs.filter(looksLikeNip102);
					perRelay.set(url, { nip102, raw: evs.length, err: false });
				} catch {
					perRelay.set(url, { nip102: [], raw: 0, err: true });
				}
			})
		);
	} finally {
		try {
			pool.close(relays);
		} catch {
			/* ignore */
		}
	}

	const byId = new Map<string, { event: Event; seenOn: string[] }>();
	let rawKindCount = 0;
	for (const [url, info] of perRelay) {
		rawKindCount += info.raw;
		for (const e of info.nip102) {
			const prev = byId.get(e.id);
			if (prev) prev.seenOn.push(url);
			else byId.set(e.id, { event: e, seenOn: [url] });
		}
	}

	const parsed = [...byId.values()].map(({ event, seenOn }) => parseBolt12Zap(event, seenOn));
	const zaps = dedupeZaps(parsed);
	const validCount = zaps.filter((z) => z.structurallyValid).length;
	const totalSats = zaps
		.filter((z) => z.structurallyValid)
		.reduce((a, z) => a + z.amountSats, 0);

	const relayStats: RelayStat[] = relays.map((url) => {
		const info = perRelay.get(url) ?? { nip102: [], raw: 0, err: true };
		const count = info.nip102.length;
		const sm = statusMeta(count, info.err);
		return {
			url,
			host: relayHost(url),
			count,
			...sm
		};
	});

	return { zaps, relays: relayStats, totalSats, validCount, rawKindCount };
}
