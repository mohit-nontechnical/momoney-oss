import type { Pattern, Receipts, Snapshot } from "./types";
export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const MONTH_RE = new RegExp(`\\b(${MONTH_NAMES.join("|")})\\b`, "i");
export function monthFromText(text: string | undefined | null): string | null {
    if (!text)
        return null;
    const m = text.match(MONTH_RE);
    if (!m)
        return null;
    const found = m[1].toLowerCase();
    const idx = MONTH_NAMES.findIndex((n) => n.toLowerCase() === found);
    return idx >= 0 ? MONTH_NAMES[idx] : null;
}
export function monthFromNumber(n: string | null | undefined): string | null {
    if (!n)
        return null;
    const idx = parseInt(n, 10);
    return idx >= 1 && idx <= 12 ? MONTH_NAMES[idx - 1] : null;
}
export function monthFromDate(date: string | undefined | null): string | null {
    if (!date)
        return null;
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return null;
    return MONTH_NAMES[d.getUTCMonth()];
}
export type Severity = "normal" | "amber" | "rust";
const SEVERITY_RANK: Record<Severity, number> = { normal: 0, amber: 1, rust: 2 };
export interface RenewalEntry {
    key: string;
    name: string;
    month: string | null;
    amount: number | null;
    severity: Severity;
    detail: string;
    sources: string[];
}
export interface RenewalGroup {
    month: string;
    entries: RenewalEntry[];
}
function upsert(map: Map<string, RenewalEntry>, entry: RenewalEntry) {
    const existing = map.get(entry.key);
    if (!existing) {
        map.set(entry.key, entry);
        return;
    }
    existing.month = existing.month ?? entry.month;
    if (SEVERITY_RANK[entry.severity] > SEVERITY_RANK[existing.severity]) {
        existing.severity = entry.severity;
    }
    if (!existing.sources.includes(entry.detail) && entry.detail) {
        existing.detail = existing.detail ? `${existing.detail} · ${entry.detail}` : entry.detail;
    }
    existing.sources.push(...entry.sources);
}
export function buildRenewalGroups(snapshot: Snapshot, receipts: Receipts | null): RenewalGroup[] {
    const map = new Map<string, RenewalEntry>();
    for (const r of snapshot.recurring) {
        upsert(map, {
            key: r.payee.toLowerCase(),
            name: r.payee,
            month: null,
            amount: r.monthly,
            severity: "normal",
            detail: `${r.category || "recurring"} · seen ${r.count}x`,
            sources: ["bank"],
        });
    }
    const cardNames = (snapshot.cards ?? []).map((c) => c.name);
    for (const p of (snapshot.patterns ?? []) as Pattern[]) {
        if (p.type !== "annual_fee")
            continue;
        const matchedCard = cardNames.find((n) => p.title.toLowerCase().includes(n.toLowerCase()));
        const name = matchedCard ?? p.title;
        upsert(map, {
            key: name.toLowerCase(),
            name,
            month: monthFromText(p.title) ?? monthFromText(p.detail),
            amount: p.dollars_annual,
            severity: "amber",
            detail: p.detail,
            sources: ["pattern"],
        });
    }
    for (const c of snapshot.cards ?? []) {
        if (!c.annual_fee)
            continue;
        const v = (c.verdict || "").toLowerCase();
        const severity: Severity = v.includes("cancel")
            ? "rust"
            : v.includes("decide") || v.includes("downgrade")
                ? "amber"
                : "normal";
        upsert(map, {
            key: c.name.toLowerCase(),
            name: c.name,
            month: monthFromNumber(c.fee_month),
            amount: c.annual_fee,
            severity,
            detail: c.note || `annual fee · ${c.verdict}`,
            sources: ["card"],
        });
    }
    if (receipts) {
        for (const m of receipts.merchants) {
            upsert(map, {
                key: m.merchant.toLowerCase(),
                name: m.merchant,
                month: null,
                amount: m.last_amount,
                severity: "normal",
                detail: m.sample_subject || m.signals.join(", "),
                sources: ["email"],
            });
        }
        for (const a of receipts.alerts) {
            upsert(map, {
                key: a.merchant.toLowerCase(),
                name: a.merchant,
                month: monthFromDate(a.date),
                amount: a.amount,
                severity: "rust",
                detail: a.type,
                sources: ["email-alert"],
            });
        }
    }
    const groups = new Map<string, RenewalEntry[]>();
    for (const entry of map.values()) {
        const key = entry.month ?? "Unknown";
        if (!groups.has(key))
            groups.set(key, []);
        groups.get(key)!.push(entry);
    }
    const currentMonthIdx = new Date(snapshot.generated_at).getUTCMonth();
    const orderedMonths = [
        ...MONTH_NAMES.slice(currentMonthIdx),
        ...MONTH_NAMES.slice(0, currentMonthIdx),
    ];
    const result: RenewalGroup[] = [];
    for (const m of orderedMonths) {
        if (groups.has(m)) {
            result.push({
                month: m,
                entries: groups.get(m)!.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)),
            });
        }
    }
    if (groups.has("Unknown")) {
        result.push({
            month: "Unknown",
            entries: groups.get("Unknown")!.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)),
        });
    }
    return result;
}
