import { NextRequest, NextResponse } from "next/server";
import { getCustomization, getRawSnapshot, saveCustomRecord } from "@/lib/data";
import { defaultGoals, listedGoals, merchantKey, moneyDate, txnKey, txnFingerprint, validateAnnotation, type MoneyGoal, } from "@/lib/customization";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
let writes = Promise.resolve();
export async function GET() {
    const c = await getCustomization(), s = await getRawSnapshot();
    return NextResponse.json({ ...c, goals: s ? listedGoals(c, s) : [] }, { headers });
}
export async function POST(req: NextRequest) {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host"))
        return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403, headers });
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    }
    catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400, headers });
    }
    let respond: NextResponse = NextResponse.json({ error: "Save failed." }, { status: 500, headers });
    const operation = writes.then(async () => {
        try {
            const c = await getCustomization(), s = await getRawSnapshot();
            if (!s)
                throw new Error("No financial data available yet.");
            if (body.action === "transaction") {
                const matches = (s.transactions_90d || []).filter((t) => txnKey(t) === body.key);
                if (matches.length !== 1)
                    throw new Error("This transaction cannot be uniquely identified. Refresh and try again.");
                const valid = validateAnnotation(body, matches[0]);
                const existing = c.annotations[valid.key] || c.annotations[txnFingerprint(matches[0])];
                if (body.expected_updated_at !== (existing?.updated_at ?? null)) {
                    respond = NextResponse.json({
                        error: "This transaction changed in another window. Refresh before saving.",
                    }, { status: 409, headers });
                    return;
                }
                if (body.remember === true && valid.splits.length)
                    throw new Error("Merchant rules use a single category, not splits.");
                c.annotations[valid.key] = {
                    ...valid,
                    updated_at: new Date().toISOString(),
                };
                await saveCustomRecord("annotation", valid.key, c.annotations[valid.key]);
                if (body.remember === true) {
                    const rule = {
                        merchant: matches[0].payee,
                        category: valid.category,
                        effective_date: moneyDate(),
                        known_keys: (s.transactions_90d || [])
                            .filter((t) => merchantKey(t.payee) === merchantKey(matches[0].payee))
                            .flatMap((t) => [txnKey(t), txnFingerprint(t)]),
                        sign: matches[0].amount >= 0
                            ? ("positive" as const)
                            : ("negative" as const),
                    };
                    await saveCustomRecord("rule", merchantKey(rule.merchant), rule);
                    c.rules = c.rules.filter((r) => merchantKey(r.merchant) !== merchantKey(rule.merchant));
                    c.rules.push(rule);
                }
            }
            else if (body.action === "goal") {
                const g = body.goal as MoneyGoal;
                if (g?.id === "net-worth")
                    throw new Error("The primary milestone comes from the finance feed. Add a separate goal alongside it.");
                if (!g ||
                    typeof g.id !== "string" ||
                    g.id.length > 100 ||
                    typeof g.name !== "string" ||
                    !g.name.trim() ||
                    g.name.length > 80 ||
                    !["manual", "liquid", "net_worth", "debt"].includes(g.source) ||
                    !/^\d{4}-\d{2}-\d{2}$/.test(g.deadline) ||
                    !Number.isFinite(Date.parse(g.deadline)) ||
                    ![g.target, g.current, g.baseline].every((n) => Number.isFinite(n) && n >= 0) ||
                    g.target <= 0 ||
                    typeof g.tag !== "string" ||
                    g.tag.length > 40)
                    throw new Error("Enter a name, positive target, valid amounts and a deadline.");
                if (new Date(g.deadline).toISOString().slice(0, 10) !== g.deadline)
                    throw new Error("Choose a real calendar date.");
                if (!c.goals_configured) {
                    for (const goal of defaultGoals(s))
                        await saveCustomRecord("goal", goal.id, goal);
                    c.goals = defaultGoals(s);
                    await saveCustomRecord("meta", "goals", true);
                }
                c.goals_configured = true;
                const goal = {
                    ...g,
                    name: g.name.trim(),
                    updated_at: new Date().toISOString(),
                };
                await saveCustomRecord("goal", g.id, goal);
                c.goals = c.goals.filter((x) => x.id !== g.id);
                c.goals.push(goal);
            }
            else if (body.action === "remove_goal") {
                if (body.id === "net-worth")
                    throw new Error("The primary milestone stays alongside your other goals.");
                const existing = c.goals_configured ? c.goals : defaultGoals(s);
                if (typeof body.id !== "string" ||
                    !existing.some((g) => g.id === body.id))
                    throw new Error("Goal not found.");
                if (!c.goals_configured) {
                    for (const goal of defaultGoals(s))
                        await saveCustomRecord("goal", goal.id, goal);
                    await saveCustomRecord("meta", "goals", true);
                }
                await saveCustomRecord("goal", String(body.id), null);
                c.goals_configured = true;
                c.goals = c.goals.filter((g) => g.id !== body.id);
            }
            else
                throw new Error("Unknown action.");
            respond = NextResponse.json({ ok: true, customization: c }, { headers });
        }
        catch (e) {
            respond = NextResponse.json({ error: e instanceof Error ? e.message : "Save failed." }, { status: 400, headers });
        }
    });
    writes = operation.catch(() => { });
    await operation;
    return respond;
}
