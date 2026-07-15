<script lang="ts">
	import { onMount } from 'svelte';
	import { goHome, openZap } from '$lib/store.svelte';
	import {
		addZapRelay,
		refreshZaps,
		removeZapRelay,
		zapFeed
	} from '$lib/zap-feed.svelte';
	import { buildRelays, buildZapFeed, buildZapStats } from '$lib/zap';

	let newRelay = $state('');

	const zaps = $derived(buildZapFeed(zapFeed.zaps));
	const relays = $derived(buildRelays(zapFeed.relays));
	const stats = $derived(
		buildZapStats(zapFeed.zaps, zapFeed.relayUrls.length, zapFeed.validCount, zapFeed.totalSats)
	);

	onMount(() => {
		void refreshZaps();
	});

	function handleAddRelay() {
		const url = newRelay.trim();
		if (!url) return;
		if (!/^wss?:\/\//i.test(url)) return;
		addZapRelay(url);
		newRelay = '';
		void refreshZaps(true);
	}

	function handleRemove(url: string) {
		removeZapRelay(url);
		void refreshZaps(true);
	}
</script>

<main style="max-width:1080px;margin:0 auto;padding:26px 24px 90px">
	<div
		style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2);margin-bottom:16px"
	>
		<button
			onclick={goHome}
			style="background:none;border:none;color:var(--text2);cursor:pointer;font-family:'Space Grotesk';font-size:13px;padding:0"
			>Explorer</button
		>
		<span style="color:var(--muted)">/</span>
		<span style="color:var(--violet);font-weight:600">BOLT12 Zaps</span>
	</div>

	<div
		style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:20px"
	>
		<div>
			<h1
				style="margin:0;font-size:27px;font-weight:600;letter-spacing:-.02em;display:flex;align-items:center;gap:10px"
			>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="var(--violet)"
					><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg
				>BOLT12 Zaps
			</h1>
			<p style="margin:8px 0 0;font-size:14px;color:var(--text2);max-width:64ch;line-height:1.5">
				Public <span style="font-family:'JetBrains Mono';font-size:12.5px;color:var(--violet)"
					>kind 9736</span
				>
				Nostr events (NIP-102) that prove a BOLT12 payment to a profile or note — no LNURL server, no
				zap-receipt publisher. Each carries an
				<span style="font-family:'JetBrains Mono';font-size:12.5px">lnp</span> payer proof.
			</p>
			<p style="margin:8px 0 0;font-size:12px;color:var(--muted);max-width:64ch;line-height:1.45">
				Live feed from your configured relays, cached in this browser (IndexedDB). Only events with
				NIP-102 tags (<span style="font-family:'JetBrains Mono';font-size:11px">proof</span> /
				<span style="font-family:'JetBrains Mono';font-size:11px">offer</span> /
				<span style="font-family:'JetBrains Mono';font-size:11px">description</span>) are shown —
				other kind-9736 traffic is ignored.
			</p>
			{#if zapFeed.fromCache || zapFeed.syncing || zapFeed.lastSyncedAt}
				<p style="margin:8px 0 0;font-size:11.5px;color:var(--muted);font-family:'JetBrains Mono'">
					{#if zapFeed.syncing}
						Syncing relays… · showing {zapFeed.cachedCount || zapFeed.zaps.length} cached
					{:else if zapFeed.lastSyncedAt}
						Cached {zapFeed.cachedCount} · last sync {new Date(zapFeed.lastSyncedAt).toLocaleTimeString()}
					{:else if zapFeed.fromCache}
						Loaded from local cache
					{/if}
				</p>
			{/if}
		</div>
		<button
			onclick={() => refreshZaps(true)}
			disabled={zapFeed.loading || zapFeed.syncing}
			style="display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:9px;border:1px solid var(--border);background:var(--elev);color:var(--text);font-weight:600;font-size:13px;cursor:pointer;font-family:'Space Grotesk';opacity:{zapFeed.loading ||
			zapFeed.syncing
				? 0.6
				: 1}"
		>
			{zapFeed.loading ? 'Fetching…' : zapFeed.syncing ? 'Syncing…' : 'Refresh'}
		</button>
	</div>

	<!-- stat row -->
	<div
		style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px"
	>
		{#each stats as s (s.k)}
			<div
				style="padding:15px 17px;border-radius:10px;border:1px solid var(--border);background:var(--panel)"
			>
				<div
					style="font-size:11px;letter-spacing:.06em;color:var(--muted);font-weight:600;text-transform:uppercase"
				>
					{s.k}
				</div>
				<div
					style="margin-top:6px;font-size:22px;font-weight:700;letter-spacing:-.02em;color:{s.color}"
				>
					{s.v}
				</div>
			</div>
		{/each}
	</div>

	<div class="zap-grid" style="display:grid;grid-template-columns:1fr 300px;gap:18px;align-items:start">
		<!-- feed -->
		<section
			style="border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden"
		>
			<div
				style="display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid var(--border)"
			>
				<h2 style="margin:0;font-size:14.5px;font-weight:600">Recent zaps</h2>
				<span style="font-size:11.5px;color:var(--muted);font-family:'JetBrains Mono'"
					>deduped by payment_hash</span
				>
			</div>

			{#if zapFeed.loading && !zapFeed.loaded}
				<div style="padding:28px 18px;font-size:13.5px;color:var(--text2)">
					Connecting to relays…
				</div>
			{:else if zapFeed.error}
				<div style="padding:28px 18px;font-size:13.5px;color:var(--amber)">
					{zapFeed.error}
				</div>
			{:else if zaps.length === 0}
				<div style="padding:28px 18px;font-size:13.5px;color:var(--text2);line-height:1.5">
					No NIP-102 BOLT12 zaps found on the configured relays yet. Kind
					<span style="font-family:'JetBrains Mono';font-size:12px">9736</span>
					may exist for other protocols — this feed only counts events with an
					<span style="font-family:'JetBrains Mono';font-size:12px">lnp</span>
					proof / <span style="font-family:'JetBrains Mono';font-size:12px">lno</span> offer.
				</div>
			{:else}
				{#each zaps as z (z.eventId)}
					<button
						class="zap-row"
						onclick={() => openZap(z.eventId)}
						style="width:100%;text-align:left;cursor:pointer;display:flex;gap:14px;align-items:flex-start;padding:16px 18px;border:none;border-bottom:1px solid var(--border);background:none;color:var(--text);transition:.14s;font-family:'Space Grotesk'"
					>
						<div
							style="flex-shrink:0;width:40px;height:40px;border-radius:10px;background:var(--violet-soft);border:1px solid var(--violet-line);display:grid;place-items:center"
						>
							<svg width="19" height="19" viewBox="0 0 24 24" fill="var(--violet)"
								><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg
							>
						</div>
						<div style="flex:1;min-width:0">
							<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
								<span style="font-size:17px;font-weight:700;letter-spacing:-.01em"
									>{z.amountLabel}</span
								>
								<span style="font-size:12px;color:var(--text2)">sats</span>
								<span style="font-size:13px;color:var(--muted)">·</span>
								<span style="font-size:13px;color:var(--text2)"
									><span style="color:var(--text);font-weight:600">{z.payer}</span> →
									<span style="color:var(--text);font-weight:600">{z.recipient}</span></span
								>
							</div>
							<div style="margin-top:4px;font-size:13.5px;color:var(--text2);line-height:1.45">
								{z.target}
							</div>
							{#if z.hasComment}
								<div style="margin-top:6px;font-size:13px;color:var(--text);font-style:italic">
									"{z.comment}"
								</div>
							{/if}
							<div style="margin-top:9px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
								{#if z.structurallyValid}
									<span
										style="display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;color:var(--green);background:var(--green-soft);border:1px solid var(--green-line);padding:3px 8px;border-radius:6px;letter-spacing:.03em"
										>VALID</span
									>
								{:else}
									<span
										style="display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;color:var(--amber);background:var(--amber-soft);border:1px solid var(--amber);padding:3px 8px;border-radius:6px;letter-spacing:.03em"
										>SHAPE INCOMPLETE</span
									>
								{/if}
								{#each z.relayChips as r (r)}
									<span
										style="font-family:'JetBrains Mono';font-size:10.5px;color:var(--text2);background:var(--elev);border:1px solid var(--border);padding:3px 8px;border-radius:6px"
										>{r}</span
									>
								{/each}
								<span style="font-family:'JetBrains Mono';font-size:10.5px;color:var(--muted)"
									>{z.ago}</span
								>
							</div>
						</div>
					</button>
				{/each}
			{/if}
		</section>

		<!-- relay panel -->
		<aside style="display:flex;flex-direction:column;gap:14px;position:sticky;top:80px">
			<section
				style="border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden"
			>
				<div style="padding:14px 16px;border-bottom:1px solid var(--border)">
					<h2
						style="margin:0;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px"
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--violet)"
							stroke-width="2"
							><path d="M5 12.5a10 10 0 0 1 14 0M2 9a15 15 0 0 1 20 0M8.5 16a5 5 0 0 1 7 0" /><circle
								cx="12"
								cy="20"
								r="1"
							/></svg
						>Relays
					</h2>
					<p style="margin:7px 0 0;font-size:11.5px;color:var(--text2);line-height:1.45">
						Events hydrate from IndexedDB first, then sync from relays. Clients filter by
						<span style="font-family:'JetBrains Mono';font-size:11px">#p</span>,
						<span style="font-family:'JetBrains Mono';font-size:11px">#e</span>
						or
						<span style="font-family:'JetBrains Mono';font-size:11px">#a</span>.
					</p>
				</div>
				<div style="padding:6px 16px 12px">
					{#each relays as r (r.url)}
						<div
							style="display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--border)"
						>
							<span
								style="flex-shrink:0;width:8px;height:8px;border-radius:50%;background:{r.dot};box-shadow:0 0 7px {r.dot}"
							></span>
							<div style="flex:1;min-width:0">
								<div
									style="font-family:'JetBrains Mono';font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
								>
									{r.url}
								</div>
								<div style="font-size:10.5px;color:var(--muted);margin-top:2px">{r.meta}</div>
							</div>
							<span
								style="flex-shrink:0;font-family:'JetBrains Mono';font-size:12px;font-weight:600;color:var(--text2)"
								>{r.count}</span
							>
							<button
								onclick={() => handleRemove(r.url)}
								aria-label="Remove relay"
								style="flex-shrink:0;background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:0 2px;line-height:1"
								>×</button
							>
						</div>
					{/each}
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleAddRelay();
						}}
						style="display:flex;gap:6px;margin-top:10px"
					>
						<input
							bind:value={newRelay}
							placeholder="wss://…"
							style="flex:1;min-width:0;background:var(--elev);border:1px solid var(--border);border-radius:7px;padding:7px 9px;color:var(--text);font-family:'JetBrains Mono';font-size:11px;outline:none"
						/>
						<button
							type="submit"
							style="background:var(--violet);color:#fff;border:none;border-radius:7px;padding:7px 10px;font-weight:600;font-size:12px;cursor:pointer;font-family:'Space Grotesk'"
							>Add</button
						>
					</form>
				</div>
			</section>
			<div
				style="padding:14px 16px;border-radius:10px;border:1px solid var(--border);border-left:3px solid var(--violet);background:var(--panel)"
			>
				<div
					style="font-size:11px;letter-spacing:.06em;color:var(--muted);font-weight:600;text-transform:uppercase"
				>
					Cumulative view
				</div>
				<p style="margin:7px 0 0;font-size:12px;color:var(--text2);line-height:1.5">
					The total is computed by each client over valid proof events —
					<span style="color:var(--text)">it is not consensus</span>. Duplicate proofs count once; on
					conflict, the lower amount wins.
				</p>
			</div>
		</aside>
	</div>
</main>

<style>
	.zap-row:hover {
		background: var(--panel2);
	}
</style>
