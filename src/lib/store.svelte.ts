/**
 * Central explorer state — a Svelte 5 runes object shared across components.
 *
 * Navigation is driven by *decoding*: submitting a string (or loading a sample)
 * runs bolt12-utils via decode.ts and stores the resulting view. The screen is
 * simply `view.kind` (with a dedicated error screen for bad input).
 */
import type { Screen, Theme } from './data';
import { SAMPLES } from './data';
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
}

export const explorer: ExplorerState = $state({
	screen: 'landing',
	theme: initialTheme(),
	query: '',
	verifyStep: 0,
	showTlv: false,
	copied: '',
	view: null
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

export function goHome(): void {
	stopTimers();
	explorer.screen = 'landing';
	explorer.query = '';
	explorer.view = null;
	explorer.verifyStep = 0;
}

/** Decode whatever is currently in the search box. */
export function onSubmit(): void {
	const q = explorer.query.trim();
	if (!q) return;
	show(decodeInput(q));
}

/** Load one of the bundled real sample strings and decode it. */
export function loadSample(kind: 'proof' | 'offer' | 'invoice'): void {
	explorer.query = SAMPLES[kind];
	show(decodeInput(SAMPLES[kind]));
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
