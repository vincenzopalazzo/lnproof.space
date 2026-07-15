<script lang="ts">
	import { explorer, loadSample, onQuery, onSubmit, goZaps } from '$lib/store.svelte';
	import { SAMPLES } from '$lib/data';
	import { short } from '$lib/format';

	const preview = (s: string) => short(s, 8, 4);
</script>

<main style="max-width:980px;margin:0 auto;padding:72px 24px 90px">
	<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:20px">
		<div
			style="display:inline-flex;align-items:center;gap:8px;padding:5px 10px;border:1px solid var(--border2);border-radius:6px;background:var(--panel);font-family:'JetBrains Mono';font-size:12px;color:var(--text2);font-weight:500"
		>
			<span style="color:var(--violet);font-weight:700">BOLT12</span> payer proof · proposal #1295
		</div>
		<h1
			style="margin:0;font-size:clamp(29px,4.4vw,44px);line-height:1.06;letter-spacing:-.03em;font-weight:600;max-width:16ch"
		>
			A block explorer for payments that never touch the chain.
		</h1>
		<p style="margin:0;max-width:54ch;font-size:17px;line-height:1.55;color:var(--text2)">
			Lightning has no public ledger to crawl. A
			<strong style="color:var(--text);font-weight:600">payer proof</strong>
			is a single string that decodes the payment <em style="font-style:normal;color:var(--violet)">and</em>
			cryptographically proves who paid whom — paste one to inspect it.
		</p>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				onSubmit();
			}}
			style="width:100%;max-width:680px;margin-top:14px;display:flex;align-items:center;gap:9px;background:var(--panel);border:1px solid var(--border2);border-radius:9px;padding:9px 9px 9px 16px"
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"
				><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg
			>
			<input
				value={explorer.query}
				oninput={(e) => onQuery(e.currentTarget.value)}
				placeholder="lnp1… / lno1… / lni1…"
				style="flex:1;background:none;border:none;outline:none;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:14px;min-width:0"
			/>
			<button
				type="submit"
				style="background:var(--violet);color:#fff;border:none;border-radius:11px;padding:12px 22px;font-weight:600;font-size:14.5px;cursor:pointer;font-family:'Space Grotesk';white-space:nowrap"
				>Decode</button
			>
		</form>
		<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center">
			<button
				onclick={() => loadSample('proof')}
				style="background:none;border:none;color:var(--text2);font-size:13px;cursor:pointer;font-family:'Space Grotesk'"
			>
				or try a
				<span style="color:var(--violet);font-weight:600;text-decoration:underline;text-underline-offset:3px"
					>sample payer proof →</span
				>
			</button>
			<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
					><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg
				>
				Decoding runs locally — nothing leaves your browser
			</span>
		</div>
	</div>

	<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:54px">
		<button
			onclick={() => loadSample('proof')}
			class="card"
			style="text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:11px;padding:20px;border-radius:9px;border:1px solid var(--border);background:var(--panel);color:var(--text);transition:.16s"
		>
			<span
				style="display:inline-flex;align-self:flex-start;align-items:center;gap:6px;padding:4px 9px;border-radius:7px;background:var(--green-soft);color:var(--green);font-size:11px;font-weight:700;letter-spacing:.04em"
				>PAYER PROOF</span
			>
			<span style="font-weight:600;font-size:15px">A verified donation receipt</span>
			<span style="font-size:13px;color:var(--text2);line-height:1.5"
				>50,000 sats to
				<span style="font-family:'JetBrains Mono';font-size:12px">vincenzopalazzo</span>
				— proof of payment + identity.</span
			>
			<span style="font-family:'JetBrains Mono';font-size:11px;color:var(--muted);margin-top:2px"
				>{preview(SAMPLES.proof)}</span
			>
		</button>
		<button
			onclick={() => loadSample('offer')}
			class="card"
			style="text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:11px;padding:20px;border-radius:9px;border:1px solid var(--border);background:var(--panel);color:var(--text);transition:.16s"
		>
			<span
				style="display:inline-flex;align-self:flex-start;align-items:center;gap:6px;padding:4px 9px;border-radius:7px;background:var(--violet-soft);color:var(--violet);font-size:11px;font-weight:700;letter-spacing:.04em"
				>OFFER</span
			>
			<span style="font-weight:600;font-size:15px">A reusable BOLT12 offer</span>
			<span style="font-size:13px;color:var(--text2);line-height:1.5"
				>Decode an <span style="font-family:'JetBrains Mono';font-size:12px">lno1</span> string into its fields
				and node.</span
			>
			<span style="font-family:'JetBrains Mono';font-size:11px;color:var(--muted);margin-top:2px"
				>{preview(SAMPLES.offer)}</span
			>
		</button>
		<button
			onclick={() => loadSample('invoice')}
			class="card"
			style="text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:11px;padding:20px;border-radius:9px;border:1px solid var(--border);background:var(--panel);color:var(--text);transition:.16s"
		>
			<span
				style="display:inline-flex;align-self:flex-start;align-items:center;gap:6px;padding:4px 9px;border-radius:7px;background:var(--amber-soft);color:var(--amber);font-size:11px;font-weight:700;letter-spacing:.04em"
				>INVOICE</span
			>
			<span style="font-weight:600;font-size:15px">A signed BOLT12 invoice</span>
			<span style="font-size:13px;color:var(--text2);line-height:1.5"
				>Decode an <span style="font-family:'JetBrains Mono';font-size:12px">lni1</span> invoice with amount and
				payment hash.</span
			>
			<span style="font-family:'JetBrains Mono';font-size:11px;color:var(--muted);margin-top:2px"
				>{preview(SAMPLES.invoice)}</span
			>
		</button>
		<button
			onclick={goZaps}
			class="card"
			style="text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:11px;padding:20px;border-radius:9px;border:1px solid var(--border);background:var(--panel);color:var(--text);transition:.16s"
		>
			<span
				style="display:inline-flex;align-self:flex-start;align-items:center;gap:6px;padding:4px 9px;border-radius:7px;background:var(--violet-soft);color:var(--violet);font-size:11px;font-weight:700;letter-spacing:.04em"
				>⚡ BOLT12 ZAPS</span
			>
			<span style="font-weight:600;font-size:15px">Concept NIP-102 zap feed</span>
			<span style="font-size:13px;color:var(--text2);line-height:1.5"
				>Offline fixtures for <span style="font-family:'JetBrains Mono';font-size:12px">kind 9736</span>
				— no relay WebSockets; shape + binding explained.</span
			>
			<span style="font-family:'JetBrains Mono';font-size:11px;color:var(--muted);margin-top:2px"
				>NIP-102 · offline</span
			>
		</button>
	</div>

	<div
		style="margin-top:46px;display:flex;flex-wrap:wrap;justify-content:center;gap:28px;padding-top:32px;border-top:1px solid var(--border)"
	>
		<div style="display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--text2)"
			><span style="font-family:'JetBrains Mono';color:var(--violet);font-weight:700">1</span> Paste the proof
			string</div
		>
		<div style="display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--text2)"
			><span style="font-family:'JetBrains Mono';color:var(--violet);font-weight:700">2</span> Decode every TLV
			field</div
		>
		<div style="display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--text2)"
			><span style="font-family:'JetBrains Mono';color:var(--violet);font-weight:700">3</span> Watch the crypto
			checks pass</div
		>
	</div>
</main>

<style>
	.card:hover {
		border-color: var(--violet-line);
		transform: translateY(-3px);
	}
</style>
