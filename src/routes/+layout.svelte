<script lang="ts">
	import '../app.css';
	import { onDestroy } from 'svelte';
	import { stopTimers } from '$lib/store.svelte';

	let { children } = $props();

	onDestroy(stopTimers);
</script>

{@render children()}
