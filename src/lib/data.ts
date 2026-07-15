/**
 * Real BOLT12 sample strings, generated with `scripts/mint-sample.mjs` using
 * the bolt12-utils library itself (deterministic keys). They are genuine:
 *
 *   - `proof` is a cryptographically valid payer proof — it decodes AND its
 *     signatures + Merkle root verify (see decode.ts / verifyPayerProof).
 *   - `invoice` is the signed BOLT12 invoice the proof was derived from.
 *   - `offer`  is a reusable BOLT12 offer for the same issuer.
 *
 * Nothing here is hand-faked — every field shown in the UI is decoded live,
 * in the browser, from these strings via bolt12-utils.
 *
 * NIP-102 zap feed/detail screens load kind 9736 events from Nostr relays
 * (see `nip102.ts` / `zap-feed.svelte.ts`) — no offline zap fixtures.
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
