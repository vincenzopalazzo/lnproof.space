/**
 * Central explorer state — a Svelte 5 runes object shared across components.
 *
 * Navigation is URL-driven so every decoded string is shareable as
 * `lnproof.space/<string>`. The decode itself happens in `applyUrl`, called by
 * the route's effect whenever the path param changes.
 *
 * Zap feed / detail use reserved paths `/zaps` and `/zaps/<index>` so they
 * stay shareable without colliding with BOLT12 bech32 strings. Live relay
 * fetch is intentionally out of scope — no WebSocket phone-home by default.
 */
import { goto } from '$app/navigation';
import type { Screen, Theme } from './data';
import { SAMPLES, SAMPLE_ZAPS } from './data';
import { decodeInput, type DecodeView } from './decode';

const THEME_KEY = 'lnproof-theme';

function initialTheme(): Theme {
	if (typeof localStorage !== 'undefined') {
		const stored = localStorage.getItem(THEME_KEY);
		if (stored === 'light' || stored === 'dark') return stored;
	}
	return 'dark';
}

interface ExplorerState {
	screen: Screen;
	theme: Theme;
	query: string;
	verifyStep: number;
	showTlv: boolean;
	copied: string;
	view: DecodeView | null;
	/** Index into SAMPLE_ZAPS when screen is `zapDetail`. */
	zapIndex: number;
}

export const explorer: ExplorerState = $state({
	screen: 'landing',
	theme: initialTheme(),
	query: '',
	verifyStep: 0,
	showTlv: false,
	copied: '',
	view: null,
	zapIndex: 0
});

let verifyTimer: ReturnType<typeof setInterval> | null = null;
let copyTimer: ReturnType<typeof setTimeout> | null = null;

/** Apply a decoded view: switch to the matching screen, animate proofs. */
function show(view: DecodeView): void {
	explorer.view = view;
	explorer.screen = view.kind;
	explorer.showTlv = false;
	if (view.kind === 'proof') runVerify();
	else stopTimers(); // don't leave a proof's verify timer ticking on other screens
}

/**
 * Navigation is URL-driven so every decoded string is shareable as
 * `lnproof.space/<string>`. The decode itself happens in `applyUrl`, called by
 * the route's effect whenever the path param changes — these helpers only steer
 * the URL, which keeps the address bar, deep links and back/forward in sync.
 *
 * BOLT12 bech32 payloads are percent-encoded (they can contain `/`). Reserved
 * app paths (`zaps`, `zaps-<n>`) are left as plain path segments.
 */
function navigate(code: string): void {
	if (!code) {
		void goto('/', { keepFocus: true, noScroll: true });
		return;
	}
	// Reserved app routes: plain path segments (no encode of separators).
	if (code === 'zaps' || /^zaps-\d+$/.test(code)) {
		void goto('/' + code, { keepFocus: true, noScroll: true });
		return;
	}
	void goto('/' + encodeURIComponent(code), { keepFocus: true, noScroll: true });
}

export function goHome(): void {
	navigate('');
}

/** Open the NIP-102 BOLT12 zap feed (concept fixtures). */
export function goZaps(): void {
	navigate('zaps');
}

/** Open a single zap detail from the feed. */
export function openZap(index: number): void {
	const i = Math.max(0, Math.min(index, SAMPLE_ZAPS.length - 1));
	// Single path segment (`zaps-0`) so optional `[[code]]` matches on refresh.
	navigate(`zaps-${i}`);
}

/** Decode whatever is currently in the search box. */
export function onSubmit(): void {
	const q = explorer.query.trim();
	if (!q) return;
	navigate(q);
}

/** Load one of the bundled real sample strings and decode it. */
export function loadSample(kind: 'proof' | 'offer' | 'invoice'): void {
	explorer.query = SAMPLES[kind];
	navigate(SAMPLES[kind]);
}

/** Navigate to a raw BOLT12 string (e.g. the proof pinned on a zap fixture). */
export function openProof(raw: string): void {
	const q = raw.trim();
	if (!q) return;
	navigate(q);
}

/**
 * Sync state from the URL path. `code` is the decoded `[[code]]` route param
 * (empty for the landing page). This is the single place that mutates the
 * screen/view from a navigation, so deep links and back/forward Just Work.
 *
 * Reserved paths:
 *   - `zaps`       → zap feed
 *   - `zaps/<n>`   → zap detail for SAMPLE_ZAPS[n]
 */
export function applyUrl(code: string): void {
	const raw = code.trim();
	if (!raw) {
		// Back to landing — but only touch state if we're not already there.
		if (explorer.screen !== 'landing' || explorer.view !== null) {
			stopTimers();
			explorer.screen = 'landing';
			explorer.view = null;
			explorer.query = '';
			explorer.verifyStep = 0;
			explorer.zapIndex = 0;
		}
		return;
	}

	// Reserved zap routes (not BOLT12 bech32).
	// Accept both `zaps-0` (canonical) and legacy `zaps/0` if the param was decoded.
	if (raw === 'zaps') {
		stopTimers();
		explorer.screen = 'zaps';
		explorer.view = null;
		explorer.query = '';
		explorer.verifyStep = 0;
		return;
	}
	const zapDetail = /^zaps[-/](\d+)$/.exec(raw);
	if (zapDetail) {
		const idx = Number(zapDetail[1]);
		const clamped = Number.isFinite(idx)
			? Math.max(0, Math.min(idx, SAMPLE_ZAPS.length - 1))
			: 0;
		stopTimers();
		explorer.zapIndex = clamped;
		explorer.screen = 'zapDetail';
		explorer.view = null;
		explorer.query = '';
		explorer.verifyStep = 0;
		return;
	}

	if (explorer.view?.raw === raw) return; // already showing this exact string
	explorer.query = raw;
	show(decodeInput(raw));
}

/** Copy the current page URL so it can be shared as a decode link. */
export function copyShareLink(): void {
	if (typeof navigator === 'undefined' || !navigator.clipboard) return;
	navigator.clipboard
		.writeText(location.href)
		.then(() => setCopied('share'))
		.catch(() => {});
}

export function toggleTheme(): void {
	explorer.theme = explorer.theme === 'dark' ? 'light' : 'dark';
	if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, explorer.theme);
}

export function toggleTlv(): void {
	explorer.showTlv = !explorer.showTlv;
}

export function onQuery(value: string): void {
	explorer.query = value;
}

/** Step the verification checks forward, one every 720ms — same cadence as the design. */
export function runVerify(): void {
	if (verifyTimer) clearInterval(verifyTimer);
	explorer.verifyStep = 0;
	verifyTimer = setInterval(() => {
		if (explorer.verifyStep >= 4) {
			if (verifyTimer) clearInterval(verifyTimer);
			verifyTimer = null;
			return;
		}
		explorer.verifyStep += 1;
	}, 720);
}

export const replay = runVerify;

/** Flags `key` as just-copied for ~1.4s so the matching button can show feedback. */
export function setCopied(key: string): void {
	explorer.copied = key;
	if (copyTimer) clearTimeout(copyTimer);
	copyTimer = setTimeout(() => {
		explorer.copied = '';
	}, 1400);
}

export function stopTimers(): void {
	if (verifyTimer) {
		clearInterval(verifyTimer);
		verifyTimer = null;
	}
	if (copyTimer) {
		clearTimeout(copyTimer);
		copyTimer = null;
	}
}
