export function fmt$(n: number | null | undefined): string {
    if (n == null)
        return "—";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
export function fmt$$(n: number | null | undefined): string {
    if (n == null)
        return "—";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
export function compact(n: number | null | undefined): string {
    if (n == null)
        return "—";
    const s = ("$" + Math.abs(n).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: Math.abs(n) < 1000 ? 0 : 1 }));
    return n < 0 ? "-" + s : s;
}
export function pct(n: number | null | undefined, digits = 0): string {
    if (n == null || !isFinite(n))
        return "—";
    return `${n.toFixed(digits)}%`;
}
