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
 */

export type Screen = 'landing' | 'proof' | 'offer' | 'invoice' | 'error';
export type Theme = 'dark' | 'light';

export const SAMPLES = {
	proof:
		'lnp1pgd9xatswphhyapqgf85c4p3xgsxgetkv4kx7urdv4h8gys0we5kucm9deax7urpd3sh57n02gzq97hsspvzqxlx3fdq9rexq8gwsr2x3s6yhge36cgmjmp43dsr9695mgz50lq35szx5vulgz5zqdm7zhhae8jf878pk64cx2kvxjhg759yk4hg6rshh3culzzgfqgy4gzq97hsszczphhaafxdkemh2zjzplhgql4v7g0tnzv2u7dew6rkde865p9z6j357pqp3w8lfw5yr6vhvp6rfas6jtft9cn9u8xq0geyvplp89t3s2a2e6zlwgxpa0fp45qprga95m9n2tphhz7mpt77jxc3t6smd2jemthfshezpfa857n60fa857n60fa857n60fa857n60fa857n60fa857n60fa87sq38ajqxks7j5jq5drcqucs4qewlydt6fzjn7hv98t52xyksd352tllf9ns7p7lslqs6vk3pc74vuh7q5cqlhf5rtxx7vfcyux6y9yyytr9qj8cl5qsq80tthgdsvxrpj9655v805nd2npvcfnt4jrhs8dd5tp5ttf7235r76cdhyt89hm3ysygvz5ejye28zmrc3qavlawh6065adzm79lf8g00h9vranhs63fkd9lcygwcv4vtw3uw3cnpfxhd2shmud4t08a47ue6s8aw335mkw3eat65kws37q4yx79t6g04xll7wl59h5f3xtecaw9kjmjv44avmgrl6azajuvyfmumdz96dd2lfl6x46vhnxwr58r6dajsrp8us47ef8qgcqjkwx2vu3yalk2m0u8guprvpcleup55dh6qj9x9dn0l4epwgec60s75cqr20p623q8pudwtsathftvyn7733vrdr3gdyhjx42q0q76293d0j0tu7d20kjtt3t5m6zvymvvnps023l6va2m9q6feujh056d4jh9k0mun5pqhl6hxnwx3ftu5hffulc5hmqfv5llkuaaswg8jqdnfadjvvhqyf62pydnlfla8nacqt498zwl7kf9235xzmntwvsxvmmjypuk7atjypmk7untyphkugzrdaex2gzvd9nksarwd9hxwgg',
	invoice:
		'lni1qqg2h2at4w46h2at4w46h2at4w46kzs62d6hqur0wf6zqsj0f32rzv3qv3jhvetvdacx6etwwsfq7anfde3k2mn6dacxzmrp0fax793qmm775nxmvam4pfpqlm5q06k0y84e3x9w0xuhdpmxuna2qj3dfg69ypqzltcgqkpqr0ng5ksz3unqr58gp4rgcdzt5vcavydeds6ckcpjaz6d5p28lsg6gpr2xw05p2pqxalptm7uneynlrsmd2ur9txrft502zjt2m5dpctmcuw03pyysyz25pqzltcgpvpqmm775nxmvam4pfpqlm5q06k0y84e3x9w0xuhdpmxuna2qj3dfg60qsqchrl5h2zpaxtkqap57cdf954jufj7rnq85vjxqlsnj4cc9w4vap0hyrq7h5s66qq35wj6dje49smm30ds4l0frvg4agdk4fva4m5c2',
	offer:
		'lno1pgd9xatswphhyapqgf85c4p3xgsxgetkv4kx7urdv4h8gys0we5kucm9deax7urpd3sh57n0zcss8hhaafxdkemh2zjzplhgql4v7g0tnzv2u7dew6rkde865p9z6j35'
} as const;
