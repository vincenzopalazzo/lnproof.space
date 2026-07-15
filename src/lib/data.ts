/**
 * Real BOLT12 sample strings, generated with `scripts/mint-sample.mjs` using
 * the bolt12-utils library itself (deterministic keys). They are genuine:
 *
 *   - `proof` is a cryptographically valid payer proof — it decodes AND its
 *     signatures + Merkle root verify (see decode.ts / verifyPayerProof).
 *   - `invoice` is the signed BOLT12 invoice the proof was derived from.
 *   - `offer`  is a reusable BOLT12 offer for the same issuer.
 *
 * Nothing here is hand-faked any more — every field shown in the UI is decoded
 * live, in the browser, from these strings via bolt12-utils.
 *
 * NIP-102 zap fixtures below are *concept* samples for the zap feed/detail
 * screens. They follow the event shape from NIP-102 / NIP-100 but are not
 * live-relay events — the explorer does not open WebSocket connections by
 * default (privacy: zero third-party requests).
 */

export type Screen = 'landing' | 'proof' | 'offer' | 'invoice' | 'error' | 'zaps' | 'zapDetail';
export type Theme = 'dark' | 'light';

export const SAMPLES = {
	proof:
		'lnp1pgd9xatswphhyapqgf85c4p3xgsxgetkv4kx7urdv4h8gys0we5kucm9deax7urpd3sh57n02gzq97hsspvzqxlx3fdq9rexq8gwsr2x3s6yhge36cgmjmp43dsr9695mgz50lq35szx5vulgz5zqdm7zhhae8jf878pk64cx2kvxjhg759yk4hg6rshh3culzzgfqgy4gzq97hsszczphhaafxdkemh2zjzplhgql4v7g0tnzv2u7dew6rkde865p9z6j357pqwjxpg5h9pjdq3y6hcc0rpqegga93hd96chvjsdsrekhe9hy24rxydjznvhxfms77a4n59k7rl98nmgxjh5hs02d268xd9yngttkqzgtc5qe2626xr27slrm32aq8s34krrvqlmx00s63j95nzc4xpafz3ht8zhs2t8wv3lqmyst6k5wzjs66srag4ew4arrkltqgrt0pnpnwhte006qlfyzn60fa857n60fa857n60fa857n60fa857n60fa857n60fa857n60lgragq38lgradqrtg0f2fq2x3uqwvg2svh0jx4ay3ffltkzn469rztgxc699ll5jec0ql0c0sgdxtgsu02kwtlq2vq0m56p4nr0xyuzwrdzzjzz93jsfr7s8m8aqyqpm66a6rvrpscv3w49rpmaym25ctxzv6avsaupmtdzcdz660j5dqlkkrdezeed7ufypzrq4xv3x23ckc7yg8t8lt47n748tgkl306f6rmaetqlvaux52dnf07pzrkr9tzm50r5wyc2f4m2597lrd2meld0hxw5plt5vdxan5w02749n5y0s9fph327jrafhllnhapdazvfj7w8t3d5kun9d0tx6ql7hghvhrpzwlxmg3wnt2h60734wn9uensapc7n0v5qcfly90k2fczxqy4n3jn8yf80ajkmlp68qgmqw870qd9rd7sy3f3tvmlawgtjxwxnu84xqq6ncwj5gpc0rtju82a62mpylh5vtqmgu2rf9u342src8kj3vttun6l8n2na5j6u2ax7snpxmrycvr650lgra5n4g6rpde4hxgrxdaezq7t0w4ezqam0wf4jqmmwyppk7un9ypxxjemgw3hxjmn8yy',
	invoice:
		'lni1qqg2h2at4w46h2at4w46h2at4w46kzs62d6hqur0wf6zqsj0f32rzv3qv3jhvetvdacx6etwwsfq7anfde3k2mn6dacxzmrp0fax793qmm775nxmvam4pfpqlm5q06k0y84e3x9w0xuhdpmxuna2qj3dfg69ypqzltcgqkpqr0ng5ksz3unqr58gp4rgcdzt5vcavydeds6ckcpjaz6d5p28lsg6gpr2xw05p2pqxalptm7uneynlrsmd2ur9txrft502zjt2m5dpctmcuw03pyysyz25pqzltcgpvpqmm775nxmvam4pfpqlm5q06k0y84e3x9w0xuhdpmxuna2qj3dfg60qs8frq52tjsexsgjdtuv83ssv5ywjcmkjavtkfgxcpumtujmj923nzxepfktnyac00w6e6zm0pljnea5rft6tc84x4drnxjjf594mqpyy',
	offer:
		'lno1pgd9xatswphhyapqgf85c4p3xgsxgetkv4kx7urdv4h8gys0we5kucm9deax7urpd3sh57n0zcss8hhaafxdkemh2zjzplhgql4v7g0tnzv2u7dew6rkde865p9z6j35'
} as const;

