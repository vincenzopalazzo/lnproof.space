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
 * Each fixture carries its own real lnp payer proof (minted via
 * scripts/mint-zap-fixtures.mjs) with amount + nostr:nip102:<intentId> note
 * matching the zap tags, so Inspect lands on a genuine matching proof.
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
		proof: 'lnp1pgd9xatswphhyapqgf85c4p3xgsxgetkv4kx7urdv4h8gys0we5kucm9deax7urpd3sh57n02gzqzsr0gpvzqxlx3fdq9rexq8gwsr2x3s6yhge36cgmjmp43dsr9695mgz50lq35szx5vl3fz5zq5h7vz28gwlaf7d7gvsanzku0c3ur2mz9v96sv8zw8g7u89l67zs4gzqzsr0gzczphhaafxdkemh2zjzplhgql4v7g0tnzv2u7dew6rkde865p9z6j357pqgt3g8328r2hj22zzmh293ardk0w4492afhcyxfq3fwvfn8prqhkwmngvuwy9m8tak3gm2ws3552v080mklvv3wpnxpyq692lpk8pltrc5q887327jvqvlztrjq5tpnfyfwz7z2qqwq3t5mxuf5qeqyllq234nvuyxhw22m6yzy26x6krw5k5hepxd233qmcnxgksfzcq9tadhqu806qlfyzs6rgdp5xs6rgdp5xs6rgdp5xs6rgdp5xs6rgdp5xs6rgdp5xs6rlgragq38lgradqg3gtmkervf92f6qtuq6r2tq8vedfltdwcl225tk8dcme2sgsuddkusm3j6wzvywqd2g695dsedz0ws548ewudtlfuu0t2ud0n72uzet7s8m8aqyqz3zukvlt0gk7yvj5gfzadqza7mpt938naq9fjc6dhjpdcuekw0lam366lw5yqlqx66clssv04s237cxdzglh3m002jxvfgene4w4m988dftgt06my27p6eg6rnhkqutkm3p9p0n278eegc8qwkpdelaqx3xy4226v3fwpklarys2pfwze9teqrtep5jwp7lmf8nhlqea4ynf4a462vv6xdgwrl68mhxugfgsuj3cwtgu8qhwwhhayz3dag8760ngpyy5yxch0jg685rx70t5e3kssw48e3lncuu67epqhlrv879r8ry0eke3xd5asjhnvnrrp9t53qumgcvqfz75mlplfdetxa9ymfseal6m9vrejy90hwpz4efru0tl5wp9cskhsvqhes7avxy3hc7lglwdrelgra49kummnw3er5mnfwqcnqv36v5mkyvnrx9snjep5vccx2vmzxesnsce4vsckvvn9xp3rgcfhvvekgwt9x4nrzcfkvgcxxvny8pjnge3hvyckyvmrx4jrqefjvcmq',
		intentId: 'e7b2c1a9d4f0e3b6a8c5d1f2e0b4a7c3d9e5f1a6b0c2d8e4f7a1b3c5d0e2f6',
		payerNote: 'nostr:nip102:e7b2c1a9d4f0e3b6a8c5d1f2e0b4a7c3d9e5f1a6b0c2d8e4f7a1b3c5d0e2f6',
		paymentHash: '52fe6094743bfd4f9be4321d98adc7e23c1ab622b0ba830e271d1ee1cbfd7850'
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
		proof: 'lnp1pgd9xatswphhyapqgf85c4p3xgsxgetkv4kx7urdv4h8gys0we5kucm9deax7urpd3sh57n02gzq97hsspvzqxlx3fdq9rexq8gwsr2x3s6yhge36cgmjmp43dsr9695mgz50lq35szx5drzjz5zpnsfha5hjldctcer9ptkm5vfn36qent8u5m6z99rp5u05vt3zzdt4gzq97hsszczphhaafxdkemh2zjzplhgql4v7g0tnzv2u7dew6rkde865p9z6j357pqp8zupjjhv6q34kd80pe90qguexl6hnllwm9px5q6vrwx3zmjgjelnuvg45dn3pr2f33f3am2954k09mgw6zfjpzrknk9njrra386dwhc5p6d72cd2fmf8fgukdca6m2jvnqmym6m04ehnelhyrvmj3mh74ytyugdxe32ewek9npmptt659w6hedzryz9ets9krcwtv4ngdkfvduw06qlfyz329g4z52329g4z52329g4z52329g4z52329g4z52329g4z52329lgragq38lgradq9zs3gxmm90lzh03zxkplthynyt4fkvlavanvpn9703hrs0fm25njkmcwfqa57dsnr3wdywsepzqwmv60xfh8v4yhpuglk9s5nc063sn7s8m8aqyq0wa82zfam2fumd0urtl3f85e3s7fm9kxxjvy3pwwtkkdxa5mr0zw27ygw37dn7d60hhe00qh3cmya3kd6g9cszrjtp8rcl4t7ve9qrs2ecd47qlla27ehstnvcmczva3c68t0uahnp8cphfl60tz5mn22u0kr5j996t8hlyg5wttkseaerptdaq7kl8prkm74qsafw9ltuu68ulj30ratzrpg6ps2ljrk55ksrwrc6ngun9t3se7lrp5d6chhvl0kwa0fckqp7vxrmatggfdsvgamft8nfdt0jusa30ecuz8mcgsa77pq72j3sxud83jj8sqr94k4t42pletr0psrn4edznn37rrcddq2zwjeh0cvkypy2qchpx9vg6g5jmshu73p90jawgcrsrrnun63zurgalgra4xxummnw3er5mnfwqcnqv36x3nrzcecvcmxzvryx4jngcf5v5unge34v4nrjwtyx93nzefcv9jryc3hv5cxxvmxx4snzepev5mxydrr8psnqe3jvs6k2dmzx93nx',
		intentId: '4f1c8f6a0d5e4a4e94f5ef99d1c1e8ad2b7e0c3f5a1d9e6b4c8a0f2d5e7b1c3',
		payerNote: 'nostr:nip102:4f1c8f6a0d5e4a4e94f5ef99d1c1e8ad2b7e0c3f5a1d9e6b4c8a0f2d5e7b1c3',
		paymentHash: 'ce09bf69797db85e32328576dd1899c740ccd67e537a114a30d38fa3171109ab'
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
		proof: 'lnp1pgd9xatswphhyapqgf85c4p3xgsxgetkv4kx7urdv4h8gys0we5kucm9deax7urpd3sh57n02gpe395qtqsphe52tgpg7fsp6r5q635vx396xvwkzxukcdvtvqew3dx6q4rlcydyq34r83js4qsyharf23kmf3zlph6sx4sske42ywcpe0748gh8uvkm8k4x84xec592qwvfdq9syr00m6jvmdnhw59yyrlwspl2eus7hxyc4eumja58vmj04gz2949rfuzqs0um2saqej53qv94ykmlzxqh7ge69zqnnem87q8kj2gxqkn5hyxzlfzyvruw6qatvk5gme30k06fdp6t07kxezwzl8qjrcen99ry05l3gqnmpemwq4ct6tgatdj9vjdpmvtd26nzqmcw9s4gycfnqa7avf74w085fcjvunjgqghux2lvuy6926ry8seux5ejhjrzjsev4lwtt89hl5p7jg9r5w368gar5w368gar5w368gar5w368gar5w368gar5w368gar507s86spz07s866q3qs5nhgx5ukge83dwm9p4f79f8ega4x9dmhqkw5jdgxk4spjynenm7s0c94mdc0jnp5fuuf6j6w3gstmprj9xuy5uma843u0zx6tp5laq0k06qgqrjcfmurnk0dnxtd4er7994jg9mkesn6fkucjxfg2kkgvekjj3wt62j3la4yeey3xdlu2z6k77g7pfkt49dtackzupx53t8jpkyjgpx50ahp3wvkvtqw6ngquyqc53xpckycgwlyxj4a9zha2qy5djus5r6we43rewanhl7w7zgcucxk2jw2d2cul330mpxk9e9elvgz4vzce8cf300ncjlezy3qpa7uc7yk6kzgkjzewskgxnsc3gj6h8tcx0q2gxd2l33dtpq8mh6znsukap3k2wh5j4klwm8yhswtusc38s9mye7k3hl5rq2p4kjjee0tnqp4gk59xx2uzkuhplduyff3nlpxchd34jhdg69d30nankh5smul5ftc3f2225vunpqy0lh0sxs6dh0v377mdv87s8m2ddehhxarj8fhxjup3xqer5wtrxpjrzefjvcekzdrzx43nvephv5uxvwfsx9snyc3nvv6xgdt9xenrwvpcxyunycfnvg6xxdtyxejnwe3cxqunzcfjvgekxdryx4js',
		intentId: '9c0d1e2f3a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e',
		payerNote: 'nostr:nip102:9c0d1e2f3a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e',
		paymentHash: '4bf469546db4c45f0df5035610b66aa23b01cbfd53a2e7e32db3daa63d4d9c50'
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
		proof: 'lnp1pgd9xatswphhyapqgf85c4p3xgsxgetkv4kx7urdv4h8gys0we5kucm9deax7urpd3sh57n02gpjqzeqtqsphe52tgpg7fsp6r5q635vx396xvwkzxukcdvtvqew3dx6q4rlcydyq34r8fm54qsgv2g2q5zaaxmajyukxqre2ngap3qphfma8d089s4vnpy8hu00nma2qvsqkg9syr00m6jvmdnhw59yyrlwspl2eus7hxyc4eumja58vmj04gz2949rfuzqncg4l3lfscat8hzwdzudvx5ypydx6sc8ml7x9l8w9nkcv2l4e62xgqy7r5zmyrzja6kffsqez0wycg605d5r5dggux38rmqj0kaq4783gqhlsuexhhelkcnf2yse5a9ca0eat8j8y6jun6unytusrggrzvzsgnpzjwlqpfjd8zs43hpgwp4tnr5vr0ysv35yxmvz6smr0zmrpgptl5p7jg9y5jj2ff9y5jj2ff9y5jj2ff9y5jj2ff9y5jj2ff9y5jj2ff9y5n7s86spz07s866q36kjy2l890rzlyhvm42taeruzf7t5xtlq97uq0u7zpsw5wttgjlf8fg493jm3pqf24nh3eryqxfvwtyn2p0wgsrraaul82scrs3c24laq0k06qgqy0ratcdcvg7wntg6e0ada2mnw9jpusjh4q8mmlc785078y9hzej23d6nlqd3khe0ytl8p3h82mjvaaefv7uptaulqehu5ynf6zq6xkufsp5kahemlnms4qp70ws83nm6wkcvtkz4308uup3cc6dvj48njh8n0507qv0ltrwq8qg9ctn03tj3fp3ccqtla9afknn62qd23hyj8ffncnqfd6lzhwvmv5myug9h6x85efys0rchafs85fwkj8k6vpg76jlkgap6r3fcc559z7zlz64aue8c3cgu0qgsgg02sh8fzxtfv4p88jmf5drf2fwg070q9t2xa20shlxf0uyd35pph5r4t2m25r3yt3ltpcq2ue2y6fhs462esll0tcdv4gya4eu73rng3sr63nwkrezvgr7s8m2ddehhxarj8fhxjup3xqer5vrpx93rycenvs6x2dtxxccrwvfcxgunxcf5vg6kxdnyxajnse3expsnzc3jvvekgdr9x4nrvvphxyurywfnvy6xydtrxejrwefcvcus',
		intentId: '0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9',
		payerNote: 'nostr:nip102:0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9',
		paymentHash: '86290a0505de9b7d913963007954d1d0c401ba77d3b5e72c2ac98487bf1ef9ef'
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
		proof: 'lnp1pgd9xatswphhyapqgf85c4p3xgsxgetkv4kx7urdv4h8gys0we5kucm9deax7urpd3sh57n02gzqta0pqpvzqxlx3fdq9rexq8gwsr2x3s6yhge36cgmjmp43dsr9695mgz50lq35szx5df9uz5zplytvsqpch7apuh5p7m8mtj2sedzck730qmxwmtdtdvt0yt7xdch4gzqta0pqzczphhaafxdkemh2zjzplhgql4v7g0tnzv2u7dew6rkde865p9z6j357pqqzppa94npdfnvlsm75egec484trgl8s5faf7ek2l65pp5kzqcm2yh06e7hyfrxh8xmpfzzaz8daaqq2jjn3xcntvfs5g9n8phnwy9g8c5qrprprszde62jcrqnrl9hnf392ftu625khnw98j5h2x3ljdu7mkz8rvcrdvhugjhmxucjlqw7k8e8hk90tn2rjykepzn9f4ef4w7pvkl6qlfyzj6tfd95kj6tfd95kj6tfd95kj6tfd95kj6tfd95kj6tfd95kj6tlgragq38lgradqzr5pv2e5y2948v4s9lawnkzh9vf8xn3wm80eup6kzuz3q8gm9nxtz3938dsdzs5dwvt59f3ypxl8dh4a2jkl2chxx96gkrs6pahwxnl7s8m8aqyq8u3gfz8gycmwclyd2423qtqlw3kyaaflrswq2ydr00xjf8np6pczlkr25eeu0v6tn6sluurgn8mhv0u7hn67uc8056hmvfwm0a9vqp9mjs0as7t66j8ye7nregyd6eevjua2620dy57d7lgt2h7tuaegmjf3u83zytkq2x29xny78f07hljse3hs39ev3hwn0nnnpw00xg86fxsqa2364fagmf5ckm9t6aeaqrt3fr9xr5tkuukn6dc3curd9qd8k6gwta0gzgl9pcekedw09ja9ss3mmg8dyhrrzsvxkcaukma76ldpr3za498gcnp3mkmzmh9exzk50e8nqjvgjwrxr42yaaw3lfactkhdplr72ud378hp6zve0zjx8rtfdkyq705qwz8n660z7cxqsg8q2mlgra4xxummnw3er5mnfwqcnqv36x9nryefnvs6xxdtzxesnwwfcxpnrzefjvsekxdrzx4snvwfh8quxvvr9x9jrycenvg6xzdfexcurwdecxcun2cf5vgekxvnyx9jnq',
		intentId: '1f2e3d4c5b6a7980f1e2d3c4b5a69788f0e1d2c3b4a5968778695a4b3c2d1e0',
		payerNote: 'nostr:nip102:1f2e3d4c5b6a7980f1e2d3c4b5a69788f0e1d2c3b4a5968778695a4b3c2d1e0',
		paymentHash: 'fc8b64001c5fdd0f2f40fb67dae4a865a2c5bd17836676d6d5b58b7917e33717'
	}
];