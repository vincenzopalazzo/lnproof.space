/**
 * Presentation helpers for NIP-102 zap feed / detail screens.
 * Event parsing and relay I/O live in `nip102.ts`.
 */
import { fmt, short } from './format';
import type { ParsedZap, RelayStat, ValidationRow } from './nip102';
import { displayHandle, targetLabel, ZAP_KIND, ZAP_INTENT_KIND } from './nip102';
import { relayHost } from './relays';

export type { ParsedZap, RelayStat, ValidationRow };
export { ZAP_KIND, ZAP_INTENT_KIND, displayHandle, targetLabel };

export interface RelayRow {
	url: string;
	host: string;
	meta: string;
	count: string;
	dot: string;
}

export interface ZapFeedItem {
	eventId: string;
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

export interface ZapDetailView {
	eventId: string;
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
	structurallyValid: boolean;
	offerShort: string;
	proofShort: string;
	proof: string;
}

export function relativeAgo(createdAt: number, nowSec = Math.floor(Date.now() / 1000)): string {
	const d = Math.max(0, nowSec - createdAt);
	if (d < 60) return `${d}s ago`;
	if (d < 3600) return `${Math.floor(d / 60)}m ago`;
	if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
	if (d < 86400 * 30) return `${Math.floor(d / 86400)}d ago`;
	return `${Math.floor(d / (86400 * 30))}mo ago`;
}

export function buildRelays(relays: RelayStat[]): RelayRow[] {
	return relays.map((r) => ({
		url: r.url,
		host: r.host,
		meta: r.meta,
		count: String(r.count),
		dot: r.dot
	}));
}

export function buildZapFeed(zaps: ParsedZap[]): ZapFeedItem[] {
	return zaps.map((z) => ({
		eventId: z.eventId,
		amountSats: z.amountSats,
		amountLabel: fmt(z.amountSats),
		payer: displayHandle(z.payerPubkey),
		recipient: displayHandle(z.recipientPubkey, 'unknown'),
		target: targetLabel(z),
		comment: z.comment,
		hasComment: z.comment.trim().length > 0,
		eventIdShort: short(z.eventId, 4, 4),
		ago: relativeAgo(z.createdAt),
		relayChips: z.seenOn.slice(0, 2).map(relayHost),
		structurallyValid: z.structurallyValid
	}));
}

export function buildZapStats(
	zaps: ParsedZap[],
	relayCount: number,
	validCount: number,
	totalSats: number
): ZapStat[] {
	return [
		{ k: 'Verified zaps', v: String(validCount), color: 'var(--text)' },
		{ k: 'Total zapped', v: fmt(totalSats) + ' sats', color: 'var(--violet)' },
		{ k: 'Relays queried', v: String(relayCount), color: 'var(--text)' },
		{ k: 'Spec', v: 'NIP-102', color: 'var(--text2)' }
	];
}

export function buildZapDetail(z: ParsedZap): ZapDetailView {
	const intentShort = z.intentId ? short(z.intentId, 8, 4) : '—';

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
		{
			k: 'description',
			v: z.intentId
				? `{"kind":${ZAP_INTENT_KIND},…,"id":"${intentShort}"}`
				: '(missing or invalid)'
		},
		{ k: 'p', v: z.recipientPubkey ? `${short(z.recipientPubkey, 6, 4)}  (recipient)` : '—' },
		...(z.payerPubkey
			? [{ k: 'P', v: `${short(z.payerPubkey, 6, 4)}  (payer)` }]
			: []),
		...(z.targetEventId ? [{ k: 'e', v: short(z.targetEventId, 6, 4) }] : []),
		...(z.addressable ? [{ k: 'a', v: z.addressable }] : []),
		...(z.eventKind != null ? [{ k: 'k', v: String(z.eventKind) }] : []),
		{ k: 'amount', v: z.amountMsat ? `${z.amountMsat} msat` : '—' },
		{ k: 'offer', v: z.offer ? short(z.offer, 10, 6) : '—' },
		{ k: 'proof', v: z.proof ? short(z.proof, 10, 6) : '—' }
	];

	const relays: RelayRow[] = z.seenOn.map((url) => ({
		url,
		host: relayHost(url),
		meta: 'seen on fetch',
		count: '1',
		dot: 'var(--green)'
	}));

	return {
		eventId: z.eventId,
		eventIdShort: short(z.eventId, 4, 4),
		amountLabel: fmt(z.amountSats),
		payer: displayHandle(z.payerPubkey),
		recipient: displayHandle(z.recipientPubkey, 'unknown'),
		target: targetLabel(z),
		comment: z.comment,
		hasComment: z.comment.trim().length > 0,
		intentIdShort: intentShort,
		binding,
		tags,
		validation: z.validation,
		relays,
		relayCount: relays.length,
		structurallyValid: z.structurallyValid,
		offerShort: z.offer ? short(z.offer, 10, 6) : '—',
		proofShort: z.proof ? short(z.proof, 10, 6) : '—',
		proof: z.proof
	};
}
