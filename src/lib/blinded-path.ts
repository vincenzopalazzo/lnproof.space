/**
 * BOLT4 `blinded_path` and BOLT12 `blinded_payinfo` wire parsing.
 *
 * bolt12-utils 0.1.2 exposes path TLVs only as raw bytes (its generated field
 * extractors keep `offer_paths` / `invoice_paths` / `invoice_blindedpay` as
 * Uint8Array, and the only path parser in the library is a private validator
 * inside offer.ts), so the explorer parses the subtypes itself.
 *
 * Wire formats (lightning/bolts):
 *   blinded_path     = sciddir_or_pubkey first_node_id
 *                      + point first_path_key
 *                      + u8 num_hops
 *                      + num_hops * blinded_path_hop
 *   blinded_path_hop = point blinded_node_id + u16 enclen + enclen bytes
 *   blinded_payinfo  = u32 fee_base_msat + u32 fee_proportional_millionths
 *                      + u16 cltv_expiry_delta + u64 htlc_minimum_msat
 *                      + u64 htlc_maximum_msat + u16 flen + flen bytes features
 *
 * Input is untrusted (pasted strings), so these parsers never throw: anything
 * malformed comes back as `{ error }` and the caller renders what it can.
 */

export interface BlindedHopView {
	/** Compressed blinded_node_id, hex. */
	blindedNodeId: string;
	/** encrypted_recipient_data byte length. */
	encryptedLen: number;
	/** encrypted_recipient_data, hex — opaque to us (ChaCha20-Poly1305 to the hop). */
	encryptedHex: string;
}

export interface BlindedPayinfoView {
	feeBaseMsat: number;
	feeProportionalMillionths: number;
	cltvExpiryDelta: number;
	htlcMinimumMsat: bigint;
	htlcMaximumMsat: bigint;
	/** features bytes, hex (empty string when flen is 0). */
	featuresHex: string;
}

export interface BlindedPathView {
	/** 1-based position in the path array. */
	index: number;
	firstNode: { kind: 'pubkey'; hex: string } | { kind: 'sciddir'; scid: string; direction: 0 | 1 };
	/** first_path_key, compressed point hex. */
	firstPathKey: string;
	hops: BlindedHopView[];
	/** Matching invoice blinded_payinfo, when the caller zipped one in. */
	payinfo?: BlindedPayinfoView;
}

export interface ParseResult<T> {
	value: T;
	/** Set when parsing stopped early; `value` holds everything parsed before the fault. */
	error?: string;
}

const toHex = (bytes: Uint8Array, from: number, len: number): string => {
	let s = '';
	for (let i = from; i < from + len; i++) s += bytes[i].toString(16).padStart(2, '0');
	return s;
};

