/**
 * BOLT12 decoding + verification, powered entirely by the `bolt12-utils`
 * library running client-side. Nothing is mocked: every field shown in the UI
 * is parsed live from the pasted string, and the payer-proof verification
 * ledger reflects real SHA-256 / BIP-340 / Merkle checks.
 *
 * Privacy note: this all runs in the visitor's browser — the pasted proof never
 * leaves the device.
 */
import {
	decodePayerProof,
	verifyPayerProof,
	reconstructMerkleRoot,
	verifySignature,
	decodeOffer,
	decodeBolt12,
	parseTlvStream,
	extractInvoiceFields,
	INVOICE_TLV_NAMES,
	INVOICE_REQUEST_TLV_NAMES,
	OFFER_TLV_NAMES,
	PAYER_PROOF_TLV_NAMES
} from 'bolt12-utils';
import { sha256 } from '@noble/hashes/sha2';
import { fmt, short, toHex, mk, type Field, type CheckResult, type DisclosureRow, type TlvRow } from './format';
import { parseBlindedPaths, parseBlindedPayinfos, type BlindedPathView } from './blinded-path';

// ---- view-models ------------------------------------------------------------

export interface VerifyState {
	preimageOk: boolean;
	invoiceSigOk: boolean;
	payerSigOk: boolean;
	merkleOk: boolean;
	allValid: boolean;
	error?: string;
}

export interface ProofView {
	kind: 'proof';
	raw: string;
	amountSats: number;
	amountBtc: string;
	description: string;
	issuer: string;
	payeeNode: string;
	paymentHash: string;
	preimage: string;
	payerKey: string;
	payerNote: string;
	created: string;
	merkle: string;
	verify: VerifyState;
	checks: CheckResult[];
	fields: Field[];
	tlv: TlvRow[];
	disclosure: DisclosureRow[];
	revealedCount: number;
	totalFields: number;
	/**
	 * Blinded paths the payer chose to reveal (offer_paths, invoice_paths with
	 * its blinded_payinfo). Omitted path TLVs stay hidden — selective disclosure
	 * applies to them like any other field.
	 */
	paths: BlindedPathView[];
	pathsError?: string;
	offerPaths: BlindedPathView[];
	offerPathsError?: string;
}

export interface OfferView {
	kind: 'offer';
	raw: string;
	description: string;
	issuer: string;
	amount: string;
	fields: Field[];
	/** Decoded offer_paths (BOLT4 blinded paths used to reach the offer issuer). */
	paths: BlindedPathView[];
	/** Set when offer_paths was present but could not be fully parsed. */
	pathsError?: string;
}

export interface InvoiceView {
	kind: 'invoice';
	raw: string;
	amountSats: number;
	description: string;
	issuer: string;
	fields: Field[];
	/**
	 * Payment paths: invoice_paths, each zipped with its invoice_blindedpay
	 * payinfo (BOLT12 requires exactly one per path, in order).
	 */
	paths: BlindedPathView[];
	pathsError?: string;
	/**
	 * The offer's reply paths reflected inside the invoice (offer_paths).
	 * These carry onion-message routing back to the offer issuer, not payment
	 * constraints, so they render separately from `paths`.
	 */
	offerPaths: BlindedPathView[];
	offerPathsError?: string;
}

export interface ErrorView {
	kind: 'error';
	raw: string;
	message: string;
}

export type DecodeView = ProofView | OfferView | InvoiceView | ErrorView;

// ---- small helpers ----------------------------------------------------------

const td = new TextDecoder();

function msatToSats(msat: bigint): number {
	return Math.round(Number(msat) / 1000);
}

function formatTimestamp(ts: bigint): string {
	// Pasted input is untrusted: an out-of-range created_at would make
	// Date.toISOString() throw, so fall back to the raw value instead.
	const ms = Number(ts) * 1000;
	if (!Number.isFinite(ms)) return ts.toString();
	const d = new Date(ms);
	if (Number.isNaN(d.getTime())) return ts.toString();
	const iso = d.toISOString(); // 2026-06-18T07:33:20.000Z
	return iso.slice(0, 10) + ' ' + iso.slice(11, 19) + ' UTC';
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}

