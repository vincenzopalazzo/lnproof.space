/**
 * BOLT12 privacy score.
 *
 * Structural and local: every finding comes from bytes already decoded, and
 * nothing here touches the network. The rules are the privacy notes in BOLT 12
 * (lightning/bolts 12-offer-encoding.md), not a guess at what "feels private".
 *
 * Weights are the whole scoring policy. They are pinned by
 * scripts/check-privacy.mjs, so a change to them is a visible diff.
 * Description, amount, quantity, and expiry are deliberately not scored —
 * see https://github.com/vincenzopalazzo/lnproof.space/issues/8.
 */

import type { BlindedPathView } from './blinded-path';

export type PrivacyLevel = 'low' | 'medium' | 'high';

export interface PrivacyFinding {
	/** Stable id, used as the render key and pinned by the regression script. */
	id: string;
	level: PrivacyLevel;
	/** What this string reveals, written for the reader of the page. */
	detail: string;
	/** The BOLT 12 rule the finding rests on. */
	rule: string;
}

export interface PrivacyScore {
	/** Exposed weight over the worst case for this string, 0 to 100. */
	score: number;
	level: PrivacyLevel;
	/** Short label for the health badge. */
	label: string;
	findings: PrivacyFinding[];
	/** Present only for payer proofs: fields the payer kept hidden. */
	withheldCount?: number;
	/**
	 * Set when a path TLV was present but did not parse. The score then omits
	 * the route findings rather than treating the broken path as absent.
	 */
	incomplete?: string;
}

export interface PrivacyInput {
	kind: 'offer' | 'invoice' | 'proof';
	/** offer_issuer text, when the string carries it. */
	issuerName?: string;
	/** offer_issuer_id, hex. */
	issuerId?: string;
	/** Whether offer_metadata (TLV 4) is present. */
	offerMetadata: boolean;
	/** offer_paths, the blinded routes back to the offer issuer. */
	offerPaths: BlindedPathView[];
	/** invoice_paths, the blinded payment routes. */
	paymentPaths: BlindedPathView[];
	/** invreq_payer_id, hex. Meaningless for an offer. */
	payerId?: string;
	/** invreq_metadata (TLV 0) present. Not scored: see scorePrivacy. */
	payerMetadata: boolean;
	/** invreq_metadata decoded as UTF-8, when it is valid text. Not scored. */
	payerMetadataText?: string;
	/** invreq_payer_note. */
	payerNote?: string;
	/**
	 * Fields the payer omitted from a proof. The omitted markers do not name
	 * the types, so this is a count, not a list.
	 */
	withheldCount?: number;
	/** An offer_paths TLV was present but failed to parse. */
	offerPathsUnreadable?: boolean;
	/** An invoice_paths TLV was present but failed to parse. */
	paymentPathsUnreadable?: boolean;
}

const WEIGHT: Record<PrivacyLevel, number> = { high: 3, medium: 2, low: 1 };

// The worst case is the heaviest set of findings one string of this kind can
// realistically carry at once. Several findings are mutually exclusive — a
// domain name and a plain name cannot both fire, and a one-hop path cannot
// also be a multi-hop path — so summing every check would make a genuinely
// leaky string look moderate.
// The heaviest combination of findings one string of this kind can carry at
// once, counted from the checks below. A string that hits every one of them
// scores 100, which is what scripts/check-privacy.mjs pins.
const WORST: Record<PrivacyInput['kind'], number> = {
	// name (high), issuer id (medium), single-hop (medium), intro node, metadata
	offer: WEIGHT.high + WEIGHT.medium * 2 + WEIGHT.low * 2,
	// those, plus payer key, payer note, payinfo, and the payment path's own
	// single-hop and introduction node
	invoice: WEIGHT.high * 3 + WEIGHT.medium * 4 + WEIGHT.low * 3,
	// as the invoice, except the payer key is medium rather than high
	proof: WEIGHT.high * 2 + WEIGHT.medium * 5 + WEIGHT.low * 3
};

function issuerNameFinding(name: string): PrivacyFinding {
	// Unanchored: "Alice (example.com)" is still a domain, and the spec copies
	// the whole offer_issuer string into every invoice.
	// The label is bounded so a long issuer name with no dot cannot make the
	// match backtrack. A real domain label is at most 63 characters.
	const handle = /@|(https?:\/\/)?[\w-]{1,63}\.[a-z]{2,24}\b/i.test(name);
	return {
		id: 'issuer-name',
		level: handle ? 'high' : 'medium',
		detail: handle
			? `The issuer name "${name}" carries a domain or handle, so every payment against this string ties back to that identity.`
			: `The issuer name "${name}" is copied verbatim into every invoice request and invoice, so it links them all to one issuer.`,
		rule: 'BOLT 12 copies every offer field into the invoice request and the invoice, and recommends offer_issuer exactly so the issuer is identifiable.'
	};
}

function issuerIdFinding(hasPaths: boolean): PrivacyFinding {
	return {
		id: 'issuer-id',
		level: hasPaths ? 'medium' : 'high',
		detail: hasPaths
			? 'The issuer node id is published alongside the blinded paths, so the paths do not hide which node issued it.'
			: 'The issuer node id is the only way to reach the issuer, so anyone with the string can ask that node directly.',
		rule: 'BOLT 12 lets offer_issuer_id be omitted when offer_paths is set, and requires a reader to use the blinded path rather than contact the node directly, so the node is not revealed as the source.'
	};
}

