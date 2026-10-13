export function supportedDollarFigures(answer: string, facts: unknown, question = ""): boolean {
    const values = new Set<number>();
    function visit(v: unknown) {
        if (typeof v === "number" && Number.isFinite(v)) {
            values.add(Math.round(v * 100));
            values.add(Math.round(v) * 100);
            values.add(Math.round(Math.abs(v) * 100));
            values.add(Math.round(Math.abs(v)) * 100);
        }
        else if (Array.isArray(v))
            v.forEach(visit);
        else if (v && typeof v === "object")
            Object.values(v).forEach(visit);
    }
    visit(facts);
    const amounts = (s: string) => [...s.matchAll(/\$\s*(-?\d[\d,]*(?:\.\d+)?)([kKmM])?/g)].map((m) => Number(m[1].replaceAll(",", "")) *
        (m[2]?.toLowerCase() === "k"
            ? 1000
            : m[2]?.toLowerCase() === "m"
                ? 1000000
                : 1));
    amounts(question).forEach((n) => values.add(Math.round(n * 100)));
    return amounts(answer).every((n) => values.has(Math.round(n * 100)));
}