function tlvName(type: bigint): string {
	return (
		INVOICE_TLV_NAMES.get(type) ??
		INVOICE_REQUEST_TLV_NAMES.get(type) ??
		OFFER_TLV_NAMES.get(type) ??
		// bolt12-utils 0.1.2 moved the payer-proof TLVs (proof_signature 241,
		// proof_preimage 1001, proof_omitted_tlvs 1002, …1005) into this map.
		PAYER_PROOF_TLV_NAMES.get(type) ??
		`type ${type}`
	);
}

function readUintBE(bytes: Uint8Array): bigint {
	let v = 0n;
	for (const b of bytes) v = (v << 8n) | BigInt(b);
	return v;
}

const TEXT_TYPES = new Set([10n, 18n]); // offer_description, offer_issuer
const AMOUNT_TYPES = new Set([82n, 170n]); // invreq_amount, invoice_amount

function tlvValue(type: bigint, value: Uint8Array): string {
	if (TEXT_TYPES.has(type)) return '"' + td.decode(value) + '"';
	if (AMOUNT_TYPES.has(type)) return readUintBE(value).toString() + ' msat';
	if (type === 164n) return readUintBE(value).toString() + ' (' + formatTimestamp(readUintBE(value)).slice(0, 10) + ')';
	if (type === 1002n) return readUintBE(value).toString(); // proof_omitted_tlvs markers; show raw
	return short(toHex(value), 12, 8);
}

// ---- payer proof ------------------------------------------------------------

type PayerProof = ReturnType<typeof decodePayerProof>['proof'];

function verifyProof(proof: PayerProof): { state: VerifyState; merkleRoot: Uint8Array } {
	// 1. Preimage proves payment: SHA-256(preimage) === invoice_payment_hash
	let preimageOk = false;
	if (proof.preimage && proof.invoicePaymentHash) {
		preimageOk = bytesEqual(sha256(proof.preimage), proof.invoicePaymentHash);
	}

	// 2. Reconstruct the Merkle root (selective-disclosure integrity)
	let merkleOk = false;
	let merkleRoot: Uint8Array = new Uint8Array(32);
	try {
		merkleRoot = reconstructMerkleRoot(proof);
		merkleOk = true;
	} catch {
		merkleOk = false;
	}

	// 3. Invoice signature valid for invoice_node_id (BIP-340 over the root)
	let invoiceSigOk = false;
	if (merkleOk) {
		try {
			const nodeIdX =
				proof.invoiceNodeId.length === 33 ? proof.invoiceNodeId.slice(1) : proof.invoiceNodeId;
			invoiceSigOk = verifySignature('invoice', merkleRoot, nodeIdX, proof.signature);
		} catch {
			invoiceSigOk = false;
		}
	}

	// 4. Full verification (covers invoice sig + payer sig + merkle together)
	const verdict = verifyPayerProof(proof);
	const payerSigOk = verdict.valid; // valid only when the payer signature also checks out
	const allValid = preimageOk && verdict.valid;

	return {
		state: { preimageOk, invoiceSigOk, payerSigOk, merkleOk, allValid, error: verdict.error },
		merkleRoot: verdict.merkleRoot ?? merkleRoot
	};
}

