<script lang="ts">
	import { short, copyText, fmt } from '$lib/format';
	import type { BlindedPathView, BlindedPayinfoView } from '$lib/blinded-path';

	interface Props {
		paths: BlindedPathView[];
		error?: string;
		/** Section heading, e.g. "Blinded paths" or "Offer reply paths". */
		title: string;
		/** What these paths are for — shown under the heading. */
		purpose: string;
		/** Accent color token name fragment: 'violet' | 'amber'. */
		accent?: 'violet' | 'amber';
	}

	const { paths, error, title, purpose, accent = 'violet' }: Props = $props();

	let copied = $state('');

	async function copy(key: string, value: string) {
		await copyText(value);
		copied = key;
		setTimeout(() => {
			if (copied === key) copied = '';
		}, 1200);
	}

	function intro(p: BlindedPathView): { label: string; shown: string; full: string } {
		if (p.firstNode.kind === 'pubkey') {
			return { label: 'Introduction node', shown: short(p.firstNode.hex, 10, 8), full: p.firstNode.hex };
		}
		const dir = p.firstNode.direction === 0 ? 'node A → B' : 'node B → A';
		return {
			label: 'Introduction channel',
			shown: `${p.firstNode.scid} · ${dir}`,
			full: `sciddir ${p.firstNode.direction}:${p.firstNode.scid}`
		};
	}

	function payLine(info: BlindedPayinfoView): string {
		const base = info.feeBaseMsat ? `${fmt(info.feeBaseMsat)} msat base` : 'no base fee';
		const ppm = `${fmt(info.feeProportionalMillionths)} ppm`;
		const min = `min ${info.htlcMinimumMsat.toLocaleString('en-US')} msat`;
		const max =
			info.htlcMaximumMsat === 0n
				? 'no max'
				: `max ${info.htlcMaximumMsat.toLocaleString('en-US')} msat`;
		return `${base} + ${ppm} · CLTV ${info.cltvExpiryDelta} · HTLC ${min}, ${max}`;
	}
</script>

<section
	style="border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden;margin-top:18px"
>
	<div style="padding:16px 18px;border-bottom:1px solid var(--border)">
		<h2 style="margin:0;font-size:14.5px;font-weight:600">{title}</h2>
		<div style="margin-top:4px;font-size:12.5px;color:var(--text2)">{purpose}</div>
	</div>

	{#if error}
		<div
			style="margin:14px 18px;padding:10px 12px;border-radius:8px;background:var(--red-soft);border:1px solid var(--red);font-size:12.5px;color:var(--text)"
		>
			Blinded path data is malformed — decoded what was readable, then stopped: {error}
		</div>
	{/if}

	{#each paths as p (p.index)}
		{@const id = intro(p)}
		<div style="padding:16px 18px;border-bottom:1px solid var(--border)">
			<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
				<span
					style="padding:2px 8px;border-radius:6px;background:var(--{accent}-soft);color:var(--{accent});font-size:11px;font-weight:700;letter-spacing:.04em"
					>PATH {p.index}</span
				>
				<span style="font-size:12px;color:var(--muted)">{p.hops.length} hop(s)</span>
			</div>

			{#if p.payinfo}
				<div style="font-size:12.5px;color:var(--text2);margin-bottom:12px">
					<span style="color:var(--amber);font-weight:600">payinfo</span>
					{payLine(p.payinfo)}
					{#if p.payinfo.featuresHex}
						· features <code style="font-family:'JetBrains Mono';font-size:11.5px">{p.payinfo.featuresHex}</code>
					{/if}
				</div>
			{/if}

			<!-- introduction point -->
			<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
				<span style="font-size:11px;color:var(--muted);font-weight:600;letter-spacing:.05em;min-width:150px"
					>{id.label.toUpperCase()}</span
				>
				<button
					onclick={() => copy(`intro-${p.index}`, id.full)}
					title={id.full}
					style="background:none;border:none;padding:0;cursor:pointer;font-family:'JetBrains Mono';font-size:12.5px;color:var(--text)"
					>{copied === `intro-${p.index}` ? 'copied ✓' : id.shown}</button
				>
			</div>
			<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:6px">
				<span style="font-size:11px;color:var(--muted);font-weight:600;letter-spacing:.05em;min-width:150px"
					>FIRST PATH KEY</span
				>
				<button
					onclick={() => copy(`key-${p.index}`, p.firstPathKey)}
					title={p.firstPathKey}
					style="background:none;border:none;padding:0;cursor:pointer;font-family:'JetBrains Mono';font-size:12.5px;color:var(--text2)"
					>{copied === `key-${p.index}` ? 'copied ✓' : short(p.firstPathKey, 10, 8)}</button
				>
			</div>

			<!-- hop chain -->
			<div style="margin-top:12px;padding-left:6px;border-left:2px solid var(--{accent}-line)">
				{#each p.hops as hop, i (hop.blindedNodeId + i)}
					<div style="padding:7px 0 7px 14px">
						<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
							<span style="font-size:11px;color:var(--muted);font-weight:600">HOP {i + 1}</span>
							<button
								onclick={() => copy(`hop-${p.index}-${i}`, hop.blindedNodeId)}
								title={hop.blindedNodeId}
								style="background:none;border:none;padding:0;cursor:pointer;font-family:'JetBrains Mono';font-size:12.5px;color:var(--text)"
								>{copied === `hop-${p.index}-${i}` ? 'copied ✓' : short(hop.blindedNodeId, 10, 8)}</button
							>
							<span style="font-size:11px;color:var(--muted)">blinded node id</span>
						</div>
						<div style="margin-top:3px;font-size:11.5px;color:var(--muted)">
							{#if hop.encryptedLen}
								encrypted recipient data · {hop.encryptedLen} bytes ·
								<code style="font-family:'JetBrains Mono';color:var(--text2)"
									>{short(hop.encryptedHex, 8, 6)}</code
								>
								— opaque, encrypted to this hop
							{:else}
								no encrypted recipient data — spec-invalid hop, shown as decoded
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	{#if paths.length === 0 && !error}
		<div style="padding:14px 18px;font-size:12.5px;color:var(--muted)">No blinded paths.</div>
	{/if}
</section>
