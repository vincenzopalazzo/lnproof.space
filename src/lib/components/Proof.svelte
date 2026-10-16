<script lang="ts">
	import { explorer, toggleTlv, replay, setCopied } from '$lib/store.svelte';
	import { goHome } from '$lib/store.svelte';
	import { fmt, copyText, buildChecks } from '$lib/format';
	import type { ProofView } from '$lib/decode';
	import BlindedPaths from './BlindedPaths.svelte';

	// +page only renders this when the active view is a proof.
	const view = $derived(explorer.view as ProofView);

	const step = $derived(explorer.verifyStep);
	const settled = $derived(step >= 4);
	const allValid = $derived(view.verify.allValid);
	const verifyPct = $derived(((step / 4) * 100).toFixed(0) + '%');
	const ringColor = $derived(settled && !allValid ? 'var(--red)' : 'var(--green)');
	const statusColor = $derived(settled && !allValid ? 'var(--red)' : 'var(--green)');
	const statusLabel = $derived(
		!settled ? 'VERIFYING…' : allValid ? 'PAYMENT VERIFIED' : 'VERIFICATION FAILED'
	);

	const checks = $derived(buildChecks(step, view.checks));

	async function copyField(key: string, full: string) {
		await copyText(full);
		setCopied(key);
	}
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
		<span style="color:var(--green);font-weight:600">Payer proof</span>
	</div>

	<!-- proof string row -->
	<div
		style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:13px 16px;border:1px solid var(--border);border-radius:12px;background:var(--panel);margin-bottom:18px"
	>
		<span
			style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:7px;background:var(--green-soft);color:var(--green);font-size:11px;font-weight:700;letter-spacing:.04em;white-space:nowrap"
			>PAYER PROOF</span
		>
		<code
			style="flex:1;min-width:180px;font-family:'JetBrains Mono';font-size:12.5px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
			>{view.raw}</code
		>
		<button
			onclick={() => copyField('proof', view.raw)}
			style="display:flex;align-items:center;gap:6px;background:var(--elev);border:1px solid var(--border);border-radius:8px;padding:6px 11px;font-size:12px;color:var(--text);cursor:pointer;font-family:'Space Grotesk'"
			>{explorer.copied === 'proof' ? 'Copied ✓' : 'Copy'}</button
		>
	</div>

	<!-- HERO verified banner -->
	<div
		style="position:relative;overflow:hidden;display:grid;grid-template-columns:auto 1fr;gap:26px;align-items:center;padding:26px 28px;border-radius:10px;border:1px solid var(--border);border-left:3px solid {ringColor};background:var(--panel)"
	>
		<div style="position:relative;width:96px;height:96px;display:grid;place-items:center">
			<div
				style="position:absolute;inset:0;border-radius:50%;background:conic-gradient({ringColor} {verifyPct}, var(--border2) 0)"
			></div>
			<div style="position:absolute;inset:6px;border-radius:50%;background:var(--panel)"></div>
			{#if settled && allValid}
				<svg
					style="position:relative;animation:popIn .5s cubic-bezier(.2,1.3,.5,1)"
					width="46"
					height="46"
					viewBox="0 0 24 24"
					fill="none"
					stroke="var(--green)"
					stroke-width="2.6"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="m5 13 4 4L19 7" /></svg
				>
			{:else if settled}
				<svg
					style="position:relative;animation:popIn .5s cubic-bezier(.2,1.3,.5,1)"
					width="42"
					height="42"
					viewBox="0 0 24 24"
					fill="none"
					stroke="var(--red)"
					stroke-width="2.6"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg
				>
			{:else}
				<span
					style="position:relative;font-family:'JetBrains Mono';font-size:20px;font-weight:700;color:var(--green)"
					>{step}/4</span
				>
			{/if}
		</div>
		<div style="display:flex;flex-direction:column;gap:6px;min-width:0">
			<div style="display:flex;align-items:center;gap:10px">
				<span style="font-size:13px;font-weight:700;letter-spacing:.08em;color:{statusColor}"
					>{statusLabel}</span
				>
			</div>
			<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
				<span style="font-size:42px;font-weight:700;letter-spacing:-.03em;line-height:1"
					>{fmt(view.amountSats)}</span
				>
				<span style="font-size:18px;color:var(--text2);font-weight:500">sats</span>
				<span style="font-size:14px;color:var(--muted);font-family:'JetBrains Mono'"
					>≈ {view.amountBtc} BTC</span
				>
			</div>
			<div style="font-size:15px;color:var(--text2)">
				paid to <span style="color:var(--text);font-weight:600">{view.issuer}</span> ·
				<span>{view.description}</span>
			</div>
			{#if view.payerNote}
				<div
					style="margin-top:6px;display:inline-flex;align-self:flex-start;align-items:center;gap:8px;padding:7px 13px;border-radius:9px;background:var(--violet-soft);border:1px solid var(--violet-line);font-size:13.5px;color:var(--text)"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" stroke-width="2"
						><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
					>
					<span style="font-style:italic;color:var(--text2)">"{view.payerNote}"</span>
				</div>
			{/if}
		</div>
	</div>

	<div
		class="proof-grid"
		style="display:grid;grid-template-columns:1.25fr 1fr;gap:18px;margin-top:18px;align-items:start"
	>
		<!-- verification ledger -->
		<section
			style="border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden"
		>
			<div
				style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border)"
			>
				<h2 style="margin:0;font-size:14.5px;font-weight:600">Verification ledger</h2>
				<span style="font-size:11.5px;color:var(--muted);font-family:'JetBrains Mono'">4 checks</span>
			</div>
			<div style="padding:6px 18px 14px">
				{#each checks as c (c.label)}
					<div
						style="display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--border)"
					>
						<div
							style="flex-shrink:0;width:30px;height:30px;display:grid;place-items:center;border-radius:9px;background:{c.bg};border:1px solid {c.bd}"
						>
							{#if c.done}
								<svg
									style="animation:popIn .45s cubic-bezier(.2,1.3,.5,1)"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="var(--green)"
									stroke-width="2.8"
									stroke-linecap="round"
									stroke-linejoin="round"><path d="m5 13 4 4L19 7" /></svg
								>
							{:else if c.failed}
								<svg
									style="animation:popIn .45s cubic-bezier(.2,1.3,.5,1)"
									width="15"
									height="15"
									viewBox="0 0 24 24"
									fill="none"
									stroke="var(--red)"
									stroke-width="2.8"
									stroke-linecap="round"
									stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg
								>
							{:else if c.active}
								<span
									style="width:15px;height:15px;border-radius:50%;border:2px solid var(--border2);border-top-color:var(--violet);animation:spin .7s linear infinite"
								></span>
							{:else}
								<span style="width:7px;height:7px;border-radius:50%;background:var(--muted)"></span>
							{/if}
						</div>
						<div style="flex:1;min-width:0">
							<div style="font-size:14px;font-weight:600;color:{c.titleColor}">{c.label}</div>
							<div
								style="font-family:'JetBrains Mono';font-size:11.5px;color:var(--muted);margin-top:3px;word-break:break-all"
								>{c.detail}</div
							>
						</div>
						{#if c.done}
							<span
								style="flex-shrink:0;font-size:11px;font-weight:700;color:var(--green);background:var(--green-soft);padding:3px 8px;border-radius:6px;letter-spacing:.04em"
								>OK</span
							>
						{:else if c.failed}
							<span
								style="flex-shrink:0;font-size:11px;font-weight:700;color:var(--red);background:var(--red-soft);padding:3px 8px;border-radius:6px;letter-spacing:.04em"
								>FAIL</span
							>
						{/if}
					</div>
				{/each}
				<button
					onclick={replay}
					style="margin-top:13px;display:flex;align-items:center;gap:7px;background:var(--elev);border:1px solid var(--border);border-radius:9px;padding:8px 13px;font-size:12.5px;color:var(--text2);cursor:pointer;font-family:'Space Grotesk'"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
						><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg
					>Replay verification
				</button>
			</div>
		</section>

		<!-- selective disclosure -->
		<section
			style="border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden;align-self:start"
		>
			<div
				style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border)"
			>
				<h2 style="margin:0;font-size:14.5px;font-weight:600">Selective disclosure</h2>
				<span style="font-size:11.5px;color:var(--muted);font-family:'JetBrains Mono'"
					>{view.revealedCount}/{view.totalFields} shown</span
				>
			</div>
			<div style="padding:16px 18px">
				<p style="margin:0 0 14px;font-size:12.5px;color:var(--text2);line-height:1.5">
					The payer chose which invoice fields to reveal. Hidden fields stay committed in the Merkle
					root, so the proof still verifies.
				</p>
				<div style="display:flex;flex-direction:column;gap:7px">
					{#each view.disclosure as d (d.name)}
						<div
							style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 11px;border-radius:9px;background:{d.bg};border:1px solid {d.bd}"
						>
							<span style="font-family:'JetBrains Mono';font-size:12px;color:{d.fg}">{d.name}</span>
							{#if d.revealed}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"
									><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle
										cx="12"
										cy="12"
										r="3"
									/></svg
								>
							{:else}
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"
									><path d="M9.9 4.2A9 9 0 0 1 22 12s-1 2-3 3.7M6 6.3C3.5 7.9 2 12 2 12s3.5 7 10 7a9 9 0 0 0 3.7-.8" /><path
										d="m2 2 20 20"
									/></svg
								>
							{/if}
						</div>
					{/each}
				</div>
				<div style="margin-top:15px;padding-top:14px;border-top:1px solid var(--border)">
					<div
						style="font-size:11px;color:var(--muted);letter-spacing:.06em;font-weight:600;margin-bottom:8px"
						>MERKLE ROOT</div
					>
					<div
						style="display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono';font-size:11.5px;color:var(--text2);word-break:break-all"
						>{view.merkle}</div
					>
				</div>
			</div>
		</section>
	</div>

	<!-- decoded fields -->
	<section
		style="margin-top:18px;border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden"
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
					<div style="display:flex;align-items:center;gap:8px">
						<span
							style="font-family:{f.font};font-size:{f.size};color:{f.color};font-weight:{f.weight};word-break:break-all"
							>{f.shown}</span
						>
						{#if f.copyable}
							<button
								onclick={() => copyField(f.key, f.full)}
								title="Copy"
								style="flex-shrink:0;display:grid;place-items:center;width:24px;height:24px;border-radius:6px;border:1px solid var(--border);background:var(--elev);cursor:pointer;color:{explorer.copied ===
								f.key
									? 'var(--green)'
									: 'var(--text2)'}"
							>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
									><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg
								>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>

	{#if view.paths.length || view.pathsError}
		<BlindedPaths
			paths={view.paths}
			error={view.pathsError}
			title="Revealed payment paths"
			purpose="invoice_paths the payer chose to disclose, with their blinded_payinfo. A path TLV omitted from the proof stays a hidden leaf above."
			accent="amber"
		/>
	{/if}

	{#if view.offerPaths.length || view.offerPathsError}
		<BlindedPaths
			paths={view.offerPaths}
			error={view.offerPathsError}
			title="Revealed offer reply paths"
			purpose="offer_paths the payer disclosed — the onion-message routes back to the offer issuer."
			accent="violet"
		/>
	{/if}

	<!-- raw TLV inspector -->
	<section
		style="margin-top:18px;border:1px solid var(--border);border-radius:10px;background:var(--panel);overflow:hidden"
	>
		<button
			onclick={toggleTlv}
			style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:none;border:none;cursor:pointer;color:var(--text);font-family:'Space Grotesk'"
		>
			<span style="display:flex;align-items:center;gap:10px;font-size:14.5px;font-weight:600"
				><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" stroke-width="2"
					><path d="m18 16 4-4-4-4M6 8l-4 4 4 4M14.5 4l-5 16" /></svg
				>Raw TLV inspector</span
			>
			<span
				style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--muted);font-family:'JetBrains Mono'"
				>{view.tlv.length} records<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					style="transform:rotate({explorer.showTlv ? '180deg' : '0deg'});transition:.2s"
					><path d="m6 9 6 6 6-6" /></svg
				></span
			>
		</button>
		{#if explorer.showTlv}
			<div style="border-top:1px solid var(--border);overflow-x:auto">
				<div
					style="display:grid;grid-template-columns:64px 1fr 64px 2fr;gap:0;min-width:560px;font-family:'JetBrains Mono';font-size:12px"
				>
					<div style="padding:9px 14px;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">type</div>
					<div style="padding:9px 14px;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">name</div>
					<div style="padding:9px 14px;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">len</div>
					<div style="padding:9px 14px;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">value</div>
					{#each view.tlv as t (t.type)}
						<div style="padding:10px 14px;color:var(--violet);font-weight:700;border-bottom:1px solid var(--border)">{t.type}</div>
						<div style="padding:10px 14px;color:var(--text);border-bottom:1px solid var(--border)">{t.name}</div>
						<div style="padding:10px 14px;color:var(--text2);border-bottom:1px solid var(--border)">{t.len}</div>
						<div style="padding:10px 14px;color:var(--text2);border-bottom:1px solid var(--border);word-break:break-all">{t.value}</div>
					{/each}
				</div>
			</div>
		{/if}
	</section>
</main>
