import type { Snapshot, Txn } from "./types";
export const CATEGORIES = [
    "Groceries",
    "Dining & Drinks",
    "Transport",
    "Travel",
    "Health & Wellness",
    "Golf",
    "Entertainment",
    "Subscriptions",
    "Utilities & Home",
    "Business Tools & Infra",
    "Credit Card Payments",
    "Bank & Card Fees",
    "Rewards & Interest",
    "Income",
    "Business Income",
];
export interface Split {
    category: string;
    amount: number;
}
export interface Annotation {
    key: string;
    transaction: Txn;
    category: string;
    tags: string[];
    splits: Split[];
    updated_at: string;
    ledger_status?: "pending" | "applied" | "review";
    ledger_note?: string;
}
export interface MerchantRule {
    merchant: string;
    category: string;
    sign?: "positive" | "negative";
    effective_date?: string;
    known_keys?: string[];
}
export interface MoneyGoal {
    id: string;
    name: string;
    source: "manual" | "liquid" | "net_worth" | "debt";
    target: number;
    current: number;
    baseline: number;
    deadline: string;
    tag: string;
    updated_at: string;
}
export interface Customization {
    card_details?: Record<string, import("./card-details").CardDetails>;
    annotations: Record<string, Annotation>;
    rules: MerchantRule[];
    goals: MoneyGoal[];
    goals_configured?: boolean;
}
export const EMPTY_CUSTOMIZATION: Customization = {
    annotations: {},
    rules: [],
    goals: [],
};
export function txnFingerprint(t: Txn): string {
    return [t.account, t.date, t.payee, Math.round(t.amount * 100)].join("|");
}
export function txnKey(t: Txn): string {
    return t.id || txnFingerprint(t);
}
export function merchantKey(s: string) {
    return s.trim().toLowerCase().replace(/\s+/g, " ");
}
export function moneyDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);
    const value = (name: string) => parts.find((p) => p.type === name)?.value;
    return `${value("year")}-${value("month")}-${value("day")}`;
}
export function annotated(t: Txn, c: Customization): Txn {
    const a = c.annotations[txnKey(t)] || c.annotations[txnFingerprint(t)], rule = c.rules.find((r) => merchantKey(r.merchant) === merchantKey(t.payee) &&
        (!r.sign || r.sign === (t.amount >= 0 ? "positive" : "negative")) &&
        (!r.effective_date || t.date >= r.effective_date) &&
        !r.known_keys?.includes(txnKey(t)) &&
        !r.known_keys?.includes(txnFingerprint(t)));
    return {
        ...t,
        category: a?.category || rule?.category || t.category,
        tags: a?.tags || [],
        splits: a?.splits || [],
    };
}
export function validateAnnotation(raw: unknown, transaction: Txn): Omit<Annotation, "updated_at"> {
    const b = raw as Partial<Annotation>;
    if (transaction.category === "Starting Balances")
        throw new Error("Opening balances are account setup values and cannot be recategorized.");
    if (transaction.category === "Credit Card Payments" &&
        (b.category !== transaction.category || b.splits?.length))
        throw new Error("Card repayments stay categorized as payments. You can add tags.");
    if (!b || !CATEGORIES.includes(String(b.category)))
        throw new Error("Choose a valid category.");
    if (!Array.isArray(b.tags) ||
        b.tags.length > 12 ||
        b.tags.some((t) => typeof t !== "string" || t.length > 40 || !t.trim()))
        throw new Error("Use up to 12 short tags.");
    if (!Array.isArray(b.splits) || b.splits.length > 12)
        throw new Error("Invalid split.");
    if (b.splits.length && (transaction.amount >= 0 || b.splits.length < 2))
        throw new Error("Split a purchase into at least two parts.");
    if (b.splits.some((s) => !s ||
        typeof s !== "object" ||
        !CATEGORIES.includes(s.category) ||
        !Number.isFinite(s.amount) ||
        s.amount <= 0 ||
        Math.abs(s.amount * 100 - Math.round(s.amount * 100)) > 0.000001))
        throw new Error("Each split needs a valid category and a positive amount in cents.");
    if (b.splits.length &&
        b.splits.reduce((sum, s) => sum + Math.round(s.amount * 100), 0) !==
            Math.round(Math.abs(transaction.amount) * 100))
        throw new Error("Split amounts must equal the original purchase.");
    if (transaction.amount < 0 &&
        ["Income", "Rewards & Interest", "Business Income", "Credit Card Payments"].includes(String(b.category)) &&
        b.category !== transaction.category)
        throw new Error("A purchase must use a spending category.");
    if (b.splits.some((s) => [
        "Rewards & Interest",
        "Income",
    "Business Income",
        "Credit Card Payments",
    ].includes(s.category)))
        throw new Error("Split purchases into spending categories.");
    return {
        key: txnKey(transaction),
        transaction,
        category: String(b.category),
        tags: [...new Set(b.tags.map((t) => t.trim()))],
        splits: b.splits,
        ledger_status: b.splits.length ? "review" : "pending",
    };
}
export function applyCustomization(original: Snapshot, c: Customization): Snapshot {
    const s = structuredClone(original);
    const txns = original.transactions_90d || [];
    s.transactions_90d = txns.map((t) => annotated(t, c));
    const excluded = new Set(s.category_policy?.burn_excluded_categories || [
        "Credit Card Payments",
        "Business Tools & Infra",
    ]);
    const household = new Set(s.category_policy?.house_categories || ["Utilities & Home"]);
    const share = s.category_policy?.house_share ?? s.house_share ?? 1;
    const weighted = (category: string, amount: number) => amount * (household.has(category) ? share : 1);
    let burnChanged = false;
    for (let i = 0; i < txns.length; i++) {
        const before = txns[i], after = s.transactions_90d[i];
        if (before.amount >= 0 ||
            ["Credit Card Payments", "Starting Balances"].includes(before.category || ""))
            continue;
        const month = before.date.slice(0, 7), amounts = s.by_month[month]?.spendByCat;
        if (!amounts)
            continue;
        const parts = after.splits?.length
            ? after.splits
            : [
                {
                    category: after.category || "Uncategorized",
                    amount: Math.abs(after.amount),
                },
            ];
        const previous = before.category || "Uncategorized";
        const oldSpend = weighted(previous, Math.abs(before.amount));
        amounts[previous] =
            Math.round(((amounts[previous] || 0) - oldSpend) * 100) / 100;
        for (const part of parts)
            amounts[part.category] =
                Math.round(((amounts[part.category] || 0) +
                    weighted(part.category, part.amount)) *
                    100) / 100;
        const oldBurn = excluded.has(previous) ? 0 : oldSpend;
        const newBurn = parts.reduce((sum, p) => sum + (excluded.has(p.category) ? 0 : weighted(p.category, p.amount)), 0);
        if (Math.abs(newBurn - oldBurn) > 0.005)
            burnChanged = true;
        s.by_month[month].burn =
            Math.round((s.by_month[month].burn + newBurn - oldBurn) * 100) / 100;
    }
    const currentMonth = s.now_month || s.generated_at?.slice(0, 7) || s.months.at(-1) || "";
    if (s.by_month[currentMonth])
        s.burn_this_month = s.by_month[currentMonth].burn;
    const fullMonths = s.months.filter((m) => m < currentMonth).slice(-3);
    if (fullMonths.length)
        s.avg_burn =
            Math.round((fullMonths.reduce((sum, m) => sum + s.by_month[m].burn, 0) /
                fullMonths.length) *
                100) / 100;
    s.runway_months =
        s.avg_burn > 0 ? Math.round((s.liquid / s.avg_burn) * 100) / 100 : null;
    if (burnChanged && s.forecast)
        s.forecast.assumptions = [
            ...(s.forecast.assumptions || []),
            "This projection uses the original ledger categories and does not include saved category adjustments.",
        ];
    if (s.budgets) {
        const month = s.months.at(-1);
        for (const [cat, b] of Object.entries(s.budgets))
            b.actual = month
                ? (s.by_month[month]?.spendByCat[cat] ?? b.actual)
                : b.actual;
    }
    return s;
}
export function cardDebt(s: Snapshot) {
    return (s.cards || []).reduce((sum, c) => sum + Math.max(0, -(c.balance || 0)), 0);
}
export function goalProgress(g: MoneyGoal, s: Snapshot, now = new Date()) {
    if (g.source === "debt" &&
        !(s.cards || []).some((c) => typeof c.balance === "number" && Number.isFinite(c.balance)))
        return {
            available: false as const,
            current: null,
            target: g.baseline,
            remaining: null,
            percent: null,
            monthly: null,
            overdue: false,
            observed: null,
        };
    const debt = cardDebt(s);
    const observed = g.source === "liquid"
        ? s.liquid
        : g.source === "net_worth"
            ? s.net_worth
            : g.source === "debt"
                ? debt
                : g.current;
    const current = g.source === "debt" ? Math.max(0, g.baseline - observed) : observed;
    const target = g.source === "debt" ? g.baseline : g.target;
    const remaining = g.source === "debt" ? observed : Math.max(0, target - current);
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);
    const part = (name: string) => Number(parts.find((p) => p.type === name)?.value);
    const today = Date.UTC(part("year"), part("month") - 1, part("day"));
    const days = Math.max(0, (new Date(g.deadline + "T00:00:00Z").getTime() - today) / 864e5);
    const months = days / 30.4375;
    return {
        available: true as const,
        current,
        target,
        remaining,
        percent: target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0,
        monthly: months > 0 ? remaining / months : null,
        overdue: g.deadline < moneyDate(now) && remaining > 0,
        observed,
    };
}
export function defaultGoals(s: Snapshot): MoneyGoal[] {
    return [
        {
            id: "net-worth",
            name: s.goal.label,
            source: "net_worth",
            target: s.goal.net_worth_target,
            current: 0,
            baseline: 0,
            deadline: s.goal.target_date,
            tag: "",
            updated_at: s.generated_at,
        },
    ];
}
export function listedGoals(c: Customization, s: Snapshot): MoneyGoal[] {
    return [...defaultGoals(s), ...c.goals.filter((g) => g.id !== "net-worth")];
}
