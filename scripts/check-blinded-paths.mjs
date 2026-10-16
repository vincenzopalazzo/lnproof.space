/**
 * Regression smoke for the BOLT4 blinded_path / BOLT12 blinded_payinfo parser
 * (src/lib/blinded-path.ts). Runs under plain node — the module is type-only
 * TS, so this re-implements nothing: it imports the built source via vite-node
 * style is unavailable, so instead it shells the same assertions through the
 * TypeScript the app ships by transpiling on the fly with node --experimental-strip-types.
 *
 * Run: node --experimental-strip-types scripts/check-blinded-paths.mjs
 * (the script imports src/lib/blinded-path.ts directly; Node's type stripping
 * is stable and default-on since Node 22.6, which this repo requires).
 */
import { parseBlindedPaths, parseBlindedPayinfos } from '../src/lib/blinded-path.ts';

let failures = 0;
const check = (name, cond, detail = '') => {
	if (cond) {
		console.log('ok   ' + name);
	} else {
		failures++;
		console.log('FAIL ' + name + (detail ? ' — ' + detail : ''));
	}
};

const u16 = (n) => new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
const u32 = (n) => new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
const u64 = (n) => {
	const b = new Uint8Array(8);
	let v = BigInt(n);
	for (let i = 7; i >= 0; i--) {
		b[i] = Number(v & 0xffn);
		v >>= 8n;
	}
	return b;
};
const concat = (...arrs) => {
	const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
	let o = 0;
	for (const a of arrs) {
		out.set(a, o);
		o += a.length;
	}
	return out;
};

// Deterministic stand-in points: structurally valid compressed prefixes, not real curve points
// (the explorer displays them, it never does EC math on them).
const point = (prefix, fill) => {
	const p = new Uint8Array(33).fill(fill);
	p[0] = prefix;
	return p;
};
const hop = (nodeId, payload) => concat(nodeId, u16(payload.length), payload);

const intro = point(0x02, 0x11);
const pathKey = point(0x03, 0x22);
const hop1 = point(0x02, 0x33);
const hop2 = point(0x03, 0x44);
const blob1 = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
const blob2 = new Uint8Array(65).fill(0xab); // > 1 byte, exercises multi-byte enclen

// --- pubkey introduction, 2 hops ---
const path = concat(intro, pathKey, new Uint8Array([2]), hop(hop1, blob1), hop(hop2, blob2));
const parsed = parseBlindedPaths(path);
check('pubkey path parses without error', !parsed.error, parsed.error);
check('one path', parsed.value.length === 1);
check('intro is the pubkey', parsed.value[0]?.firstNode.kind === 'pubkey' && parsed.value[0].firstNode.hex === Buffer.from(intro).toString('hex'));
check('first_path_key round-trips', parsed.value[0]?.firstPathKey === Buffer.from(pathKey).toString('hex'));
check('two hops', parsed.value[0]?.hops.length === 2);
check('hop 1 payload length', parsed.value[0]?.hops[0].encryptedLen === 4);
check('hop 2 payload length', parsed.value[0]?.hops[1].encryptedLen === 65);
check('hop payload bytes round-trip', parsed.value[0]?.hops[0].encryptedHex === 'deadbeef');

// --- sciddir introduction: direction byte 0x01 + 8-byte scid (block 800000, tx 7, vout 1) ---
const scid = new Uint8Array([0x01, 0x0c, 0x35, 0x00, 0x00, 0x00, 0x07, 0x00, 0x01]);
const scidPath = concat(scid, pathKey, new Uint8Array([1]), hop(hop1, blob1));
const parsedScid = parseBlindedPaths(scidPath);
check('sciddir path parses', !parsedScid.error, parsedScid.error);
check(
	'sciddir decoded block x tx x vout',
	parsedScid.value[0]?.firstNode.kind === 'sciddir' &&
		parsedScid.value[0].firstNode.scid === '800000x7x1' &&
		parsedScid.value[0].firstNode.direction === 1,
	JSON.stringify(parsedScid.value[0]?.firstNode)
);

// --- two paths concatenated in one TLV value ---
const twoPaths = parseBlindedPaths(concat(path, scidPath));
check('concatenated paths: both parsed', twoPaths.value.length === 2 && !twoPaths.error, twoPaths.error);
check('indices are 1-based positions', twoPaths.value[0]?.index === 1 && twoPaths.value[1]?.index === 2);

// --- malformed input never throws, reports where it stopped ---
const truncated = path.slice(0, 40);
let threw = false;
let truncResult;
try {
	truncResult = parseBlindedPaths(truncated);
} catch {
	threw = true;
}
check('truncated input does not throw', !threw);
check('truncated input reports an error', !!truncResult?.error, truncResult?.error);

const badPrefix = concat(new Uint8Array([0x05]), path.slice(1));
const badResult = parseBlindedPaths(badPrefix);
check('bad first_node_id prefix reported', !!badResult.error && badResult.error.includes('prefix'), badResult.error);

check('empty value reported', !!parseBlindedPaths(new Uint8Array(0)).error);

const zeroHops = concat(intro, pathKey, new Uint8Array([0]));
check('num_hops 0 rejected', !!parseBlindedPaths(zeroHops).error);

// --- blinded_payinfo: fixed 26-byte header + features ---
const payinfo = concat(
	u32(1000), // fee_base_msat
	u32(200), // fee_proportional_millionths
	u16(144), // cltv_expiry_delta
	u64(1000), // htlc_minimum_msat
	// 2^53 + 3, past Number.MAX_SAFE_INTEGER: a Number() round-trip would lose it.
	u64('9007199254740995'), // htlc_maximum_msat
	u16(2),
	new Uint8Array([0x80, 0x00]) // features
);
const parsedPay = parseBlindedPayinfos(payinfo);
check('payinfo parses', !parsedPay.error, parsedPay.error);
check('payinfo fields', parsedPay.value[0]?.feeBaseMsat === 1000 && parsedPay.value[0]?.feeProportionalMillionths === 200 && parsedPay.value[0]?.cltvExpiryDelta === 144);
check('htlc max keeps full u64 precision past 2^53', parsedPay.value[0]?.htlcMaximumMsat === 9007199254740995n);
check('features hex', parsedPay.value[0]?.featuresHex === '8000');

// two payinfos back to back, second with empty features
const payinfo2 = concat(u32(0), u32(0), u16(40), u64(1), u64(0), u16(0));
const both = parseBlindedPayinfos(concat(payinfo, payinfo2));
check('two payinfos parsed', both.value.length === 2 && !both.error, both.error);
check('empty features stays empty string', both.value[1]?.featuresHex === '');

// enclen 0 is spec-invalid (encrypted_recipient_data is never empty) but must
// still parse so the UI can flag the hop instead of crashing on it.
const emptyPayload = concat(intro, pathKey, new Uint8Array([1]), hop(hop1, new Uint8Array(0)));
const parsedEmpty = parseBlindedPaths(emptyPayload);
check('zero-length encrypted payload parses', !parsedEmpty.error && parsedEmpty.value[0]?.hops[0].encryptedLen === 0, parsedEmpty.error);
check('zero-length payload hex is empty string', parsedEmpty.value[0]?.hops[0].encryptedHex === '');

const shortPay = parseBlindedPayinfos(payinfo.slice(0, 10));
check('truncated payinfo does not throw and reports', !!shortPay.error && shortPay.value.length === 0, shortPay.error);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
// Set the code instead of process.exit(), which can discard buffered stdout
// when output is piped or captured by CI.
process.exitCode = failures === 0 ? 0 : 1;
