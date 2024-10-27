
/**
 * Delay the execution of the current function by `ms` milliseconds.
 */
export const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

/**
 * Truncate an array of values, keeping only the values that are greater than or equal to `minValue` or the last `minLength` values.
 */
export function truncate(values: any[], minValue: number, minLength: number): any[] {
    const length = values.length;
    return values.filter((v, i) => (length - i) <= minLength || v >= minValue);
}
