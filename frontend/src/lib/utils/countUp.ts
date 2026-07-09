/**
 * Svelte action: animates a number counting up from 0 (or its previous value)
 * to the target value whenever it changes. Pure requestAnimationFrame, no
 * dependencies, ~400ms so it stays snappy and never blocks interaction.
 *
 * Usage: <span use:countUp={{ value: 1245000, format: formatRupiah }}></span>
 */
export function countUp(
	node: HTMLElement,
	params: { value: number; format?: (n: number) => string; duration?: number }
) {
	let current = 0;
	let raf: number;

	function run(target: number, duration: number, format: (n: number) => string) {
		cancelAnimationFrame(raf);
		const start = current;
		const delta = target - start;
		const startTime = performance.now();

		if (delta === 0) {
			node.textContent = format(target);
			return;
		}

		function tick(now: number) {
			const progress = Math.min((now - startTime) / duration, 1);
			// ease-out cubic: fast start, gentle settle -- feels quick, not jumpy
			const eased = 1 - Math.pow(1 - progress, 3);
			current = start + delta * eased;
			node.textContent = format(Math.round(current));
			if (progress < 1) {
				raf = requestAnimationFrame(tick);
			} else {
				current = target;
				node.textContent = format(target);
			}
		}
		raf = requestAnimationFrame(tick);
	}

	const fmt = params.format ?? ((n: number) => String(n));
	run(params.value, params.duration ?? 500, fmt);

	return {
		update(newParams: typeof params) {
			const fmt = newParams.format ?? ((n: number) => String(n));
			run(newParams.value, newParams.duration ?? 500, fmt);
		},
		destroy() {
			cancelAnimationFrame(raf);
		}
	};
}