// ---- NIP-102 concept fixtures ------------------------------------------------

export interface SampleRelay {
	url: string;
	meta: string;
	/** Display count of zaps seen on this relay (concept fixture). */
	count: string;
	/** CSS color for the status dot. */
	dot: string;
}

export interface SampleZap {
	/** Display handle for the payer (`anon` when no `P` tag). */
	payer: string;
	/** Display handle for the recipient (from NIP-05 / profile, concept). */
	recipient: string;
	/** Human description of the zap target. */
	target: string;
	/** Zap comment (event content). Empty string = no comment. */
	comment: string;
	/** Amount in whole sats. */
	amountSats: number;
	/** Full event id hex (concept). */
	eventIdFull: string;
	/** Relative time label for the feed. */
	ago: string;
	/** Indexes into SAMPLE_RELAYS. */
	relayIndexes: number[];
	/** Recipient pubkey hex (tag `p`). */
	recipientPubkey: string;
	/** Payer pubkey hex (tag `P`); empty for anonymous. */
	payerPubkey: string;
	/** Note id being zapped (tag `e`), if any. */
	eventId: string;
	/** Addressable coordinate (tag `a`), if any. Mutually exclusive with eventId. */
	addressable: string;
	/** Kind of zapped event (tag `k`). */
	eventKind: number | null;
	/** Canonical raw BOLT12 offer (tag `offer` / NIP-100 `lno`). */
	offer: string;
	/** BOLT12 lnp payer proof (tag `proof`). */
	proof: string;
	/** Kind 9738 zap-intent event id. */
	intentId: string;
	/** BOLT12 invreq_payer_note binding: `nostr:nip102:<intentId>`. */
	payerNote: string;
	/** invoice_payment_hash hex — NIP-102 dedupe key. */
	paymentHash: string;
}

/**
 * Concept relay set used by the zap feed sidebar. These URLs are displayed
 * only — the SPA does not open WebSocket connections unless a future opt-in
 * live mode is explicitly enabled by the user.
 */
export const SAMPLE_RELAYS: SampleRelay[] = [
	{ url: 'wss://relay.damus.io', meta: 'general · read/write', count: '214', dot: 'var(--green)' },
	{ url: 'wss://nos.lol', meta: 'general · read/write', count: '188', dot: 'var(--green)' },
	{ url: 'wss://relay.primal.net', meta: 'indexed · read', count: '201', dot: 'var(--green)' },
	{ url: 'wss://nostr.wine', meta: 'paid · read/write', count: '97', dot: 'var(--amber)' },
	{ url: 'wss://relay.snort.social', meta: 'general · reconnecting', count: '62', dot: 'var(--amber)' }
];

/**
 * Concept kind-9736 zap events for the feed/detail screens.
 * Field shapes follow NIP-102; amounts/ids are illustrative.
 * The bundled SAMPLE proof/offer strings are reused so "Inspect lnp" lands
 * on a real cryptographically-valid proof.
 */
