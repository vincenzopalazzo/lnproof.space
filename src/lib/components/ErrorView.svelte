<script lang="ts">
	import { explorer, goHome } from '$lib/store.svelte';
	import type { ErrorView } from '$lib/decode';

	const view = $derived(explorer.view as ErrorView);
</script>

<main style="max-width:720px;margin:0 auto;padding:26px 24px 90px">
	<div
		style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2);margin-bottom:16px"
	>
		<button
			onclick={goHome}
			style="background:none;border:none;color:var(--text2);cursor:pointer;font-family:'Space Grotesk';font-size:13px;padding:0"
			>Explorer</button
		>
		<span style="color:var(--muted)">/</span><span style="color:var(--red);font-weight:600"
			>Decode error</span
		>
	</div>

	<div
		style="padding:24px 26px;border-radius:10px;border:1px solid var(--border);border-left:3px solid var(--red);background:var(--panel)"
	>
		<div
			style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700;letter-spacing:.08em;color:var(--red)"
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"
				><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg
			>
			COULD NOT DECODE
		</div>
		<p style="margin:12px 0 0;font-size:15px;color:var(--text);line-height:1.5">{view.message}</p>
		{#if view.raw}
			<div style="margin-top:16px">
				<div
					style="font-size:11px;color:var(--muted);letter-spacing:.05em;font-weight:600;text-transform:uppercase;margin-bottom:7px"
					>Input</div
				>
				<code
					style="display:block;font-family:'JetBrains Mono';font-size:12px;color:var(--text2);word-break:break-all;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:11px 13px"
					>{view.raw}</code
				>
			</div>
		{/if}
		<p style="margin:16px 0 0;font-size:13px;color:var(--text2);line-height:1.5">
			Paste a BOLT12 payer proof (<span style="font-family:'JetBrains Mono'">lnp1…</span>), offer (<span
				style="font-family:'JetBrains Mono'">lno1…</span
			>) or invoice (<span style="font-family:'JetBrains Mono'">lni1…</span>) — decoding happens entirely
			in your browser.
		</p>
	</div>
</main>
