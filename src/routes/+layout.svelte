<script lang="ts">
	import '../app.css';
	import { onDestroy } from 'svelte';
	import { explorer, stopTimers } from '$lib/store.svelte';

	let { children } = $props();

	// Mirror the theme onto <html> so the document-root background (app.css)
	// follows the active theme — html/body sit outside the themed page <div>.
	$effect(() => {
		document.documentElement.dataset.theme = explorer.theme;
	});

	onDestroy(stopTimers);
</script>

{@render children()}