const readU16 = (b: Uint8Array, o: number): number => (b[o] << 8) | b[o + 1];
const readU32 = (b: Uint8Array, o: number): number =>
	((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const readU64 = (b: Uint8Array, o: number): bigint => {
	let v = 0n;
	for (let i = 0; i < 8; i++) v = (v << 8n) | BigInt(b[o + i]);
	return v;
};

/** BOLT7 short_channel_id: 3-byte block height, 3-byte tx index, 2-byte output index. */
function formatScid(b: Uint8Array, o: number): string {
	const block = (b[o] << 16) | (b[o + 1] << 8) | b[o + 2];
	const tx = (b[o + 3] << 16) | (b[o + 4] << 8) | b[o + 5];
	const vout = (b[o + 6] << 8) | b[o + 7];
	return `${block}x${tx}x${vout}`;
}

/**
 * Parse a BOLT12 path TLV value: a concatenation of one or more `blinded_path`s.
 * An empty value is valid input but not a valid path array — reported as an error.
 */
export function parseBlindedPaths(data: Uint8Array): ParseResult<BlindedPathView[]> {
	const paths: BlindedPathView[] = [];
	let offset = 0;
	const fail = (error: string): ParseResult<BlindedPathView[]> => ({ value: paths, error });

	while (offset < data.length) {
		const where = `path #${paths.length + 1}`;

		// first_node_id: sciddir (9 bytes, leading 0x00/0x01) or compressed pubkey (33 bytes)
		const firstByte = data[offset];
		let firstNode: BlindedPathView['firstNode'];
		if (firstByte === 0x00 || firstByte === 0x01) {
			if (offset + 9 > data.length) return fail(`${where}: truncated sciddir first_node_id`);
			firstNode = { kind: 'sciddir', scid: formatScid(data, offset + 1), direction: firstByte };
			offset += 9;
		} else if (firstByte === 0x02 || firstByte === 0x03) {
			if (offset + 33 > data.length) return fail(`${where}: truncated first_node_id`);
			firstNode = { kind: 'pubkey', hex: toHex(data, offset, 33) };
			offset += 33;
		} else {
			return fail(`${where}: bad first_node_id prefix 0x${firstByte.toString(16)}`);
		}

		// first_path_key: 33-byte compressed point
		if (offset + 33 > data.length) return fail(`${where}: truncated first_path_key`);
		if (data[offset] !== 0x02 && data[offset] !== 0x03) {
			return fail(`${where}: bad first_path_key prefix 0x${data[offset].toString(16)}`);
		}
		const firstPathKey = toHex(data, offset, 33);
		offset += 33;

		if (offset >= data.length) return fail(`${where}: missing num_hops`);
		const numHops = data[offset];
		offset += 1;
		if (numHops === 0) return fail(`${where}: num_hops must be > 0`);

		const hops: BlindedHopView[] = [];
		for (let h = 0; h < numHops; h++) {
			if (offset + 33 > data.length) return fail(`${where}: hop ${h + 1} truncated blinded_node_id`);
			if (data[offset] !== 0x02 && data[offset] !== 0x03) {
				return fail(`${where}: hop ${h + 1} bad blinded_node_id prefix`);
			}
			const blindedNodeId = toHex(data, offset, 33);
			offset += 33;

			if (offset + 2 > data.length) return fail(`${where}: hop ${h + 1} missing enclen`);
			const enclen = readU16(data, offset);
			offset += 2;
			if (offset + enclen > data.length) return fail(`${where}: hop ${h + 1} truncated encrypted data`);
			hops.push({ blindedNodeId, encryptedLen: enclen, encryptedHex: toHex(data, offset, enclen) });
			offset += enclen;
		}

		paths.push({ index: paths.length + 1, firstNode, firstPathKey, hops });
	}

	if (paths.length === 0) return fail('path TLV is empty');
	return { value: paths };
}

/** One blinded_payinfo is 28 bytes (the 26-byte fixed fields plus the u16 `flen`) plus `flen` feature bytes. */
const PAYINFO_HEADER = 4 + 4 + 2 + 8 + 8 + 2;

/**
 * Parse an `invoice_blindedpay` TLV value: one `blinded_payinfo` per path, in order.
 */
export function parseBlindedPayinfos(data: Uint8Array): ParseResult<BlindedPayinfoView[]> {
	const payinfos: BlindedPayinfoView[] = [];
	let offset = 0;
	const fail = (error: string): ParseResult<BlindedPayinfoView[]> => ({ value: payinfos, error });

	while (offset < data.length) {
		const where = `payinfo #${payinfos.length + 1}`;
		if (offset + PAYINFO_HEADER > data.length) return fail(`${where}: truncated header`);
		const feeBaseMsat = readU32(data, offset);
		const feeProportionalMillionths = readU32(data, offset + 4);
		const cltvExpiryDelta = readU16(data, offset + 8);
		const htlcMinimumMsat = readU64(data, offset + 10);
		const htlcMaximumMsat = readU64(data, offset + 18);
		const flen = readU16(data, offset + 26);
		offset += PAYINFO_HEADER;
		if (offset + flen > data.length) return fail(`${where}: truncated features (${flen} bytes claimed)`);
		payinfos.push({
			feeBaseMsat,
			feeProportionalMillionths,
			cltvExpiryDelta,
			htlcMinimumMsat,
			htlcMaximumMsat,
			featuresHex: flen ? toHex(data, offset, flen) : ''
		});
		offset += flen;
	}

	// An empty value cannot hold the one-entry-per-path array BOLT12 requires.
	if (payinfos.length === 0) return fail('blinded_payinfo TLV is empty');
	return { value: payinfos };
}
