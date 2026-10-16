/**
 * One-time generator for a REAL, cryptographically valid BOLT12 payer proof.
 *
 * Builds a signed BOLT12 invoice with deterministic keys, then uses
 * bolt12-utils' createPayerProof() to derive a payer proof, and finally
 * decodes + verifies it to prove the embedded sample is genuine.
 *
 * Run: node scripts/mint-sample.mjs   — copy the printed lnp1 string into data.ts
 */
import { schnorr, secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha2';
import pkg from 'bolt12-utils';

const {
	computeMerkleRoot,
	taggedHash,
	writeBigSize,
	createPayerProof,
	decodePayerProof,
	verifyPayerProof,
	extractInvoiceFields,
	extractGeneratedOfferFields,
	decodeOffer,
	decodeBolt12,
	encodeBolt12
} = pkg;

const enc = new TextEncoder();
const toHex = (u) => [...u].map((b) => b.toString(16).padStart(2, '0')).join('');
const concat = (...arrs) => {
	const total = arrs.reduce((n, a) => n + a.length, 0);
	const out = new Uint8Array(total);
	let o = 0;
	for (const a of arrs) { out.set(a, o); o += a.length; }
	return out;
};
const serializeTlvRecord = (r) => concat(writeBigSize(r.type), writeBigSize(r.length), r.value);

// ---- deterministic keys / values --------------------------------------------
const nodeSecret = new Uint8Array(32).fill(0); nodeSecret[31] = 0x11; // payee
const payerSecret = new Uint8Array(32).fill(0); payerSecret[31] = 0x22; // payer
const preimage = new Uint8Array(32).fill(0xa7);
const paymentHash = sha256(preimage);
const nodeId = schnorr.getPublicKey(nodeSecret); // 32-byte x-only
const payerId = schnorr.getPublicKey(payerSecret); // 32-byte x-only

const u32be = (n) => new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
const u64be = (n) => {
	const b = new Uint8Array(8);
	let v = BigInt(n);
	for (let i = 7; i >= 0; i--) { b[i] = Number(v & 0xffn); v >>= 8n; }
	return b;
};
const tu = (u) => { let i = 0; while (i < u.length - 1 && u[i] === 0) i++; return u.slice(i); };

const tlv = (type, value) => ({ type: BigInt(type), length: BigInt(value.length), value });

// ---- build the invoice TLV stream (ascending type order) --------------------
const metadata = new Uint8Array(16).fill(0xab);
const createdAt = 1781768000; // 2026-06-18 ~ UTC
const amountMsat = 50_000_000;

// ---- a structurally valid 2-hop blinded path (BOLT4 blinded_path) -----------
// The node ids and path key are real compressed secp256k1 points derived from
// fixed scalars, so strict BOLT4 readers accept them — not just prefix checks.
// The encrypted blobs stay opaque filler: an explorer can only ever show a
// blinded path's structure, never decrypt it.
const pointFromScalar = (byte) => {
	const scalar = new Uint8Array(32);
	scalar[31] = byte;
	return secp256k1.getPublicKey(scalar, true); // 33-byte compressed point
};
const introNode = pointFromScalar(0x31); // introduction point
const firstPathKey = pointFromScalar(0x32);
const blindedHop1 = pointFromScalar(0x33);
const blindedHop2 = pointFromScalar(0x34); // final hop = recipient
const encBlob = (fill, len) => new Uint8Array(len).fill(fill);
const blindedHop = (nodeId, payload) => concat(nodeId, new Uint8Array([(payload.length >> 8) & 0xff, payload.length & 0xff]), payload);
const blindedPath = concat(
	introNode,
	firstPathKey,
	new Uint8Array([2]), // num_hops
	blindedHop(blindedHop1, encBlob(0x41, 16)),
	blindedHop(blindedHop2, encBlob(0x42, 24))
);

// BOLT12 blinded_payinfo: u32 fee_base_msat, u32 fee_proportional_millionths,
// u16 cltv_expiry_delta, u64 htlc_minimum_msat, u64 htlc_maximum_msat, u16 flen, features.
const blindedPayinfo = concat(
	u32be(1000), // 1000 msat base fee
	u32be(100), // 100 ppm
	new Uint8Array([0x00, 144]), // cltv delta 144
	u64be(1000), // htlc min 1000 msat
	u64be(amountMsat), // htlc max = the invoice amount
	new Uint8Array([0x00, 0x00]) // no features
);

const nonSig = [
	tlv(0, metadata), // invreq_metadata
	tlv(10, enc.encode('Support BOLT12 development')), // offer_description
	tlv(16, blindedPath), // offer_paths — reflected into the invoice, revealed in the proof
	tlv(18, enc.encode('vincenzopalazzo')), // offer_issuer
	tlv(22, nodeId), // offer_issuer_id
	tlv(82, tu(u64be(amountMsat))), // invreq_amount
	tlv(88, payerId), // invreq_payer_id
	tlv(160, blindedPath), // invoice_paths — the payer pays along this blinded route
	tlv(162, blindedPayinfo), // invoice_blindedpay — one payinfo per path, in order
	tlv(164, tu(u64be(createdAt))), // invoice_created_at
	tlv(168, paymentHash), // invoice_payment_hash
	tlv(170, tu(u64be(amountMsat))), // invoice_amount
	tlv(176, nodeId) // invoice_node_id
];

// sign the invoice merkle root (tag "lightninginvoicesignature")
const root = computeMerkleRoot(nonSig);
const sigMsg = taggedHash(enc.encode('lightninginvoicesignature'), root);
const sig = schnorr.sign(sigMsg, nodeSecret);
const invoiceRecords = [...nonSig, tlv(240, sig)];

const invoiceHex = toHex(
	invoiceRecords.reduce((acc, r) => {
		const b = serializeTlvRecord(r);
		const out = new Uint8Array(acc.length + b.length);
		out.set(acc); out.set(b, acc.length);
		return out;
	}, new Uint8Array(0))
);

// ---- create the payer proof -------------------------------------------------
const result = createPayerProof({
	invoiceHex,
	preimageHex: toHex(preimage),
	payerSecretKeyHex: toHex(payerSecret),
	includedTlvTypes: [10, 16, 18, 82, 160, 162, 164, 170], // reveal description/issuer/paths/payinfo/amount/created_at
	note: 'Thanks for your work on Core Lightning!'
});

// ---- decode + verify (round-trip proof) -------------------------------------
const decoded = decodePayerProof(result.proofBech32);
const verdict = verifyPayerProof(decoded.proof);

// ---- encode the full invoice as a real lni1 string --------------------------
const invoiceBytes = new Uint8Array(invoiceHex.length / 2);
for (let i = 0; i < invoiceHex.length; i += 2) invoiceBytes[i / 2] = parseInt(invoiceHex.slice(i, i + 2), 16);
const invoiceBech32 = encodeBolt12('lni', invoiceBytes);

// ---- mint a minimal real offer (lno1) ---------------------------------------
const nodeIdCompressed = secp256k1.getPublicKey(nodeSecret, true); // 33-byte compressed
const offerRecords = [
	tlv(10, enc.encode('Support BOLT12 development')), // offer_description
	tlv(16, blindedPath), // offer_paths — how a payer reaches the issuer
	tlv(18, enc.encode('vincenzopalazzo')), // offer_issuer
	tlv(22, nodeIdCompressed) // offer_issuer_id (33-byte point)
];
let offerBech32 = '';
try {
	const offBytes = offerRecords.reduce((acc, r) => concat(acc, serializeTlvRecord(r)), new Uint8Array(0));
	offerBech32 = encodeBolt12('lno', offBytes);
	decodeOffer(offerBech32); // validate it round-trips
} catch (e) {
	offerBech32 = 'OFFER_ERR: ' + e.message;
}

// The embedded samples must round-trip through the explorer's own path parser,
// or the landing-page demos would render a parse error instead of the paths.
const { parseBlindedPaths, parseBlindedPayinfos } = await import('../src/lib/blinded-path.ts');
for (const [label, bytes] of [
	['offer_paths', blindedPath],
	['invoice_paths', blindedPath]
]) {
	const r = parseBlindedPaths(bytes);
	if (r.error || r.value.length !== 1 || r.value[0].hops.length !== 2) {
		throw new Error(`minted ${label} does not round-trip: ${r.error ?? JSON.stringify(r.value.length)}`);
	}
}
const pay = parseBlindedPayinfos(blindedPayinfo);
if (pay.error || pay.value.length !== 1 || pay.value[0].cltvExpiryDelta !== 144) {
	throw new Error(`minted blinded_payinfo does not round-trip: ${pay.error ?? 'bad fields'}`);
}
// Printed after the sample strings below — callers read the first stdout lines
// positionally, so nothing may precede PROOF_BECH32.
const roundtripStatus = 'PATHS_ROUNDTRIP=ok';

// Print the sample strings + crypto facts FIRST (these are what we embed).
console.log('PROOF_BECH32=' + result.proofBech32);
console.log('INVOICE_BECH32=' + invoiceBech32);
console.log('OFFER_BECH32=' + offerBech32);
console.log('MERKLE_ROOT=' + toHex(result.merkleRoot));
console.log('VERIFY_VALID=' + verdict.valid + (verdict.error ? ' ERR=' + verdict.error : ''));
console.log('PREIMAGE=' + toHex(preimage));
console.log('PAYMENT_HASH=' + toHex(paymentHash));
console.log('NODE_ID=' + toHex(nodeId));
console.log('PAYER_ID=' + toHex(payerId));
console.log('PAYER_NOTE=' + decoded.proof.payerNote);
console.log('PROOF_TLV_TYPES=' + decoded.records.map((r) => r.type).join(','));
console.log(roundtripStatus);

// Exploration: what the field extractor yields from the proof's records.
try {
	const invF = extractInvoiceFields(decoded.records);
	console.log('--- extractInvoiceFields(proof.records) ---');
	console.log(JSON.stringify(invF, (k, v) => (v instanceof Uint8Array ? toHex(v) : typeof v === 'bigint' ? v.toString() : v), 2));
} catch (e) {
	console.log('extract proof FAIL: ' + e.message);
}
try {
	const invDecoded = decodeBolt12(invoiceBech32);
	const invFull = extractInvoiceFields(invDecoded.records);
	console.log('--- lni1 fields: amt=' + invFull.invoice_amount + ' desc=' + invFull.offer_description + ' created=' + invFull.invoice_created_at);
} catch (e) {
	console.log('extract invoice FAIL: ' + e.message);
}
