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

const nonSig = [
	tlv(0, metadata), // invreq_metadata
	tlv(10, enc.encode('Support BOLT12 development')), // offer_description
	tlv(18, enc.encode('vincenzopalazzo')), // offer_issuer
	tlv(22, nodeId), // offer_issuer_id
	tlv(82, tu(u64be(amountMsat))), // invreq_amount
	tlv(88, payerId), // invreq_payer_id
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
	includedTlvTypes: [10, 18, 82, 164, 170], // reveal description/issuer/amount/created_at
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
