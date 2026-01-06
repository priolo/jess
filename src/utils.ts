import net from "net"

/**
 * Delay the execution of the current function by `ms` milliseconds.
 */
export const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

/**
 * Truncate an array of values, keeping only the values that are greater than or equal to `minValue` or the last `minLength` values.
 */
export function truncate<T>(values: T[], minValue: number, minLength: number, selector?: (item: T) => number): T[] {
	const length = values.length;
	return values.filter((v, i) => {
		const val = selector ? selector(v) : (v as any);
		return (length - i) <= minLength || val >= minValue
	});
}

/**
 * Returns a random free port
 */
export async function getFreePort(): Promise<number> {
	return new Promise(res => {
		const srv = net.createServer();
		srv.listen(0, () => {
			const port = (<net.AddressInfo>srv.address()).port
			srv.close((err) => res(port))
		});
	})
}

export function shortUUID() {
	return (Date.now().toString(36) + Math.floor(Math.random() * 0xFFFF).toString(36)).toLowerCase()
}