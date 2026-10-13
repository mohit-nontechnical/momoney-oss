import { fmt$, fmt$$ } from "./format";
import type { Analysis, Receipts, Snapshot, TaskCategory, TaskState, } from "./types";
export interface Recommendation {
    id: string;
    title: string;
    dollars_annual: number | null;
    category: TaskCategory;
    severity: "rust" | "amber" | "normal";
    reason: string;
    source: string;
    href?: string;
    taskId?: string;
}
interface EntityRef {
    key: string;
    name: string;
}
interface Candidate {
    id: string;
    title: string;
    dollars_annual: number | null;
    category: TaskCategory;
    reason: string;
    source: string;
    href?: string;
    taskId?: string;
    forceRust?: boolean;
    entityKey: string;
    priority: number;
}
function buildEntityRefs(snapshot: Snapshot | null, receipts: Receipts | null): EntityRef[] {
    const refs: EntityRef[] = [];
    for (const c of snapshot?.cards ?? []) {
        if (c.name)
            refs.push({ key: `card:${c.name}`, name: c.name });
    }
    for (const r of snapshot?.recurring ?? []) {
        if (r.payee)
            refs.push({ key: `payee:${r.payee.toLowerCase()}`, name: r.payee });
    }
    for (const v of snapshot?.ventures ?? []) {
        if (v.name)
            refs.push({ key: `venture:${v.id}`, name: v.name });
    }
    for (const m of receipts?.merchants ?? []) {
        if (m.merchant)
            refs.push({ key: `payee:${m.merchant.toLowerCase()}`, name: m.merchant });
    }
    for (const a of receipts?.alerts ?? []) {
        if (a.merchant)
            refs.push({ key: `payee:${a.merchant.toLowerCase()}`, name: a.merchant });
    }
    return refs;
}
const ENTITY_ALIASES: [
    short: string,
    long: string
][] = [
    ["wf", "wells fargo"],
    ["amex", "american express"],
    ["boa", "bank of america"],
];
function withAliasVariants(lower: string): string[] {
    const variants = [lower];
    for (const [short, long] of ENTITY_ALIASES) {
        const shortRe = new RegExp(`\\b${short}\\b`, "i");
        if (shortRe.test(lower))
            variants.push(lower.replace(shortRe, long));
        if (lower.includes(long))
            variants.push(lower.replace(long, short));
    }
    return variants;
}
function deriveKey(text: string, refs: EntityRef[], fallback: string): string {
    const textVariants = withAliasVariants(text.toLowerCase());
    let best: {
        key: string;
        len: number;
    } | null = null;
    for (const ref of refs) {
        if (ref.name.length < 3)
            continue;
        for (const refVariant of withAliasVariants(ref.name.toLowerCase())) {
            if (textVariants.some((t) => t.includes(refVariant))) {
                if (!best || refVariant.length > best.len)
                    best = { key: ref.key, len: refVariant.length };
                break;
            }
        }
    }
    return best?.key ?? fallback;
}
function classifyCategory(text: string): TaskCategory {
    const t = text.toLowerCase();
    if (/\bcancel|drop it|end the\b/.test(t))
        return "cancel";
    if (/\bdowngrade|call |negotiat|waive|consolidat/.test(t))
        return "negotiate";
    if (/\bautopay|automat/.test(t))
        return "automate";
    return "review";
}
function severityFor(dollars: number | null, forceRust?: boolean): Recommendation["severity"] {
    if (forceRust)
        return "rust";
    if (dollars == null)
        return "normal";
    if (dollars >= 300)
        return "rust";
    if (dollars >= 100)
        return "amber";
    return "normal";
}
const SOURCE_PRIORITY: Record<string, number> = {
    backlog: 0,
    "money move": 1,
    pattern: 2,
    "card verdict": 3,
    recurring: 4,
    "email scan": 5,
    ventures: 6,
    "coverage guard": 7,
    "needs review": 8,
    forecast: 9,
};
export interface RecommendationInput {
    snapshot: Snapshot | null;
    analysis: Analysis | null;
    tasks: TaskState[];
    receipts: Receipts | null;
}
export function buildRecommendations({ snapshot, analysis, tasks, receipts, }: RecommendationInput): Recommendation[] {
    const refs = buildEntityRefs(snapshot, receipts);
    const candidates: Candidate[] = [];
    for (const t of tasks) {
        if (t.status !== "todo")
            continue;
        const text = `${t.title} ${t.how ?? ""}`;
        candidates.push({
            id: `task:${t.id}`,
            title: t.title,
            dollars_annual: t.impact_annual,
            category: t.category,
            reason: t.how || "Tracked in the backlog.",
            source: "backlog",
            href: "/backlog",
            taskId: t.id,
            entityKey: deriveKey(text, refs, `task:${t.id}`),
            priority: SOURCE_PRIORITY.backlog,
        });
    }
    for (let i = 0; i < (analysis?.money_moves ?? []).length; i++) {
        const m = analysis!.money_moves![i];
        const text = `${m.title} ${m.rationale}`;
        candidates.push({
            id: `move:${i}`,
            title: m.title,
            dollars_annual: m.est_annual_dollars,
            category: classifyCategory(text),
            reason: `${m.rationale} First step: ${m.first_step}`,
            source: "money move",
            entityKey: deriveKey(text, refs, `move:${i}`),
            priority: SOURCE_PRIORITY["money move"],
        });
    }
    const PATTERN_CATEGORY: Record<string, TaskCategory> = {
        category_creep: "review",
        interest_drag: "automate",
        idle_cash: "review",
        duplicate_sub: "cancel",
        annual_fee: "negotiate",
        hobby_venture: "review",
    };
    const PATTERN_HREF: Record<string, string> = {
        annual_fee: "/cards",
        duplicate_sub: "/renewals",
        hobby_venture: "/ventures",
    };
    for (const p of snapshot?.patterns ?? []) {
        const text = `${p.title} ${p.detail}`;
        candidates.push({
            id: `pattern:${p.id}`,
            title: p.title,
            dollars_annual: p.dollars_annual ?? null,
            category: PATTERN_CATEGORY[p.type] ?? "review",
            reason: `${p.detail} ${p.action}`,
            source: "pattern",
            href: PATTERN_HREF[p.type],
            entityKey: deriveKey(text, refs, `pattern:${p.id}`),
            priority: SOURCE_PRIORITY.pattern,
        });
    }
    const CARD_TITLE: Record<string, (name: string) => string> = {
        cancel: (n) => `Cancel ${n}`,
        downgrade: (n) => `Downgrade ${n}`,
        decide: (n) => `Decide: keep or downgrade ${n}`,
        payoff: (n) => `Pay down the ${n} balance`,
    };
    const CARD_CATEGORY: Record<string, TaskCategory> = {
        cancel: "cancel",
        downgrade: "negotiate",
        decide: "review",
        payoff: "review",
    };
    for (const c of snapshot?.cards ?? []) {
        const verdict = (c.verdict || "").toLowerCase();
        if (!verdict || verdict === "keep")
            continue;
        const titleFn = CARD_TITLE[verdict];
        const title = titleFn ? titleFn(c.name) : `Review ${c.name}`;
        const text = `${title} ${c.note ?? ""} ${verdict}`;
        const dollars = verdict === "payoff" ? null : c.annual_fee > 0 ? c.annual_fee : null;
        const payoffCaveat = verdict === "payoff"
            ? " Unpriced: the cost of carrying this balance is interest, not the annual fee — tracked separately."
            : "";
        candidates.push({
            id: `card:${c.name}`,
            title,
            dollars_annual: dollars,
            category: CARD_CATEGORY[verdict] ?? "review",
            reason: c.note
                ? `${c.note} — card verdict: ${verdict}.${payoffCaveat}`
                : `Card verdict: ${verdict}.${payoffCaveat}`,
            source: "card verdict",
            href: "/cards",
            entityKey: deriveKey(text, refs, `card:${c.name}`),
            priority: SOURCE_PRIORITY["card verdict"],
        });
    }
    for (const r of snapshot?.recurring ?? []) {
        const text = `${r.payee} ${r.category ?? ""}`;
        candidates.push({
            id: `recurring:${r.payee}`,
            title: `Verify you still use ${r.payee}`,
            dollars_annual: r.annual,
            category: "review",
            reason: `${r.category || "Recurring charge"} · about ${fmt$$(r.monthly)}/mo, seen ${r.count}x in the last 90 days — confirm it's still worth the annualized ${fmt$(r.annual)}.`,
            source: "recurring",
            href: "/renewals",
            entityKey: deriveKey(text, refs, `recurring:${r.payee}`),
            priority: SOURCE_PRIORITY.recurring,
        });
    }
    if (receipts) {
        const ALERT_CATEGORY: Record<string, TaskCategory> = {
            zombie_subscription: "cancel",
            duplicate_service: "cancel",
        };
        for (const a of receipts.alerts) {
            const text = `${a.merchant} ${a.type}`;
            candidates.push({
                id: `alert:${a.merchant}:${a.date}`,
                title: `${a.type.replace(/_/g, " ")}: ${a.merchant}`,
                dollars_annual: null,
                category: ALERT_CATEGORY[a.type] ?? "review",
                reason: `Flagged by the email scan on ${a.date}, last amount ${fmt$$(a.amount)}. One observation, not an annualized figure.`,
                source: "email scan",
                href: "/renewals",
                entityKey: deriveKey(text, refs, `alert:${a.merchant}`),
                priority: SOURCE_PRIORITY["email scan"],
            });
        }
        for (const m of receipts.merchants) {
            if (!m.signals.includes("renewal_upcoming"))
                continue;
            const text = `${m.merchant} renewal`;
            candidates.push({
                id: `renewal:${m.merchant}`,
                title: `Upcoming renewal: ${m.merchant}`,
                dollars_annual: null,
                category: "review",
                reason: `Last billed ${fmt$$(m.last_amount)} on ${m.last_date}${m.sample_subject ? ` ("${m.sample_subject}")` : ""} — cadence not confirmed, so no annual figure.`,
                source: "email scan",
                href: "/renewals",
                entityKey: deriveKey(text, refs, `renewal:${m.merchant}`),
                priority: SOURCE_PRIORITY["email scan"],
            });
        }
    }
    const vName = Object.fromEntries((snapshot?.ventures ?? []).map((v) => [v.id, v.name]));
    const vRevenue = snapshot?.venture_revenue ?? {};
    for (const [id, costEntry] of Object.entries(snapshot?.venture_costs ?? {})) {
        const name = vName[id] || id;
        const revEntry = vRevenue[id];
        const text = `${name} venture`;
        if (!revEntry) {
            candidates.push({
                id: `venture:${id}`,
                title: `Attach revenue tracking to ${name}, or call it a hobby`,
                dollars_annual: null,
                category: "review",
                reason: `${fmt$$(costEntry.total)} tracked cost with no revenue tracked over the same window — net position unknown.`,
                source: "ventures",
                href: "/ventures",
                entityKey: deriveKey(text, refs, `venture:${id}`),
                priority: SOURCE_PRIORITY.ventures,
            });
            continue;
        }
        const net = revEntry.total - costEntry.total;
        if (net < 0) {
            candidates.push({
                id: `venture:${id}`,
                title: `${name} is costing more than it earns`,
                dollars_annual: null,
                category: "review",
                reason: `${fmt$$(costEntry.total)} cost vs ${fmt$$(revEntry.total)} revenue tracked over the window (net ${fmt$$(net)}).`,
                source: "ventures",
                href: "/ventures",
                entityKey: deriveKey(text, refs, `venture:${id}`),
                priority: SOURCE_PRIORITY.ventures,
            });
        }
    }
    if (snapshot?.coverage) {
        const categorizedPct = 100 - snapshot.coverage.overall_pct;
        if (categorizedPct < 85) {
            const worst = snapshot.coverage.worst_month;
            const wm = worst ? snapshot.coverage.by_month[worst] : null;
            candidates.push({
                id: "coverage-gap",
                title: worst ? `Fix the categorization gap in ${worst}` : "Fix the categorization gap",
                dollars_annual: null,
                category: "review",
                reason: wm
                    ? `${wm.uncategorized_pct.toFixed(0)}% of ${worst} spend (${fmt$$(wm.uncategorized)}) is uncategorized — not a savings figure, just spend you can't currently see clearly. Review the imported categories in Activity.`
                    : `${snapshot.coverage.overall_pct.toFixed(0)}% of tracked spend is uncategorized. Review the imported categories in Activity.`,
                source: "coverage guard",
                href: "/transactions",
                forceRust: categorizedPct < 60,
                entityKey: "coverage-gap",
                priority: SOURCE_PRIORITY["coverage guard"],
            });
        }
    }
    if (snapshot?.needs_review && snapshot.needs_review.length > 0) {
        const n = snapshot.needs_review.length;
        candidates.push({
            id: "needs-review-queue",
            title: `Confirm ${n} AI-suggested categor${n === 1 ? "y" : "ies"}`,
            dollars_annual: null,
            category: "review",
            reason: `Below the auto-write confidence threshold. Review the imported categories in Activity.`,
            source: "needs review",
            href: "/transactions",
            entityKey: "needs-review-queue",
            priority: SOURCE_PRIORITY["needs review"],
        });
    }
    if (snapshot?.forecast?.below_threshold_date) {
        const f = snapshot.forecast;
        candidates.push({
            id: "forecast-below-threshold",
            title: `Cash dips below ${fmt$(f.threshold)} on ${f.below_threshold_date}`,
            dollars_annual: null,
            category: "review",
            reason: `${f.horizon_days}-day forecast projects liquid balance falling to ${fmt$(f.min_balance)} around ${f.min_date}. Assumptions: ${f.assumptions.join("; ")}.`,
            source: "forecast",
            href: "/networth",
            forceRust: true,
            entityKey: "forecast-below-threshold",
            priority: SOURCE_PRIORITY.forecast,
        });
    }
    return mergeCandidates(candidates);
}
function mergeDollars(primary: number | null, secondary: number | null): number | null {
    return primary ?? secondary;
}
function mergeCandidates(candidates: Candidate[]): Recommendation[] {
    const byKey = new Map<string, {
        canonical: Candidate;
        reasons: string[];
        sources: Set<string>;
    }>();
    for (const c of candidates) {
        const existing = byKey.get(c.entityKey);
        if (!existing) {
            byKey.set(c.entityKey, { canonical: c, reasons: [c.reason], sources: new Set([c.source]) });
            continue;
        }
        if (!existing.reasons.includes(c.reason))
            existing.reasons.push(c.reason);
        existing.sources.add(c.source);
        if (c.priority < existing.canonical.priority) {
            existing.canonical = {
                ...c,
                dollars_annual: mergeDollars(c.dollars_annual, existing.canonical.dollars_annual),
                href: c.href ?? existing.canonical.href,
                taskId: c.taskId ?? existing.canonical.taskId,
            };
        }
        else {
            existing.canonical = {
                ...existing.canonical,
                dollars_annual: mergeDollars(existing.canonical.dollars_annual, c.dollars_annual),
                href: existing.canonical.href ?? c.href,
                taskId: existing.canonical.taskId ?? c.taskId,
            };
        }
    }
    const merged: Recommendation[] = [...byKey.values()].map(({ canonical, reasons, sources }) => ({
        id: canonical.id,
        title: canonical.title,
        dollars_annual: canonical.dollars_annual,
        category: canonical.category,
        severity: severityFor(canonical.dollars_annual, canonical.forceRust),
        reason: reasons.slice(0, 2).join(" "),
        source: [...sources].join(" + "),
        href: canonical.href,
        taskId: canonical.taskId,
    }));
    merged.sort((a, b) => {
        const aHas = a.dollars_annual != null;
        const bHas = b.dollars_annual != null;
        if (aHas && bHas)
            return (b.dollars_annual as number) - (a.dollars_annual as number);
        if (aHas !== bHas)
            return aHas ? -1 : 1;
        return a.title.localeCompare(b.title);
    });
    return merged;
}
