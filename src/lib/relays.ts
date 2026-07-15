/**
 * Client-side relay list for the NIP-102 zap feed.
 * Persisted in localStorage so users can add/remove relays without a server.
 */

const STORAGE_KEY = 'lnproof:relays';

export const DEFAULT_RELAYS = [
	'wss://relay.damus.io',
	'wss://nos.lol',
	'wss://relay.primal.net',
	'wss://relay.snort.social',
	'wss://nostr.wine',
	'wss://relay.nostr.band'
] as const;

function normalize(url: string): string {
	return url.trim().replace(/\/+$/, '');
}

function isRelayUrl(url: string): boolean {
	return /^wss?:\/\/.+/i.test(url);
}

function unique(urls: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const u of urls) {
		const n = normalize(u);
		if (!n || seen.has(n) || !isRelayUrl(n)) continue;
		if (
			typeof location !== 'undefined' &&
			location.protocol === 'https:' &&
			n.startsWith('ws://')
		) {
			continue;
		}
		seen.add(n);
		out.push(n);
	}
	return out;
}

export function defaultRelays(): string[] {
	return unique([...DEFAULT_RELAYS]);
}

export function loadRelays(): string[] {
	if (typeof localStorage === 'undefined') return defaultRelays();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultRelays();
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return defaultRelays();
		const urls = unique(parsed.filter((x): x is string => typeof x === 'string'));
		return urls.length > 0 ? urls : defaultRelays();
	} catch {
		return defaultRelays();
	}
}

export function saveRelays(urls: string[]): string[] {
	const next = unique(urls);
	if (typeof localStorage !== 'undefined') {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		} catch {
			/* private mode — non-fatal */
		}
	}
	return next;
}

export function addRelay(current: string[], url: string): string[] {
	return saveRelays([...current, url]);
}

export function removeRelay(current: string[], url: string): string[] {
	const n = normalize(url);
	return saveRelays(current.filter((u) => normalize(u) !== n));
}

export function relayHost(url: string): string {
	return url.replace(/^wss?:\/\//, '');
}
