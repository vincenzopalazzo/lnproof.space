<script lang="ts">
	import { explorer, copyShareLink, goHome, onQuery, onSubmit, toggleTheme } from '$lib/store.svelte';

	let { notLanding = false } = $props();
</script>

<header
	style="position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:18px;padding:13px 22px;background:var(--bg2);border-bottom:1px solid var(--border);backdrop-filter:blur(8px)"
>
	<button
		onclick={goHome}
		style="display:flex;align-items:center;gap:11px;background:none;border:none;cursor:pointer;padding:0;color:var(--text)"
		aria-label="Go home"
	>
		<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:6px;background:var(--violet)">
			<svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
		</span>
		<span style="font-weight:700;font-size:18px;letter-spacing:-.02em"
			>lnproof<span style="color:var(--violet)">.space</span></span
		>
	</button>

	{#if notLanding}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				onSubmit();
			}}
			style="flex:1;max-width:560px;display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--border);border-radius:11px;padding:6px 6px 6px 13px"
		>
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"
				><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg
			>
			<input
				value={explorer.query}
				oninput={(e) => onQuery(e.currentTarget.value)}
				placeholder="Paste a payer proof, offer or invoice…"
				style="flex:1;background:none;border:none;outline:none;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:12.5px"
			/>
			<button
				type="submit"
				style="background:var(--violet);color:#fff;border:none;border-radius:8px;padding:7px 14px;font-weight:600;font-size:12.5px;cursor:pointer;font-family:'Space Grotesk'"
				>Decode</button
			>
		</form>
	{/if}

	<div style="flex:1"></div>

	{#if notLanding}
		<button
			onclick={copyShareLink}
			title="Copy a shareable link to this decode"
			style="display:flex;align-items:center;gap:7px;padding:6px 11px;border:1px solid {explorer.copied === 'share' ? 'var(--green-line)' : 'var(--border)'};border-radius:9px;background:var(--panel);font-size:12px;color:{explorer.copied === 'share' ? 'var(--green)' : 'var(--text2)'};font-weight:500;cursor:pointer;font-family:'Space Grotesk';transition:.16s"
		>
			{#if explorer.copied === 'share'}
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
					><path d="M20 6 9 17l-5-5" /></svg
				>
				Copied
			{:else}
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
					><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path
						d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"
					/></svg
				>
				Copy link
			{/if}
		</button>
	{/if}

	<div
		style="display:flex;align-items:center;gap:6px;padding:6px 11px;border:1px solid var(--border);border-radius:9px;background:var(--panel);font-size:12px;color:var(--text2);font-weight:500"
	>
		<span style="width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)"
		></span>mainnet
	</div>
	<button
		onclick={toggleTheme}
		title="Toggle theme"
		aria-label="Toggle theme"
		style="display:grid;place-items:center;width:36px;height:36px;border-radius:9px;border:1px solid var(--border);background:var(--panel);cursor:pointer;color:var(--text2)"
	>
		{#if explorer.theme === 'dark'}
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
				><circle cx="12" cy="12" r="4" /><path
					d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"
				/></svg
			>
		{:else}
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
				><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg
			>
		{/if}
	</button>
</header>