export const SAMPLE_ZAPS: SampleZap[] = [
	{
		payer: '@matbalez',
		recipient: '@vincenzopalazzo',
		target: 'zap on a note',
		comment: 'excellent note',
		amountSats: 21000,
		eventIdFull: 'd8f39c1a4b7e2f60a1c3d5e7b9f0a2c4d6e8f1a3b5c7d9e0f2a4b6c8d0e1f3a5',
		ago: '2m ago',
		relayIndexes: [0, 1, 2],
		recipientPubkey: '32e1827635450ebb3c5a7d12c1d117d15bb8023008dc55ed4fca8f4a2e245',
		payerPubkey: '97c70a44366b73744add18f66f213a0c22ec86f04a65a1e76062f43153e322',
		eventId: '9ae37a4c1d8b2e5f0a6c3d7e1b4f8a0c5d2e6b9f3a7c1d4e8b0f2a5c6d94fb',
		addressable: '',
		eventKind: 1,
		offer: SAMPLES.offer,
		proof: SAMPLES.proof,
		intentId: 'e7b2c1a9d4f0e3b6a8c5d1f2e0b4a7c3d9e5f1a6b0c2d8e4f7a1b3c5d0e2f6',
		payerNote: 'nostr:nip102:e7b2c1a9d4f0e3b6a8c5d1f2e0b4a7c3d9e5f1a6b0c2d8e4f7a1b3c5d0e2f6',
		paymentHash: '8a1f0c4d2e6b9a3f7c5d1e0b8f2a4c6d9e3b7a1f5c8d2e4b6a0f3c7d9e1b5a2f'
	},
	{
		payer: 'anon',
		recipient: '@vincenzopalazzo',
		target: 'profile zap',
		comment: 'Thanks for Core Lightning!',
		amountSats: 50000,
		eventIdFull: 'a01c7f42b3e5d8c1a4f6e0b2d9c5a7e3f1b8d0c4a6e2f5b9d1c3a0e7f4b2d8',
		ago: '19m ago',
		relayIndexes: [0, 2],
		recipientPubkey: '32e1827635450ebb3c5a7d12c1d117d15bb8023008dc55ed4fca8f4a2e245',
		payerPubkey: '',
		eventId: '',
		addressable: '',
		eventKind: null,
		offer: SAMPLES.offer,
		proof: SAMPLES.proof,
		intentId: '4f1c8f6a0d5e4a4e94f5ef99d1c1e8ad2b7e0c3f5a1d9e6b4c8a0f2d5e7b1c3',
		payerNote: 'nostr:nip102:4f1c8f6a0d5e4a4e94f5ef99d1c1e8ad2b7e0c3f5a1d9e6b4c8a0f2d5e7b1c3',
		paymentHash: '1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a'
	},
	{
		payer: '@carla',
		recipient: '@tony',
		target: 'zap on a long-form article',
		comment: '',
		amountSats: 10000,
		eventIdFull: '55be12d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b',
		ago: '1h ago',
		relayIndexes: [1, 3],
		recipientPubkey: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
		payerPubkey: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
		eventId: '',
		addressable: '30023:aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899:article-1',
		eventKind: 30023,
		offer: SAMPLES.offer,
		proof: SAMPLES.proof,
		intentId: '9c0d1e2f3a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e',
		payerNote: 'nostr:nip102:9c0d1e2f3a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e',
		paymentHash: 'aa11bb22cc33dd44ee55ff6677889900aa11bb22cc33dd44ee55ff6677889900'
	},
	{
		payer: '@niftynei',
		recipient: '@rusty',
		target: 'zap on a note',
		comment: 'ACK',
		amountSats: 2100,
		eventIdFull: '7c4a88ef0d1e2f3a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b',
		ago: '3h ago',
		relayIndexes: [0, 1, 2, 4],
		recipientPubkey: 'deadbeefcafebabe0123456789abcdefdeadbeefcafebabe0123456789abcdef',
		payerPubkey: 'cafed00dbaadf00d0123456789abcdefcafed00dbaadf00d0123456789abcdef',
		eventId: 'f0e1d2c3b4a5968778695a4b3c2d1e0f1a2b3c4d5e6f708192a3b4c5d6e7f80',
		addressable: '',
		eventKind: 1,
		offer: SAMPLES.offer,
		proof: SAMPLES.proof,
		intentId: '0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9',
		payerNote: 'nostr:nip102:0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9',
		paymentHash: 'ff00ee11dd22cc33bb44aa5599668877ff00ee11dd22cc33bb44aa5599668877'
	},
	{
		payer: '@openoms',
		recipient: '@vincenzopalazzo',
		target: 'profile zap',
		comment: 'keep building',
		amountSats: 100000,
		eventIdFull: 'be2104c7a8d9e0f1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f70819',
		ago: '6h ago',
		relayIndexes: [2, 3],
		recipientPubkey: '32e1827635450ebb3c5a7d12c1d117d15bb8023008dc55ed4fca8f4a2e245',
		payerPubkey: '99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa',
		eventId: '',
		addressable: '',
		eventKind: null,
		offer: SAMPLES.offer,
		proof: SAMPLES.proof,
		intentId: '1f2e3d4c5b6a7980f1e2d3c4b5a69788f0e1d2c3b4a5968778695a4b3c2d1e0',
		payerNote: 'nostr:nip102:1f2e3d4c5b6a7980f1e2d3c4b5a69788f0e1d2c3b4a5968778695a4b3c2d1e0',
		paymentHash: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'
	}
];
