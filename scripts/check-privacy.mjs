/**
 * Pins the BOLT12 privacy score so a weight or wording change is a visible
 * diff rather than a silent drift.
 *
 * Run: node --experimental-strip-types scripts/check-privacy.mjs
 */
import { scorePrivacy } from '../src/lib/privacy.ts';

let failures = 0;
const check = (name, cond, detail = '') => {
	if (cond) console.log('ok   ' + name);
	else {
		failures++;
		console.log('FAIL ' + name + (detail ? ' — ' + detail : ''));
	}
};

/** Pin a score and the finding ids, so a weight change fails by name. */
const pin = (name, got, score, findingIds) => {
	check(name + ' score', got.score === score, 'got ' + got.score + ', want ' + score);
	check(name + ' findings', ids(got) === findingIds, 'got ' + ids(got));
};

const ids = (s) => s.findings.map((f) => f.id).join(',');

const point = (fill) => {
	const hex = fill.toString(16).padStart(2, '0');
	return '02' + hex.repeat(32);
};
const path = (hops, intro = 'pubkey') => ({
	index: 1,
	firstNode: intro === 'pubkey' ? { kind: 'pubkey', hex: point(0x11) } : { kind: 'sciddir', scid: '1x2x3', direction: 0 },
	firstPathKey: point(0x22),
	hops: hops.map((id) => ({ blindedNodeId: id, encryptedLen: 16, encryptedHex: 'ab'.repeat(16) }))
});
const payinfo = (cltv, ppm = 0) => ({
	feeBaseMsat: 0,
	feeProportionalMillionths: ppm,
	cltvExpiryDelta: cltv,
	htlcMinimumMsat: 1n,
	htlcMaximumMsat: 0n,
	featuresHex: ''
});

const issuer = point(0xaa);

// --- offer: issuer id and no paths is the worst an offer can do on identity ---
const bare = scorePrivacy({
	kind: 'offer',
	issuerName: 'pay@ocean.xyz',
	issuerId: issuer,
	offerMetadata: true,
	offerPaths: [],
	paymentPaths: [],
	payerMetadata: false
});
check('domain in issuer name is high', bare.findings.find((f) => f.id === 'issuer-name')?.level === 'high');
check('issuer id without paths is high', bare.findings.find((f) => f.id === 'issuer-id')?.level === 'high');
pin('bare offer', bare, 78, 'issuer-name,issuer-id,offer-metadata');

// --- offer: multi-hop blinded paths and no issuer id scores better ---
const blinded = scorePrivacy({
	kind: 'offer',
	offerMetadata: false,
	offerPaths: [path([point(0x33), point(0x44)], 'sciddir')],
	paymentPaths: [],
	payerMetadata: false
});
pin('blinded offer', blinded, 0, '');
check('blinded offer scores nothing identifying', blinded.label === 'Nothing identifying');

// --- offer: a one-hop blinded path ---
const selfHop = scorePrivacy({
	kind: 'offer',
	issuerId: issuer,
	offerMetadata: false,
	offerPaths: [path([issuer])],
	paymentPaths: [],
	payerMetadata: false
});
// The hop id is blinded, so it can never be compared with the issuer's real
// key. A one-hop path is medium regardless of what the hop bytes are.
pin('single hop offer', selfHop, 56, 'issuer-id,reply-single-hop,reply-introduction-node');

// --- a plain name is medium, a domain is high ---
const named = scorePrivacy({
	kind: 'offer',
	issuerName: 'vincenzopalazzo',
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [],
	payerMetadata: false
});
pin('named offer', named, 22, 'issuer-name');
const embedded = scorePrivacy({
	kind: 'offer',
	issuerName: 'Alice (example.com)',
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [],
	payerMetadata: false
});
check('a domain anywhere in the issuer name is high', embedded.findings.find((f) => f.id === 'issuer-name')?.level === 'high');
const longName = scorePrivacy({
	kind: 'offer',
	issuerName: 'a'.repeat(10000),
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [],
	payerMetadata: false
});
check('a long issuer name still scores', longName.findings.find((f) => f.id === 'issuer-name')?.level === 'medium');

// --- payer metadata is not scored: the bytes do not say what it is ---
const withMetadata = scorePrivacy({
	kind: 'invoice',
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [],
	payerMetadata: true,
	payerMetadataText: "m/84'/0'/0'/0/7"
});
pin('metadata ignored', withMetadata, 0, '');

// --- payer note is always high ---
const noted = scorePrivacy({
	kind: 'invoice',
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [],
	payerMetadata: false,
	payerNote: 'thanks for the coffee'
});
pin('payer note', noted, 15, 'payer-note');

