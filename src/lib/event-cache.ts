/**
 * Client-side Nostr event cache (IndexedDB), inspired by Jumble's
 * `indexed-db.service` EVENTS store.
 *
 * Offline-first: hydrate the UI from disk, then refresh from relays and
 * persist new events. Stores raw events + relay hints — callers re-parse.
 */
import type { Event } from 'nostr-tools';

export interface CachedEvent {
	event: Event;
	relays: string[];
}

const DB_NAME = 'lnproof';
const DB_VERSION = 1;
const STORE = 'events';
/** Soft cap so the cache cannot grow forever on a busy relay set. */
const MAX_EVENTS = 500;

let dbPromise: Promise<IDBDatabase> | null = null;

function available(): boolean {
	return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
	if (!available()) return Promise.reject(new Error('IndexedDB unavailable'));
	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
			req.onsuccess = () => resolve(req.result);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(STORE)) {
					const store = db.createObjectStore(STORE, { keyPath: 'event.id' });
					store.createIndex('createdAt', 'event.created_at');
					store.createIndex('kind', 'event.kind');
				}
			};
		});
	}
	return dbPromise;
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
	});
}

function txDone(tx: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
		tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
	});
}

/** Persist events, merging relay hints when an id already exists. */
export async function putEvents(items: CachedEvent[]): Promise<void> {
	if (!available() || items.length === 0) return;
	const db = await openDb();

	// Read existing relay hints in a separate tx so the write tx stays sync.
	const ids = items.map((i) => i.event?.id).filter((id): id is string => !!id);
	const existingById = new Map<string, CachedEvent>();
	{
		const readTx = db.transaction(STORE, 'readonly');
		const readStore = readTx.objectStore(STORE);
		await Promise.all(
			ids.map(async (id) => {
				const existing = (await idbReq(readStore.get(id))) as CachedEvent | undefined;
				if (existing) existingById.set(id, existing);
			})
		);
		await txDone(readTx);
	}

	const writeTx = db.transaction(STORE, 'readwrite');
	const writeStore = writeTx.objectStore(STORE);
	for (const item of items) {
		if (!item.event?.id) continue;
		const prev = existingById.get(item.event.id);
		const relays = [...new Set([...(prev?.relays ?? []), ...item.relays])];
		writeStore.put({ event: item.event, relays });
	}
	await txDone(writeTx);
	await pruneOldest(MAX_EVENTS);
}

/** Newest-first events matching `kind` (optional) up to `limit`. */
export async function getEvents(opts?: {
	kind?: number;
	limit?: number;
}): Promise<CachedEvent[]> {
	if (!available()) return [];
	const limit = opts?.limit ?? 100;
	const kind = opts?.kind;
	const db = await openDb();
	const tx = db.transaction(STORE, 'readonly');
	const store = tx.objectStore(STORE);
	const index = store.index('createdAt');
	const results: CachedEvent[] = [];

	await new Promise<void>((resolve, reject) => {
		const req = index.openCursor(null, 'prev');
		req.onerror = () => reject(req.error ?? new Error('cursor failed'));
		req.onsuccess = () => {
			const cursor = req.result;
			if (!cursor || results.length >= limit) {
				resolve();
				return;
			}
			const item = cursor.value as CachedEvent;
			if (kind == null || item.event.kind === kind) {
				results.push(item);
			}
			cursor.continue();
		};
	});

	await txDone(tx);
	return results;
}

export async function getEventById(id: string): Promise<CachedEvent | undefined> {
	if (!available() || !id) return undefined;
	const db = await openDb();
	const tx = db.transaction(STORE, 'readonly');
	const store = tx.objectStore(STORE);
	const item = (await idbReq(store.get(id))) as CachedEvent | undefined;
	await txDone(tx);
	return item;
}

export async function clearEvents(): Promise<void> {
	if (!available()) return;
	const db = await openDb();
	const tx = db.transaction(STORE, 'readwrite');
	tx.objectStore(STORE).clear();
	await txDone(tx);
}

async function pruneOldest(max: number): Promise<void> {
	if (!available()) return;
	const db = await openDb();
	const tx = db.transaction(STORE, 'readwrite');
	const store = tx.objectStore(STORE);
	const count = await idbReq(store.count());
	if (count <= max) {
		await txDone(tx);
		return;
	}

	const toDelete = count - max;
	const index = store.index('createdAt');
	let deleted = 0;

	await new Promise<void>((resolve, reject) => {
		const req = index.openCursor(null, 'next'); // oldest first
		req.onerror = () => reject(req.error ?? new Error('prune cursor failed'));
		req.onsuccess = () => {
			const cursor = req.result;
			if (!cursor || deleted >= toDelete) {
				resolve();
				return;
			}
			cursor.delete();
			deleted++;
			cursor.continue();
		};
	});

	await txDone(tx);
}
