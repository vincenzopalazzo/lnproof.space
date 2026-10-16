<script lang="ts">
	import { explorer, goHome } from '$lib/store.svelte';
	import { fmt } from '$lib/format';
	import type { InvoiceView } from '$lib/decode';
	import BlindedPaths from './BlindedPaths.svelte';
	import PrivacyScore from './PrivacyScore.svelte';

	const view = $derived(explorer.view as InvoiceView);
</script>

<main style="max-width:880px;margin:0 auto;padding:26px 24px 90px">
	<div
		style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2);margin-bottom:16px"
	>
		<button
			onclick={goHome}
			style="background:none;border:none;color:var(--text2);cursor:pointer;font-family:'Space Grotesk';font-size:13px;padding:0"
			>Explorer</button
		>
		<span style="color:var(--muted)">/</span><span style="color:var(--amber);font-weight:600"
			>Invoice</span
		>
	</div>

	<div
		style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:13px 16px;border:1px solid var(--border);border-radius:12px;background:var(--panel);margin-bottom:18px"
	>
		<span
			style="padding:4px 10px;border-radius:7px;background:var(--amber-soft);color:var(--amber);font-size:11px;font-weight:700;letter-spacing:.04em"
			>INVOICE</span
		>
		<code
			style="flex:1;min-width:180px;font-family:'JetBrains Mono';font-size:12.5px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
			>{view.raw}</code
		>
	</div>

	<div
		style="display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;padding:24px 26px;border-radius:10px;border:1px solid var(--border);border-left:3px solid var(--amber);background:var(--panel);margin-bottom:18px"
	>
		<div
			style="display:grid;place-items:center;width:64px;height:64px;border-radius:14px;background:var(--amber-soft);border:1px solid rgba(247,168,59,.3)"
		>
			<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"
				><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path
					d="M14 2v6h6M9 13h6M9 17h6"
				/></svg
			>
		</div>
		<div>
			<div style="font-size:13px;font-weight:700;letter-spacing:.08em;color:var(--amber)">
				INVOICE · AWAITING / PAID
			</div>
			<div style="margin-top:6px;display:flex;align-items:baseline;gap:9px">
				<span style="font-size:34px;font-weight:700;letter-spacing:-.03em">{fmt(view.amountSats)}</span>
				<span style="font-size:16px;color:var(--text2)">sats</span>
			</div>
			<div style="margin-top:4px;font-size:14px;color:var(--text2)">
				{view.description} · from <span style="color:var(--text);font-weight:600">{view.issuer}</span>
			</div>
		</div>
	</div>

	<PrivacyScore score={view.privacy} />

	<section
		style="border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden;margin-top:18px"
	>
		<div style="padding:16px 18px;border-bottom:1px solid var(--border)">
			<h2 style="margin:0;font-size:14.5px;font-weight:600">Decoded fields</h2>
		</div>
		<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr))">
			{#each view.fields as f (f.key)}
				<div
					style="padding:15px 18px;border-bottom:1px solid var(--border);border-right:1px solid var(--border)"
				>
					<div
						style="font-size:11px;color:var(--muted);letter-spacing:.05em;font-weight:600;text-transform:uppercase;margin-bottom:7px"
						>{f.label}</div
					>
					<span style="font-family:{f.font};font-size:{f.size};color:{f.color};word-break:break-all"
						>{f.shown}</span
					>
				</div>
			{/each}
		</div>
	</section>

	{#if view.paths.length || view.pathsError}
		<BlindedPaths
			paths={view.paths}
			error={view.pathsError}
			title="Blinded payment paths"
			purpose="invoice_paths — the payer routes the HTLC along one of these. Each path's payinfo states the fees, CLTV delta and HTLC bounds the recipient demands."
			accent="amber"
		/>
	{/if}

	{#if view.offerPaths.length || view.offerPathsError}
		<BlindedPaths
			paths={view.offerPaths}
			error={view.offerPathsError}
			title="Offer reply paths"
			purpose="offer_paths reflected inside the invoice — the onion-message routes back to the offer issuer, not payment routes."
			accent="violet"
		/>
	{/if}
</main>