function decodeProofView(raw: string): ProofView {
	const decoded = decodePayerProof(raw);
	const proof = decoded.proof;
	const inv = extractInvoiceFields(decoded.records);

	const { state: verify, merkleRoot } = verifyProof(proof);

	const amountMsat = inv.invoice_amount ?? inv.invreq_amount ?? 0n;
	const sats = msatToSats(amountMsat);
	const description = inv.offer_description ?? '(no description)';
	const issuer = inv.offer_issuer ?? '(unknown issuer)';
	const payeeNode = toHex(proof.invoiceNodeId);
	const paymentHash = toHex(proof.invoicePaymentHash);
	const preimage = toHex(proof.preimage);
	const payerKey = toHex(proof.payerId);
	const created = inv.invoice_created_at != null ? formatTimestamp(inv.invoice_created_at) : '—';
	const merkle = toHex(merkleRoot);

	const fields: Field[] = [
		mk('amt', 'Amount', fmt(sats) + ' sats', { sans: true, size: '15px', weight: '600', raw: true, color: 'var(--amber)' }),
		mk('desc', 'Description', description, { sans: true, raw: true }),
		mk('iss', 'Issuer', issuer, { sans: true, raw: true, weight: '600' }),
		mk('node', 'Payee node_id', payeeNode, { copyable: true, a: 10, b: 8 }),
		mk('ph', 'Payment hash', paymentHash, { copyable: true, a: 10, b: 8 }),
		mk('pre', 'Preimage', preimage, { copyable: true, a: 10, b: 8, color: 'var(--violet)' }),
		mk('pk', 'Payer key', payerKey, { copyable: true, a: 10, b: 8 }),
		mk('ct', 'Created at', created, { raw: true, size: '12.5px' })
	];

	const tlv: TlvRow[] = decoded.records.map((r) => ({
		type: r.type.toString(),
		name: tlvName(r.type),
		len: r.length.toString(),
		value: tlvValue(r.type, r.value)
	}));

	// Selective disclosure: included records are the revealed invoice fields;
	// the omitted markers are committed-but-hidden leaves.
	const revealed: DisclosureRow[] = proof.includedRecords.map((r) => ({
		name: tlvName(r.type),
		revealed: true,
		hidden: false,
		bg: 'var(--green-soft)',
		bd: 'var(--green-line)',
		fg: 'var(--text)'
	}));
	const hidden: DisclosureRow[] = proof.omittedTlvs.map((_, i) => ({
		name: `‹hidden field #${i + 1}›`,
		revealed: false,
		hidden: true,
		bg: 'var(--panel2)',
		bd: 'var(--border)',
		fg: 'var(--muted)'
	}));
	const disclosure = [...revealed, ...hidden];

	// Revealed blinded paths. A path TLV the payer omitted is simply absent here;
	// the selective-disclosure panel already accounts for it as a hidden leaf.
	const recordValue = (type: bigint): Uint8Array | undefined =>
		decoded.records.find((r) => r.type === type)?.value;
	// A proof reveals fields selectively, so a missing counterpart TLV means
	// "not disclosed", not "malformed invoice" — only cross-check when both
	// sides were actually revealed.
	const { paths, pathsError } = zipPaymentPaths(recordValue(160n), recordValue(162n), {
		requireBoth: false
	});
	const parsedOfferPaths = recordValue(16n) ? parseBlindedPaths(recordValue(16n)!) : undefined;

	const checks: CheckResult[] = [
		{ label: 'Preimage proves payment', detail: 'SHA-256(payment_preimage) = payment_hash', pass: verify.preimageOk },
		{ label: 'Invoice signed by payee', detail: 'BIP-340 schnorr sig valid for invoice_node_id', pass: verify.invoiceSigOk },
		{ label: 'Payer authenticated', detail: 'payer_key signed the proof commitment', pass: verify.payerSigOk },
		{ label: 'Disclosure intact', detail: `Merkle root over ${revealed.length} revealed leaves`, pass: verify.merkleOk }
	];

	return {
		kind: 'proof',
		raw,
		amountSats: sats,
		amountBtc: (sats / 1e8).toFixed(5),
		description,
		issuer,
		payeeNode,
		paymentHash,
		preimage,
		payerKey,
		payerNote: proof.proofNote || '',
		created,
		merkle,
		verify,
		checks,
		fields,
		tlv,
		disclosure,
		revealedCount: revealed.length,
		totalFields: disclosure.length,
		paths,
		pathsError,
		offerPaths: parsedOfferPaths?.value ?? [],
		offerPathsError: parsedOfferPaths?.error
	};
}

