<script lang="ts">
	import type { PrivacyScore, PrivacyLevel } from '$lib/privacy';

	interface Props {
		score: PrivacyScore;
	}

	const { score }: Props = $props();

	const accent: Record<PrivacyLevel, string> = { low: 'green', medium: 'amber', high: 'red' };
	const color = $derived(accent[score.level]);
</script>

<section
	style="margin-top:18px;border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden"
>
	<div style="padding:16px 18px;border-bottom:1px solid var(--border)">
		<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap">
			<h2 style="margin:0;font-size:14.5px;font-weight:600">Privacy</h2>
			<span
				style="padding:3px 9px;border-radius:7px;background:var(--{color}-soft);color:var(--{color});font-size:11px;font-weight:700;letter-spacing:.04em"
				>{score.label.toUpperCase()} · {score.score}</span
			>
		</div>
		<div style="margin-top:8px;height:6px;border-radius:99px;background:var(--panel2);overflow:hidden">
			<div style="height:100%;width:{score.score}%;background:var(--{color})"></div>
		</div>
		<p style="margin:8px 0 0;font-size:12.5px;color:var(--text2);line-height:1.5">
			How much this string reveals about its creator to anyone reading it. Judged from the bytes
			alone, in the browser.
		</p>
	</div>

	{#if score.findings.length === 0}
		<div style="padding:14px 18px;font-size:12.5px;color:var(--text2)">
			Nothing in this string identifies a party or fingerprints a route.
		</div>
	{:else}
		<div style="display:flex;flex-direction:column">
			{#each score.findings as f (f.id)}
				<div style="padding:12px 18px;border-bottom:1px solid var(--border)">
					<div style="display:flex;align-items:baseline;gap:8px">
						<span
							style="flex-shrink:0;font-size:10px;font-weight:700;letter-spacing:.05em;color:var(--{accent[
								f.level
							]});text-transform:uppercase">{f.level}</span
						>
						<span style="font-size:13px;color:var(--text);line-height:1.45">{f.detail}</span>
					</div>
					<div style="margin-top:4px;font-size:11.5px;color:var(--muted);line-height:1.45">{f.rule}</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if score.incomplete}
		<div
			style="padding:12px 18px;background:var(--amber-soft);font-size:12.5px;color:var(--text);line-height:1.5"
		>
			{score.incomplete}
		</div>
	{/if}

	{#if score.withheldCount}
		<div style="padding:12px 18px;font-size:12.5px;color:var(--text2);line-height:1.5">
			The payer kept {score.withheldCount} field{score.withheldCount === 1 ? '' : 's'} hidden. A hidden
			field cannot leak, which is the point of the proof's selective disclosure.
		</div>
	{/if}
</section>
