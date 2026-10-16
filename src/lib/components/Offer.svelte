<script lang="ts">
	import { explorer, goHome } from '$lib/store.svelte';
	import type { OfferView } from '$lib/decode';
	import BlindedPaths from './BlindedPaths.svelte';
	import PrivacyScore from './PrivacyScore.svelte';

	const view = $derived(explorer.view as OfferView);
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
		<span style="color:var(--muted)">/</span><span style="color:var(--violet);font-weight:600">Offer</span>
	</div>

	<div
		style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:13px 16px;border:1px solid var(--border);border-radius:12px;background:var(--panel);margin-bottom:18px"
	>
		<span
			style="padding:4px 10px;border-radius:7px;background:var(--violet-soft);color:var(--violet);font-size:11px;font-weight:700;letter-spacing:.04em"
			>OFFER</span
		>
		<code
			style="flex:1;min-width:180px;font-family:'JetBrains Mono';font-size:12.5px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
			>{view.raw}</code
		>
	</div>

	<div
		style="padding:24px 26px;border-radius:10px;border:1px solid var(--border);border-left:3px solid var(--violet);background:var(--panel);margin-bottom:18px"
	>
		<div style="font-size:13px;font-weight:700;letter-spacing:.08em;color:var(--violet)">
			REUSABLE OFFER · CAN BE PAID MANY TIMES
		</div>
		<div style="margin-top:10px;font-size:26px;font-weight:700;letter-spacing:-.02em">
			{view.description}
		</div>
		<div style="margin-top:6px;font-size:15px;color:var(--text2)">
			by <span style="color:var(--text);font-weight:600">{view.issuer}</span> · amount
			<span style="color:var(--amber);font-weight:600">{view.amount}</span>
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
			title="Blinded paths"
			purpose="offer_paths — onion-message routes a payer follows to request an invoice. The encrypted blobs are opaque outside the path."
			accent="violet"
		/>
	{/if}
</main>
