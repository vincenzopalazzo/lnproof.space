/**
 * Reactive cache for live NIP-102 zaps fetched from Nostr relays.
 * Loaded on demand when the user opens `/zaps` or a zap detail deep link.
 */
import { fetchBolt12Zaps, type ParsedZap, type RelayStat } from './nip102';
import { addRelay, loadRelays, removeRelay } from './relays';

interface ZapFeedState {
	loading: boolean;
	error: string;
	zaps: ParsedZap[];
	relays: RelayStat[];
	relayUrls: string[];
	totalSats: number;
	validCount: number;
	rawKindCount: number;
	loaded: boolean;
}

export const zapFeed: ZapFeedState = $state({
	loading: false,
	error: '',
	zaps: [],
	relays: [],
	relayUrls: loadRelays(),
	totalSats: 0,
	validCount: 0,
	rawKindCount: 0,
	loaded: false
});

let inflight: Promise<void> | null = null;

export async function refreshZaps(force = false): Promise<void> {
	if (inflight && !force) return inflight;
	const run = (async () => {
		zapFeed.loading = true;
		zapFeed.error = '';
		try {
			const res = await fetchBolt12Zaps({ relays: zapFeed.relayUrls, limit: 100 });
			zapFeed.zaps = res.zaps;
			zapFeed.relays = res.relays;
			zapFeed.totalSats = res.totalSats;
			zapFeed.validCount = res.validCount;
			zapFeed.rawKindCount = res.rawKindCount;
			zapFeed.loaded = true;
		} catch (e) {
			zapFeed.error = e instanceof Error ? e.message : String(e);
		} finally {
			zapFeed.loading = false;
			inflight = null;
		}
	})();
	inflight = run;
	return run;
}

export function getZap(eventId: string): ParsedZap | undefined {
	return zapFeed.zaps.find((z) => z.eventId === eventId);
}

/** Ensure the feed is loaded, then optionally fetch a single missing event by id. */
export async function ensureZap(eventId: string): Promise<ParsedZap | null> {
	if (!/^[0-9a-f]{64}$/i.test(eventId)) return null;
	const existing = getZap(eventId);
	if (existing) return existing;
	if (!zapFeed.loaded && !zapFeed.loading) await refreshZaps();
	const fromFeed = getZap(eventId);
	if (fromFeed) return fromFeed;

	try {
		const res = await fetchBolt12Zaps({
			relays: zapFeed.relayUrls,
			limit: 5,
			ids: [eventId.toLowerCase()]
		});
		if (res.zaps.length === 0) return null;
		const z = res.zaps[0]!;
		if (!getZap(z.eventId)) zapFeed.zaps = [z, ...zapFeed.zaps];
		return z;
	} catch {
		return null;
	}
}

export function addZapRelay(url: string): void {
	zapFeed.relayUrls = addRelay(zapFeed.relayUrls, url);
}

export function removeZapRelay(url: string): void {
	zapFeed.relayUrls = removeRelay(zapFeed.relayUrls, url);
}
