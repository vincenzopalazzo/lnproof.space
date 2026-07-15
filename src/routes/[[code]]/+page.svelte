<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { explorer, applyUrl } from '$lib/store.svelte';
	import Header from '$lib/components/Header.svelte';
	import Landing from '$lib/components/Landing.svelte';
	import Proof from '$lib/components/Proof.svelte';
	import Offer from '$lib/components/Offer.svelte';
	import Invoice from '$lib/components/Invoice.svelte';
	import ErrorView from '$lib/components/ErrorView.svelte';
	import ZapFeed from '$lib/components/ZapFeed.svelte';
	import ZapDetail from '$lib/components/ZapDetail.svelte';
	import Footer from '$lib/components/Footer.svelte';

	// The URL drives what's decoded: `/<string>` shows that decode, `/` is the
	// landing page, `/zaps` and `/zaps-<eventId>` are live NIP-102 zap screens.
	// Track only the path param; untrack the state mutation so this effect never
	// re-runs on its own writes (and handles back/forward for free).
	$effect(() => {
		const code = page.params.code ?? '';
		untrack(() => applyUrl(code));
	});
</script>

<div
	data-theme={explorer.theme}
	style="min-height:100vh;background:var(--bg);color:var(--text);font-family:'Space Grotesk',system-ui,sans-serif"
>
	<Header notLanding={explorer.screen !== 'landing'} />

	{#if explorer.screen === 'landing'}
		<Landing />
	{:else if explorer.screen === 'proof'}
		<Proof />
	{:else if explorer.screen === 'offer'}
		<Offer />
	{:else if explorer.screen === 'invoice'}
		<Invoice />
	{:else if explorer.screen === 'error'}
		<ErrorView />
	{:else if explorer.screen === 'zaps'}
		<ZapFeed />
	{:else if explorer.screen === 'zapDetail'}
		<ZapDetail />
	{/if}

	<Footer />
</div>
