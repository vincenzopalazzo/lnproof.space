/**
 * Reactive zap feed: IndexedDB cache first (Jumble-style), then live relays.
 */
import { getEventById, getEvents, putEvents } from './event-cache';
import {
	dedupeZaps,
	fetchBolt12Zaps,
	looksLikeNip102,
	parseBolt12Zap,
	ZAP_KIND,
	type ParsedZap,
	type RelayStat
} from './nip102';
import { addRelay, loadRelays, removeRelay, relayHost } from './relays';

interface ZapFeedState {
	loading: boolean;
	/** True while a background relay refresh is running after cache hydrate. */
	syncing: boolean;
	error: string;
	zaps: ParsedZap[];
	relays: RelayStat[];
	relayUrls: string[];
	totalSats: number;
	validCount: number;
	rawKindCount: number;
	loaded: boolean;
	/** True when the current feed was (at least partly) restored from IndexedDB. */
	fromCache: boolean;
	lastSyncedAt: number | null;
	cachedCount: number;
}

export const zapFeed: ZapFeedState = $state({
	loading: false,
	syncing: false,
	error: '',
	zaps: [],
	relays: [],
	relayUrls: loadRelays(),
	totalSats: 0,
	validCount: 0,
	rawKindCount: 0,
	loaded: false,
	fromCache: false,
	lastSyncedAt: null,
	cachedCount: 0
});

let inflight: Promise<void> | null = null;
let hydrated = false;

function applyZaps(zaps: ParsedZap[]): void {
	const sorted = [...zaps].sort((a, b) => b.createdAt - a.createdAt);
	zapFeed.zaps = sorted;
	zapFeed.validCount = sorted.filter((z) => z.structurallyValid).length;
	zapFeed.totalSats = sorted
		.filter((z) => z.structurallyValid)
		.reduce((a, z) => a + z.amountSats, 0);
}

function relayStatsFromUrls(urls: string[], counts: Map<string, number>): RelayStat[] {
	return urls.map((url) => {
		const count = counts.get(url) ?? 0;
		if (count === 0) {
			return {
				url,
				host: relayHost(url),
				count: 0,
				status: 'warn' as const,
				meta: 'cached · awaiting sync',
				dot: 'var(--amber)'
			};
		}
		return {
			url,
			host: relayHost(url),
			count,
			status: 'ok' as const,
			meta: 'cached · kind 9736',
			dot: 'var(--green)'
		};
	});
}

async function hydrateFromCache(): Promise<boolean> {
	if (hydrated) return zapFeed.zaps.length > 0;
	hydrated = true;
	try {
		const cached = await getEvents({ kind: ZAP_KIND, limit: 100 });
		const nip102 = cached.filter((c) => looksLikeNip102(c.event));
		if (nip102.length === 0) {
			zapFeed.cachedCount = 0;
			return false;
		}
		const parsed = dedupeZaps(
			nip102.map((c) => parseBolt12Zap(c.event, c.relays))
		);
		applyZaps(parsed);
		zapFeed.cachedCount = parsed.length;
		zapFeed.fromCache = true;
		zapFeed.loaded = true;

		const counts = new Map<string, number>();
		for (const z of parsed) {
			for (const url of z.seenOn) {
				counts.set(url, (counts.get(url) ?? 0) + 1);
			}
		}
		zapFeed.relays = relayStatsFromUrls(zapFeed.relayUrls, counts);
		return true;
	} catch {
		return false;
	}
}

export async function refreshZaps(force = false): Promise<void> {
	if (inflight && !force) return inflight;

	const run = (async () => {
		const hadCache = await hydrateFromCache();
		const showFullLoading = !hadCache && !zapFeed.loaded;

		if (showFullLoading) zapFeed.loading = true;
		else zapFeed.syncing = true;
		zapFeed.error = '';

		try {
			const res = await fetchBolt12Zaps({ relays: zapFeed.relayUrls, limit: 100 });

			// Merge network + any cached events that relays may have dropped.
			const byId = new Map<string, ParsedZap>();
			for (const z of zapFeed.zaps) byId.set(z.eventId, z);
			for (const z of res.zaps) {
				const prev = byId.get(z.eventId);
				if (!prev) {
					byId.set(z.eventId, z);
					continue;
				}
				byId.set(z.eventId, {
					...z,
					seenOn: [...new Set([...prev.seenOn, ...z.seenOn])]
				});
			}
			const merged = dedupeZaps([...byId.values()]);
			applyZaps(merged);

			zapFeed.relays = res.relays;
			zapFeed.rawKindCount = res.rawKindCount;
			zapFeed.loaded = true;
			zapFeed.fromCache = hadCache && res.zaps.length === 0;
			zapFeed.lastSyncedAt = Date.now();
			zapFeed.cachedCount = merged.length;

			void putEvents(
				merged.map((z) => ({
					event: z.event,
					relays: z.seenOn
				}))
			).catch(() => {
				/* cache write is best-effort */
			});
		} catch (e) {
			zapFeed.error = e instanceof Error ? e.message : String(e);
			// Keep showing cache if we have it.
			if (!zapFeed.loaded) zapFeed.loaded = hadCache;
		} finally {
			zapFeed.loading = false;
			zapFeed.syncing = false;
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
	const id = eventId.toLowerCase();

	const existing = getZap(id) ?? getZap(eventId);
	if (existing) return existing;

	await hydrateFromCache();
	const fromMem = getZap(id) ?? getZap(eventId);
	if (fromMem) return fromMem;

	try {
		const cached = await getEventById(id);
		if (cached && looksLikeNip102(cached.event)) {
			const z = parseBolt12Zap(cached.event, cached.relays);
			if (!getZap(z.eventId)) zapFeed.zaps = [z, ...zapFeed.zaps];
			return z;
		}
	} catch {
		/* ignore */
	}

	if (!zapFeed.loaded && !zapFeed.loading && !zapFeed.syncing) await refreshZaps();
	const fromFeed = getZap(id) ?? getZap(eventId);
	if (fromFeed) return fromFeed;

	try {
		const res = await fetchBolt12Zaps({
			relays: zapFeed.relayUrls,
			limit: 5,
			ids: [id]
		});
		if (res.zaps.length === 0) return null;
		const z = res.zaps[0]!;
		if (!getZap(z.eventId)) zapFeed.zaps = [z, ...zapFeed.zaps];
		void putEvents([{ event: z.event, relays: z.seenOn }]).catch(() => {});
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
