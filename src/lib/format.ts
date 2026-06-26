/**
 * Small, pure presentation helpers shared across the explorer views.
 * No BOLT12 logic lives here — that's in decode.ts.
 */

const MONO = "'JetBrains Mono', monospace";
const SANS = "'Space Grotesk', sans-serif";

export function short(hash: string, a = 10, b = 8): string {
	return hash.length > a + b + 2 ? hash.slice(0, a) + '…' + hash.slice(-b) : hash;
}

export function fmt(n: number): string {
	return n.toLocaleString('en-US');
}

export function toHex(bytes: Uint8Array | undefined): string {
	if (!bytes) return '';
	let s = '';
	for (const b of bytes) s += b.toString(16).padStart(2, '0');
	return s;
}

export async function copyText(text: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		/* clipboard may be unavailable — no-op */
	}
}

export interface Field {
	/** Stable key used to track per-field "copied ✓" feedback. */
	key: string;
	label: string;
	/** The (possibly shortened) value rendered to the user. */
	shown: string;
	/** The full, un-shortened value placed on the clipboard when copied. */
	full: string;
	font: string;
	size: string;
	weight?: string;
	color?: string;
	copyable?: boolean;
}

interface MkOpts {
	sans?: boolean;
	raw?: boolean;
	size?: string;
	weight?: string;
	color?: string;
	copyable?: boolean;
	a?: number;
	b?: number;
}

export function mk(key: string, label: string, full: string, opt: MkOpts = {}): Field {
	return {
		key,
		label,
		shown: opt.raw ? full : short(full, opt.a ?? 12, opt.b ?? 8),
		full,
		font: opt.sans ? SANS : MONO,
		size: opt.size ?? '13px',
		weight: opt.weight ?? '400',
		color: opt.color ?? 'var(--text)',
		copyable: !!opt.copyable
	};
}

export interface CheckRow {
	label: string;
	detail: string;
	pass: boolean;
	done: boolean;
	failed: boolean;
	active: boolean;
	waiting: boolean;
	bg: string;
	bd: string;
	titleColor: string;
}

/** A single verification check, as decoded from the proof. */
export interface CheckResult {
	label: string;
	detail: string;
	pass: boolean;
}

/**
 * Project the real check results onto the staged reveal animation: each check
 * stays "waiting" until `verifyStep` reaches it, then shows its true pass/fail.
 */
export function buildChecks(verifyStep: number, results: CheckResult[]): CheckRow[] {
	return results.map((c, i) => {
		const reached = i < verifyStep;
		const done = reached && c.pass;
		const failed = reached && !c.pass;
		const active = i === verifyStep && verifyStep < results.length;
		const waiting = i > verifyStep;
		return {
			...c,
			done,
			failed,
			active,
			waiting,
			bg: done ? 'var(--green-soft)' : failed ? 'var(--red-soft)' : 'var(--elev)',
			bd: done ? 'var(--green-line)' : failed ? 'var(--red)' : 'var(--border)',
			titleColor: waiting ? 'var(--text2)' : 'var(--text)'
		};
	});
}

export interface DisclosureRow {
	name: string;
	revealed: boolean;
	hidden: boolean;
	bg: string;
	bd: string;
	fg: string;
}

export interface TlvRow {
	type: string;
	name: string;
	len: string;
	value: string;
}
