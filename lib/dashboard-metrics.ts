import type { Snapshot, CardInfo, Txn, NeedsReviewItem } from "./types";
export function reporting(s: Snapshot) {
    const month = s.now_month || s.pace?.month || s.generated_at.slice(0, 7);
    const [y, m] = month.split("-").map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const day = s.pace?.month === month
        ? s.pace.day_of_month
        : s.generated_at.startsWith(month)
            ? Number(s.generated_at.slice(8, 10))
            : days;
    return {
        month,
        day,
        days,
        elapsed: day / days,
        label: new Date(month + "-15T12:00:00Z").toLocaleString("en-US", {
            month: "long",
            timeZone: "UTC",
        }),
    };
}
export function budgetRows(s: Snapshot) {
    const r = reporting(s);
    return Object.entries(s.budgets || {})
        .filter(([name]) => name !== "Credit Card Payments" && name !== "Starting Balances")
        .map(([name, b]) => ({
        name,
        ...b,
        percent: b.budgeted > 0 ? (b.actual / b.budgeted) * 100 : 0,
        status: b.budgeted <= 0
            ? "unset"
            : b.actual > b.budgeted
                ? "over"
                : b.actual > b.budgeted * r.elapsed
                    ? "watch"
                    : "good",
    }))
        .sort((a, b) => ({ over: 0, watch: 1, good: 2, unset: 3 })[a.status as "over"] -
        { over: 0, watch: 1, good: 2, unset: 3 }[b.status as "over"] ||
        b.percent - a.percent);
}
export function needsReview(t: Txn, items: NeedsReviewItem[] = []) {
    return (!t.category ||
        t.category === "Uncategorized" ||
        items.some((i) => (t.id && i.id === t.id) ||
            (i.account === t.account &&
                i.date === t.date &&
                i.payee === t.payee &&
                Math.abs(i.amount - t.amount) < 0.005)));
}
export function cardAccount(s: Snapshot, c: CardInfo) {
    if (!c.account_match)
        return null;
    const found = s.balances.filter((b) => b.name.toLowerCase().includes(c.account_match!.toLowerCase()));
    return found.length === 1 ? found[0] : null;
}
export function normalizeAccount(name: string) {
    return name
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}
export function cardMetrics(s: Snapshot) {
    const tx = s.transactions_90d;
    const full = s.transaction_coverage_complete === true && !!tx && tx.length < 500;
    return (s.cards || []).map((c) => {
        const account = cardAccount(s, c);
        const rows = account && !account.offbudget
            ? tx?.filter((t) => normalizeAccount(t.account) === normalizeAccount(account.name) &&
                t.category !== "Credit Card Payments" &&
                t.category !== "Starting Balances")
            : undefined;
        const spend = full && rows
            ? rows.reduce((n, t) => n + Math.max(0, -t.amount), 0)
            : null;
        const balance = account?.balance ?? c.balance;
        const owed = balance == null ? null : Math.max(0, -balance);
        return {
            ...c,
            account: account?.name || null,
            owed,
            spend,
            drag: spend != null && spend > 0
                ? (c.annual_fee / ((spend * 365) / 90)) * 100
                : null,
        };
    });
}
export function accountGroups(s: Snapshot) {
    const cards = new Set((s.cards || []).map((c) => cardAccount(s, c)?.name).filter(Boolean));
    const groups: {
        name: string;
        items: {
            name: string;
            value: number;
        }[];
    }[] = [
        "Cash",
        "Cards",
        "Investments",
        "Other",
    ].map((name) => ({ name, items: [] }));
    for (const b of s.balances) {
        const idx = cards.has(b.name)
            ? 1
            : /checking|savings|spending account/i.test(b.name)
                ? 0
                : /brokerage|401\(k\)|roth|ira|robinhood/i.test(b.name)
                    ? 2
                    : 3;
        groups[idx].items.push({ name: b.name, value: b.balance });
    }
    for (const a of s.manual_assets)
        groups[3].items.push({ name: a.name, value: a.value });
    return groups.map((g) => ({
        ...g,
        total: g.items.reduce((n, x) => n + x.value, 0),
    }));
}