// ---- offer ------------------------------------------------------------------

function decodeOfferView(raw: string): OfferView {
	const o = decodeOffer(raw); // hand-written OfferFields: description/issuer/amount/issuer_id(hex)…
	const description = o.description ?? '(no description)';
	const issuer = o.issuer ?? '(unknown issuer)';
	const amount = o.amount != null ? fmt(msatToSats(o.amount)) + ' sats' : 'any (payer chooses)';
	const node = o.issuer_id ?? '';

	// offer_paths rides along as raw bytes on the TLV records; the hand-written
	// OfferFields only keeps a hex string, so parse from the record directly.
	const pathsRecord = o.records.find((r) => r.type === 16n);
	const parsedPaths = pathsRecord ? parseBlindedPaths(pathsRecord.value) : undefined;

	const fields: Field[] = [
		mk('od', 'Description', description, { sans: true, raw: true }),
		mk('oi', 'Issuer', issuer, { sans: true, raw: true, weight: '600' }),
		mk('oa', 'Amount', amount, { sans: true, raw: true, color: 'var(--text2)' }),
		mk('on', 'Issuer id', node, { copyable: true, a: 10, b: 8 }),
		mk('oc', 'Chains', o.chains?.length ? `${o.chains.length} chain(s)` : 'bitcoin (mainnet)', { sans: true, raw: true }),
		mk('oq', 'Quantity', o.quantity_max != null ? `max ${o.quantity_max}` : 'unbounded', { sans: true, raw: true }),
		...pathSummaryField('op', parsedPaths)
	];

	return {
		kind: 'offer',
		raw,
		description,
		issuer,
		amount,
		fields,
		paths: parsedPaths?.value ?? [],
		pathsError: parsedPaths?.error
	};
}

// ---- invoice ----------------------------------------------------------------

function decodeInvoiceView(raw: string): InvoiceView {
	const dec = decodeBolt12(raw);
	const f = extractInvoiceFields(parseTlvStream(dec.data));
	const sats = msatToSats(f.invoice_amount ?? f.invreq_amount ?? 0n);
	const description = f.offer_description ?? '(no description)';
	const issuer = f.offer_issuer ?? '(unknown issuer)';
	const node = toHex(f.invoice_node_id);
	const paymentHash = toHex(f.invoice_payment_hash);
	const created = f.invoice_created_at != null ? formatTimestamp(f.invoice_created_at) : '—';
	const expiry =
		f.invoice_relative_expiry != null
			? `${f.invoice_relative_expiry} s`
			: '7200 s (2 h)';

	// invoice_paths (payment routes) zipped with invoice_blindedpay — BOLT12
	// requires exactly one blinded_payinfo per path, in the same order.
	const { paths, pathsError, parsedPaths } = zipPaymentPaths(f.invoice_paths, f.invoice_blindedpay, {
		requireBoth: true
	});

	// The offer's reply paths are reflected verbatim inside the invoice.
	const parsedOfferPaths = f.offer_paths ? parseBlindedPaths(f.offer_paths) : undefined;

	const fields: Field[] = [
		mk('ia', 'Amount', fmt(sats) + ' sats', { sans: true, raw: true, weight: '600', color: 'var(--amber)' }),
		mk('id', 'Description', description, { sans: true, raw: true }),
		mk('in', 'Payee node', node, { copyable: true, a: 10, b: 8 }),
		mk('iph', 'Payment hash', paymentHash, { copyable: true, a: 10, b: 8 }),
		mk('iexp', 'Expiry', expiry, { sans: true, raw: true }),
		mk('icr', 'Created at', created, { raw: true, size: '12.5px' }),
		...pathSummaryField('ipp', parsedPaths)
	];

	return {
		kind: 'invoice',
		raw,
		amountSats: sats,
		description,
		issuer,
		fields,
		paths,
		pathsError,
		offerPaths: parsedOfferPaths?.value ?? [],
		offerPathsError: parsedOfferPaths?.error
	};
}

