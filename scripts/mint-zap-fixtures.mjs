/**
 * Mint NIP-102-aligned sample payer proofs for the zap feed fixtures.
 * Each proof has a unique amount, preimage, and invreq-style payer note
 * binding (proof note = nostr:nip102:<intentId>).
 */
import { schnorr, secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha2';
import pkg from 'bolt12-utils';

const {
  computeMerkleRoot, taggedHash, writeBigSize, createPayerProof,
  decodePayerProof, verifyPayerProof, encodeBolt12, decodeOffer
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
const u64be = (n) => {
  const b = new Uint8Array(8);
  let v = BigInt(n);
  for (let i = 7; i >= 0; i--) { b[i] = Number(v & 0xffn); v >>= 8n; }
  return b;
};
const tu = (u) => { let i = 0; while (i < u.length - 1 && u[i] === 0) i++; return u.slice(i); };
const tlv = (type, value) => ({ type: BigInt(type), length: BigInt(value.length), value });

const nodeSecret = new Uint8Array(32).fill(0); nodeSecret[31] = 0x11;
const payerSecret = new Uint8Array(32).fill(0); payerSecret[31] = 0x22;
const nodeId = schnorr.getPublicKey(nodeSecret);
const payerId = schnorr.getPublicKey(payerSecret);
const nodeIdCompressed = secp256k1.getPublicKey(nodeSecret, true);

// Shared offer
const offerRecords = [
  tlv(10, enc.encode('Support BOLT12 development')),
  tlv(18, enc.encode('vincenzopalazzo')),
  tlv(22, nodeIdCompressed)
];
const offerBytes = offerRecords.reduce((acc, r) => concat(acc, serializeTlvRecord(r)), new Uint8Array(0));
const offerBech32 = encodeBolt12('lno', offerBytes);
decodeOffer(offerBech32);

const zaps = [
  { amountSats: 21000, intentId: 'e7b2c1a9d4f0e3b6a8c5d1f2e0b4a7c3d9e5f1a6b0c2d8e4f7a1b3c5d0e2f6', preimageSeed: 0xa1 },
  { amountSats: 50000, intentId: '4f1c8f6a0d5e4a4e94f5ef99d1c1e8ad2b7e0c3f5a1d9e6b4c8a0f2d5e7b1c3', preimageSeed: 0xa2 },
  { amountSats: 10000, intentId: '9c0d1e2f3a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e', preimageSeed: 0xa3 },
  { amountSats: 2100,  intentId: '0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9', preimageSeed: 0xa4 },
  { amountSats: 100000,intentId: '1f2e3d4c5b6a7980f1e2d3c4b5a69788f0e1d2c3b4a5968778695a4b3c2d1e0', preimageSeed: 0xa5 }
];

const out = [];
for (const z of zaps) {
  const amountMsat = z.amountSats * 1000;
  const preimage = new Uint8Array(32).fill(z.preimageSeed);
  const paymentHash = sha256(preimage);
  const createdAt = 1781768000 + z.amountSats; // unique-ish
  const note = 'nostr:nip102:' + z.intentId;
  const metadata = new Uint8Array(16).fill(0xab);
  metadata[0] = z.preimageSeed;

  const nonSig = [
    tlv(0, metadata),
    tlv(10, enc.encode('Support BOLT12 development')),
    tlv(18, enc.encode('vincenzopalazzo')),
    tlv(22, nodeId),
    tlv(82, tu(u64be(amountMsat))),
    tlv(88, payerId),
    tlv(164, tu(u64be(createdAt))),
    tlv(168, paymentHash),
    tlv(170, tu(u64be(amountMsat))),
    tlv(176, nodeId)
  ];
  const root = computeMerkleRoot(nonSig);
  const sigMsg = taggedHash(enc.encode('lightninginvoicesignature'), root);
  const sig = schnorr.sign(sigMsg, nodeSecret);
  const invoiceRecords = [...nonSig, tlv(240, sig)];
  const invoiceHex = toHex(
    invoiceRecords.reduce((acc, r) => {
      const b = serializeTlvRecord(r);
      const next = new Uint8Array(acc.length + b.length);
      next.set(acc); next.set(b, acc.length);
      return next;
    }, new Uint8Array(0))
  );

  const result = createPayerProof({
    invoiceHex,
    preimageHex: toHex(preimage),
    payerSecretKeyHex: toHex(payerSecret),
    includedTlvTypes: [10, 18, 82, 164, 170],
    note
  });

  const decoded = decodePayerProof(result.proofBech32);
  const verdict = verifyPayerProof(decoded.proof);
  if (!verdict.valid) throw new Error('proof invalid for ' + z.amountSats + ': ' + verdict.error);

  // extract note field if present
  const proofNote = decoded.proof.proofNote || decoded.proof.payerNote || '';
  out.push({
    amountSats: z.amountSats,
    intentId: z.intentId,
    payerNote: note,
    paymentHash: toHex(paymentHash),
    proof: result.proofBech32,
    verified: verdict.valid,
    proofNote
  });
}

console.log(JSON.stringify({ offer: offerBech32, zaps: out }, null, 2));