// --- proof: revealing the payer key scores worse than withholding it ---
const base = {
	kind: 'proof',
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [],
	payerMetadata: false
};
const revealed = scorePrivacy({ ...base, payerId: point(0x55) });
const withheld = scorePrivacy({ ...base, withheldCount: 4 });
pin('revealed payer key', revealed, 11, 'payer-id');
pin('withheld proof', withheld, 0, '');
check('withheld count is surfaced', withheld.withheldCount === 4);
const noneWithheld = scorePrivacy({ ...base, withheldCount: 0 });
check('a proof that withheld nothing still reports the count', noneWithheld.withheldCount === 0);
const unknownWithheld = scorePrivacy({ ...base });
check('a proof with no withheld count does not claim zero', unknownWithheld.withheldCount === undefined);

// --- payinfo fingerprint: baseline CLTV is silent, an odd one is flagged ---
const baseline = scorePrivacy({
	kind: 'invoice',
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [{ ...path([point(0x33), point(0x44)]), payinfo: payinfo(144) }],
	payerMetadata: false
});
const oddCltv = scorePrivacy({
	kind: 'invoice',
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [{ ...path([point(0x33), point(0x44)]), payinfo: payinfo(40, 0) }],
	payerMetadata: false
});
const oddFee = scorePrivacy({
	kind: 'invoice',
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [{ ...path([point(0x33), point(0x44)]), payinfo: payinfo(144, 500) }],
	payerMetadata: false
});
const oddBase = scorePrivacy({
	kind: 'invoice',
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [{ ...path([point(0x33), point(0x44)]), payinfo: { ...payinfo(144), feeBaseMsat: 1000 } }],
	payerMetadata: false
});
pin('baseline payinfo', baseline, 5, 'payment-introduction-node');
pin('odd CLTV', oddCltv, 15, 'payinfo-fingerprint,payment-introduction-node');
check('odd proportional fee alone is a finding', oddFee.findings.some((f) => f.id === 'payinfo-fingerprint'));
check('odd base fee alone is a finding', oddBase.findings.some((f) => f.id === 'payinfo-fingerprint'));

// --- deterministic: same input, same score ---
const again = scorePrivacy({ ...base, payerId: point(0x55) });
check('score is deterministic', again.score === revealed.score && ids(again) === ids(revealed));

// --- worst finding comes first ---
check(
	'findings come worst first',
	bare.findings[0].level === 'high' && bare.findings.at(-1).level === 'low'
);

const unreadable = scorePrivacy({
	kind: 'offer',
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [],
	payerMetadata: false,
	offerPathsUnreadable: true
});
check('unreadable paths are flagged instead of scored as absent', !!unreadable.incomplete);
check('unreadable-only offer is not called nothing identifying', unreadable.label !== 'Nothing identifying', unreadable.label);
const unreadableWithId = scorePrivacy({
	kind: 'offer',
	issuerId: issuer,
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [],
	payerMetadata: false,
	offerPathsUnreadable: true
});
check(
	'unreadable paths do not upgrade the issuer id to high',
	unreadableWithId.findings.find((f) => f.id === 'issuer-id')?.level === 'medium'
);
// Every finding that can coexist, to prove the cap holds at the boundary.
const saturated = scorePrivacy({
	kind: 'invoice',
	issuerName: 'pay@ocean.xyz',
	issuerId: issuer,
	offerMetadata: true,
	offerPaths: [path([point(0x33)])],
	paymentPaths: [{ ...path([point(0x44)]), payinfo: payinfo(40, 500) }],
	payerMetadata: true,
	payerMetadataText: "m/0'",
	payerId: point(0x55),
	payerNote: 'hello'
});
check('a saturated invoice stays at 100', saturated.score === 100, String(saturated.score));
const saturatedProof = scorePrivacy({
	kind: 'proof',
	issuerName: 'pay@ocean.xyz',
	issuerId: issuer,
	offerMetadata: true,
	offerPaths: [path([point(0x33)])],
	paymentPaths: [{ ...path([point(0x44)]), payinfo: payinfo(40, 500) }],
	payerMetadata: true,
	payerMetadataText: "m/0'",
	payerId: point(0x55),
	payerNote: 'hello',
	withheldCount: 0
});
check('a saturated proof stays at 100', saturatedProof.score === 100, String(saturatedProof.score));
const brokenPaymentOnly = scorePrivacy({
	kind: 'invoice',
	issuerId: issuer,
	offerMetadata: false,
	offerPaths: [],
	paymentPaths: [],
	payerMetadata: false,
	paymentPathsUnreadable: true
});
check(
	'a broken payment path does not soften the issuer-id finding',
	brokenPaymentOnly.findings.find((f) => f.id === 'issuer-id')?.level === 'high'
);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