/**
 * Zip invoice_paths with invoice_blindedpay. BOLT12 requires exactly one
 * blinded_payinfo per path, in order; a count mismatch is reported, not fatal,
 * and whatever parsed is still shown.
 *
 * `requireBoth` is for complete invoices, where one side without the other is
 * spec-invalid. Proofs reveal fields selectively, so a missing counterpart
 * there means "not disclosed" and must not be flagged.
 */
function zipPaymentPaths(
	pathsBytes: Uint8Array | undefined,
	payinfoBytes: Uint8Array | undefined,
	opts: { requireBoth: boolean }
): { paths: BlindedPathView[]; pathsError?: string; parsedPaths?: { value: BlindedPathView[]; error?: string } } {
	const parsedPaths = pathsBytes ? parseBlindedPaths(pathsBytes) : undefined;
	const parsedPay = payinfoBytes ? parseBlindedPayinfos(payinfoBytes) : undefined;
	let pathsError = parsedPaths?.error ?? parsedPay?.error;
	const paths = parsedPaths?.value ?? [];
	if (parsedPay && paths.length) {
		if (parsedPay.value.length !== paths.length && !pathsError) {
			pathsError = `invoice_blindedpay has ${parsedPay.value.length} entr${parsedPay.value.length === 1 ? 'y' : 'ies'} for ${paths.length} path(s) — BOLT12 requires exactly one per path`;
		}
		paths.forEach((p, i) => {
			if (parsedPay.value[i]) p.payinfo = parsedPay.value[i];
		});
	} else if (!pathsError && opts.requireBoth && ((pathsBytes && !payinfoBytes) || (payinfoBytes && !pathsBytes))) {
		// Key off TLV presence, not parsed length: a present-but-empty
		// invoice_paths parses to zero paths and would otherwise slip through.
		pathsError = payinfoBytes
			? 'invoice_blindedpay present without invoice_paths'
			: `invoice_paths present but invoice_blindedpay is missing — BOLT12 requires one blinded_payinfo per path`;
	}
	return { paths, pathsError, parsedPaths };
}

/** One-line summary for the decoded-fields grid; omitted when no path TLV exists. */
function pathSummaryField(key: string, parsed: { value: BlindedPathView[]; error?: string } | undefined): Field[] {
	if (!parsed) return [];
	const hops = parsed.value.reduce((n, p) => n + p.hops.length, 0);
	const summary = parsed.error
		? `${parsed.value.length} path(s) decoded, then: ${parsed.error}`
		: `${parsed.value.length} path(s) · ${hops} hop(s)`;
	return [mk(key, 'Blinded paths', summary, { sans: true, raw: true, color: 'var(--violet)' })];
}

// ---- dispatch ---------------------------------------------------------------

/**
 * Decode any BOLT12 string. Dispatches on the human-readable prefix and never
 * throws — decode failures come back as an `ErrorView` for the UI to render.
 */
export function decodeInput(input: string): DecodeView {
	const raw = input.trim();
	const lower = raw.toLowerCase();
	try {
		if (lower.startsWith('lnp')) return decodeProofView(raw);
		if (lower.startsWith('lno')) return decodeOfferView(raw);
		if (lower.startsWith('lni')) return decodeInvoiceView(raw);
		return {
			kind: 'error',
			raw,
			message: 'Unrecognized prefix — expected lnp1 (payer proof), lno1 (offer) or lni1 (invoice).'
		};
	} catch (e) {
		return { kind: 'error', raw, message: e instanceof Error ? e.message : String(e) };
	}
}