function pathFindings(paths: BlindedPathView[], role: string): PrivacyFinding[] {
	const out: PrivacyFinding[] = [];
	if (!paths.length) return out;

	// A one-hop path is the spec's own opt-out of blinded-path privacy. The
	// hop id is blinded, so it cannot be compared with the issuer's real key —
	// that comparison would never match, and a false negative is worse than
	// not claiming one.
	const singleHop = paths.filter((p) => p.hops.length === 1);
	if (singleHop.length) {
		out.push({
			id: `${role}-single-hop`,
			level: 'medium',
			detail: `${singleHop.length} of the ${role} paths ${singleHop.length === 1 ? 'has' : 'have'} a single hop, which is what a recipient builds when it does not want the privacy blinded paths add.`,
			rule: 'BOLT 12: a recipient that does not care about blinded-path privacy can create a path of length 1 containing only itself.'
		});
	}

	const bare = paths.filter((p) => p.firstNode.kind === 'pubkey').length;
	if (bare) {
		out.push({
			id: `${role}-introduction-node`,
			level: 'low',
			detail: `${bare} ${role} path${bare === 1 ? '' : 's'} name a public node as the introduction point, which narrows where the route enters the network.`,
			rule: 'BOLT 4: the introduction point is the one unblinded node in a blinded path, so it is the part of the route anyone can see.'
		});
	}
	return out;
}

function payinfoFinding(paths: BlindedPathView[]): PrivacyFinding | undefined {
	const infos = paths.map((p) => p.payinfo).filter((p) => p !== undefined);
	if (!infos.length) return undefined;
	// 144 blocks and zero fees are the common baseline. Anything else — base
	// fee included — is a schedule the reader can see and compare.
	const odd = infos.filter(
		(p) => p.cltvExpiryDelta !== 144 || p.feeProportionalMillionths !== 0 || p.feeBaseMsat !== 0
	);
	if (!odd.length) return undefined;
	return {
		id: 'payinfo-fingerprint',
		level: 'medium',
		detail: `${odd.length} payment path${odd.length === 1 ? '' : 's'} carry a non-baseline fee or CLTV delta, and that schedule is visible to anyone holding the invoice.`,
		rule: 'BOLT 12 aggregates fees and CLTV into one blinded_payinfo per path specifically to avoid revealing per-hop values that would distinguish the route.'
	};
}

/**
 * Score one decoded string. Pure: same input, same score. Findings come back
 * in weight order so the panel shows the worst leak first.
 *
 * invreq_metadata is not scored. BOLT 12 requires it to be an unpredictable
 * nonce, and the bytes carry no marker saying otherwise, so a pattern match
 * would be a guess and presence alone is what every compliant invoice has.
 */
export function scorePrivacy(input: PrivacyInput): PrivacyScore {
	const findings: PrivacyFinding[] = [];

	if (input.issuerName) findings.push(issuerNameFinding(input.issuerName));
	// An unreadable offer_paths must not be scored as "no paths", which is the
	// worse of the two issuer-id findings and would punish a parse failure.
	if (input.issuerId) findings.push(issuerIdFinding(input.offerPaths.length > 0 || !!input.offerPathsUnreadable));
	if (input.offerMetadata) {
		findings.push({
			id: 'offer-metadata',
			level: 'low',
			detail: 'The offer carries metadata. It is opaque here, but it is the issuer\'s cookie and it is copied into every invoice request and invoice.',
			rule: 'BOLT 12: offer_metadata exists so the issuer can embed an authentication cookie, and it is reflected verbatim into the invoice.'
		});
	}

	findings.push(...pathFindings(input.offerPaths ?? [], 'reply'));
	findings.push(...pathFindings(input.paymentPaths ?? [], 'payment'));

	const payinfo = payinfoFinding(input.paymentPaths);
	if (payinfo) findings.push(payinfo);

	if (input.payerId) {
		findings.push({
			id: 'payer-id',
			level: input.kind === 'proof' ? 'medium' : 'high',
			detail:
				input.kind === 'proof'
					? 'The proof reveals the payer key. That key proves who requested the invoice, so publishing the proof names the payer.'
					: 'The invoice carries the payer key. BOLT 12 requires it to be a transient key, but once published it identifies the payer of this invoice.',
			rule: 'BOLT 12 requires invreq_payer_id to be a transient key the payer remembers, and it is what the invoice signature binds the payer to.'
		});
	}

	if (input.payerNote) {
		findings.push({
			id: 'payer-note',
			level: 'high',
			detail: `The payer note "${input.payerNote}" is public text. BOLT 12 describes it as graffiti engraved into the invoice for anyone to read.`,
			rule: 'BOLT 12: invreq_payer_note lets the payer compliment, taunt, or engrave graffiti into the invoice for all to see.'
		});
	}

	const order: Record<PrivacyLevel, number> = { high: 0, medium: 1, low: 2 };
	findings.sort((a, b) => order[a.level] - order[b.level]);

	const exposed = findings.reduce((n, f) => n + WEIGHT[f.level], 0);
	// Capped: the denominator is an estimate of a realistic worst case, and a
	// string that exceeds it should read as maximally exposed, not as 140.
	const score = Math.min(100, Math.round((exposed / WORST[input.kind]) * 100));
	const level: PrivacyLevel = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
	const routeUnreadable = input.offerPathsUnreadable || input.paymentPathsUnreadable;
	const label = routeUnreadable && findings.length === 0
		? 'Could not judge the route'
		: findings.length === 0
			? 'Nothing identifying'
			: level === 'high'
				? 'Reveals a lot'
				: level === 'medium'
					? 'Reveals some'
					: 'Reveals little';

	return {
		score,
		level,
		label,
		findings,
		// Undefined means the decoder did not say, which is not the same as zero.
		withheldCount: input.kind === 'proof' ? input.withheldCount : undefined,
		incomplete: routeUnreadable
			? 'A blinded path in this string did not parse, so the route findings below are incomplete.'
			: undefined
	};
}
