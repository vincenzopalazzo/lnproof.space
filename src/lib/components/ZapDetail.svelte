<script lang="ts">
	import { explorer, goHome, goZaps, openProof } from '$lib/store.svelte';
	import { ensureZap } from '$lib/zap-feed.svelte';
	import { buildZapDetail } from '$lib/zap';
	import type { ParsedZap } from '$lib/nip102';

	let zap = $state<ParsedZap | null>(null);
	let loading = $state(true);
	let missing = $state(false);

	const detail = $derived(zap ? buildZapDetail(zap) : null);

	$effect(() => {
		const id = explorer.zapId;
		if (!id) return;
		let cancelled = false;
		loading = true;
		missing = false;
		void (async () => {
			const found = await ensureZap(id);
			if (cancelled) return;
			zap = found;
			missing = !found;
			loading = false;
		})();
		return () => {
			cancelled = true;
		};
	});
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
		<button
			onclick={goZaps}
			style="background:none;border:none;color:var(--text2);cursor:pointer;font-family:'Space Grotesk';font-size:13px;padding:0"
			>Zaps</button
		>
		<span style="color:var(--muted)">/</span>
		<span style="color:var(--violet);font-weight:600"
			>{detail?.eventIdShort ?? (explorer.zapId ? explorer.zapId.slice(0, 8) + '…' : '—')}</span
		>
	</div>

	{#if loading}
		<div
			style="padding:28px 26px;border-radius:10px;border:1px solid var(--border);background:var(--panel);font-size:14px;color:var(--text2)"
		>
			Loading zap from relays…
		</div>
	{:else if missing || !detail}
		<div
			style="padding:28px 26px;border-radius:10px;border:1px solid var(--border);background:var(--panel);font-size:14px;color:var(--text2);line-height:1.5"
		>
			No NIP-102 zap with that event id was found on the configured relays.
			<button
				onclick={goZaps}
				style="display:inline;margin-left:6px;background:none;border:none;color:var(--violet);cursor:pointer;font-family:'Space Grotesk';font-size:14px;padding:0;font-weight:600"
				>Back to feed</button
			>
		</div>
	{:else}
		<!-- hero -->
		<div
			style="display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center;padding:24px 26px;border-radius:10px;border:1px solid var(--border);border-left:3px solid var(--violet);background:var(--panel);margin-bottom:18px"
		>
			<div
				style="width:66px;height:66px;border-radius:14px;background:var(--violet-soft);border:1px solid var(--violet-line);display:grid;place-items:center"
			>
				<svg width="30" height="30" viewBox="0 0 24 24" fill="var(--violet)"
					><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg
				>
			</div>
			<div style="min-width:0">
				<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">
					<span style="font-size:12px;font-weight:700;letter-spacing:.08em;color:var(--violet)"
						>KIND 9736 · BOLT12 ZAP</span
					>
					<span
						style="display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;color:var(--text2);background:var(--elev);border:1px solid var(--border);padding:2px 8px;border-radius:6px"
						>LIVE</span
					>
					{#if detail.structurallyValid}
						<span
							style="display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;color:var(--green);background:var(--green-soft);border:1px solid var(--green-line);padding:2px 8px;border-radius:6px"
							>VALID</span
						>
					{:else}
						<span
							style="display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;color:var(--amber);background:var(--amber-soft);border:1px solid var(--amber);padding:2px 8px;border-radius:6px"
							>SHAPE INCOMPLETE</span
						>
					{/if}
				</div>
				<div style="margin-top:6px;display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">
					<span style="font-size:34px;font-weight:700;letter-spacing:-.03em"
						>{detail.amountLabel}</span
					>
					<span style="font-size:15px;color:var(--text2)">sats</span>
				</div>
				<div style="margin-top:3px;font-size:14.5px;color:var(--text2)">
					<span style="color:var(--text);font-weight:600">{detail.payer}</span> zapped
					<span style="color:var(--text);font-weight:600">{detail.recipient}</span> · {detail.target}
				</div>
				{#if detail.hasComment}
					<div
						style="margin-top:8px;display:inline-flex;align-self:flex-start;align-items:center;gap:8px;padding:7px 13px;border-radius:9px;background:var(--violet-soft);border:1px solid var(--violet-line);font-size:13.5px"
					>
						<span style="font-style:italic;color:var(--text2)">"{detail.comment}"</span>
					</div>
				{/if}
			</div>
		</div>

		<div
			style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;align-items:start"
		>
			<!-- binding / structure -->
			<section
				style="border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden"
			>
				<div style="padding:15px 18px;border-bottom:1px solid var(--border)">
					<h2 style="margin:0;font-size:14.5px;font-weight:600">The proof binding</h2>
				</div>
				<div style="padding:16px 18px;display:flex;flex-direction:column;gap:0">
					<p style="margin:0 0 14px;font-size:12.5px;color:var(--text2);line-height:1.5">
						A signed zap-intent (kind 9738) is embedded in the zap. The payer note in the BOLT12
						proof ties the Lightning payment to that exact intent.
					</p>
					{#each detail.binding as b (b.n)}
						<div style="display:flex;gap:12px;align-items:flex-start">
							<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
								<span
									style="width:26px;height:26px;border-radius:8px;background:var(--violet-soft);border:1px solid var(--violet-line);display:grid;place-items:center;font-family:'JetBrains Mono';font-size:11px;font-weight:700;color:var(--violet)"
									>{b.n}</span
								>
								{#if b.line}
									<span style="width:1px;flex:1;min-height:26px;background:var(--border2)"></span>
								{/if}
							</div>
							<div style="flex:1;min-width:0;padding-bottom:16px">
								<div style="font-size:13.5px;font-weight:600">{b.title}</div>
								<div
									style="font-family:'JetBrains Mono';font-size:11px;color:var(--text2);margin-top:4px;word-break:break-all;background:var(--elev);border:1px solid var(--border);border-radius:7px;padding:8px 10px"
								>
									{b.code}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- tags -->
			<section
				style="border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden"
			>
				<div
					style="padding:15px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between"
				>
					<h2 style="margin:0;font-size:14.5px;font-weight:600">Event tags</h2>
					<span style="font-size:11px;color:var(--muted);font-family:'JetBrains Mono'">kind 9736</span>
				</div>
				<div>
					{#each detail.tags as t (t.k + t.v)}
						<div
							style="display:grid;grid-template-columns:96px 1fr;gap:10px;padding:11px 18px;border-bottom:1px solid var(--border)"
						>
							<span
								style="font-family:'JetBrains Mono';font-size:12px;font-weight:600;color:var(--violet)"
								>{t.k}</span
							>
							<span
								style="font-family:'JetBrains Mono';font-size:12px;color:var(--text2);word-break:break-all"
								>{t.v}</span
							>
						</div>
					{/each}
				</div>
			</section>
		</div>

		<!-- validation -->
		<section
			style="margin-top:18px;border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden"
		>
			<div style="padding:15px 18px;border-bottom:1px solid var(--border)">
				<h2 style="margin:0;font-size:14.5px;font-weight:600">NIP-102 validation</h2>
				<p style="margin:6px 0 0;font-size:12px;color:var(--text2);line-height:1.45">
					Checks run client-side against the live event. Open the
					<span style="font-family:'JetBrains Mono';font-size:11px">lnp</span>
					in the Proof explorer for preimage · invoice sig · payer sig · Merkle.
				</p>
			</div>
			<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">
				{#each detail.validation as v (v.t)}
					<div
						style="display:flex;gap:11px;align-items:flex-start;padding:14px 18px;border-bottom:1px solid var(--border);border-right:1px solid var(--border)"
					>
						{#if v.pass}
							<span
								style="flex-shrink:0;width:24px;height:24px;border-radius:7px;background:var(--green-soft);border:1px solid var(--green-line);display:grid;place-items:center"
							>
								<svg
									width="13"
									height="13"
									viewBox="0 0 24 24"
									fill="none"
									stroke="var(--green)"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"><path d="m5 13 4 4L19 7" /></svg
								>
							</span>
						{:else}
							<span
								style="flex-shrink:0;width:24px;height:24px;border-radius:7px;background:var(--amber-soft);border:1px solid var(--amber);display:grid;place-items:center"
							>
								<svg
									width="13"
									height="13"
									viewBox="0 0 24 24"
									fill="none"
									stroke="var(--amber)"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg
								>
							</span>
						{/if}
						<div style="flex:1">
							<div style="font-size:13px;font-weight:600">{v.t}</div>
							<div
								style="font-size:11.5px;color:var(--muted);margin-top:3px;font-family:'JetBrains Mono'"
							>
								{v.d}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- relays published to -->
		<section
			style="margin-top:18px;border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden"
		>
			<div
				style="padding:15px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between"
			>
				<h2 style="margin:0;font-size:14.5px;font-weight:600">Seen on</h2>
				<span style="font-size:11px;color:var(--muted);font-family:'JetBrains Mono'"
					>{detail.relayCount} relays</span
				>
			</div>
			{#if detail.relays.length === 0}
				<div style="padding:16px 18px;font-size:13px;color:var(--text2)">
					No relay reported this event in the last fetch.
				</div>
			{:else}
				<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
					{#each detail.relays as r (r.url)}
						<div
							style="display:flex;align-items:center;gap:10px;padding:13px 18px;border-bottom:1px solid var(--border);border-right:1px solid var(--border)"
						>
							<span
								style="flex-shrink:0;width:8px;height:8px;border-radius:50%;background:{r.dot};box-shadow:0 0 7px {r.dot}"
							></span>
							<div style="flex:1;min-width:0">
								<div
									style="font-family:'JetBrains Mono';font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
								>
									{r.url}
								</div>
								<div style="font-size:10.5px;color:var(--muted);margin-top:2px">{r.meta}</div>
							</div>
							<span
								style="flex-shrink:0;font-size:10.5px;font-weight:700;color:var(--muted);letter-spacing:.03em"
								>SEEN</span
							>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
			{#if detail.proof}
				<button
					onclick={() => openProof(detail.proof)}
					style="display:flex;align-items:center;gap:8px;background:var(--violet);color:#fff;border:none;border-radius:9px;padding:11px 18px;font-weight:600;font-size:13.5px;cursor:pointer;font-family:'Space Grotesk'"
				>
					Inspect the lnp payer proof
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg
					>
				</button>
			{/if}
			<button
				onclick={goZaps}
				style="background:var(--elev);color:var(--text);border:1px solid var(--border);border-radius:9px;padding:11px 18px;font-weight:600;font-size:13.5px;cursor:pointer;font-family:'Space Grotesk'"
				>Back to feed</button
			>
		</div>
	{/if}
</main>
