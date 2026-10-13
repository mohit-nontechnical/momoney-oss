import { NextRequest, NextResponse } from "next/server";
import { getAnalysis, getHistory, getReceipts, getSnapshot, getTasks, getCustomization, } from "@/lib/data";
import { buildRecommendations } from "@/lib/recommendations";
import { defaultGoals, listedGoals, goalProgress } from '@/lib/customization';
import type { History, ReceiptMerchant, Snapshot, SummaryAlertsStatus, SummaryCategorize, SummaryCoverage, SummaryForecastDigest, SummaryHouseholdLatest, SummaryMoneyMove, SummaryPace, SummaryPattern, SummaryRecommendations, SummaryResponse, SummaryTrip, SummaryUpcomingRenewal, SummaryVentures, } from "@/lib/types";
export const dynamic = "force-dynamic";
const MAX_LIST = 5;
const PATTERN_CAP = 3;
const MOVE_CAP = 3;
const TRIP_CAP = 3;
const RENEWAL_WINDOW_DAYS = 21;
function round(n: number): number {
    return Math.round(n);
}
function glideDelta(snapshot: Snapshot, history: History): number {
    const t0 = +new Date(history[0]?.date || snapshot.generated_at);
    const t1 = +new Date(snapshot.goal.target_date);
    const startNW = history[0]?.net_worth ?? snapshot.net_worth;
    const now = +new Date(snapshot.generated_at);
    const frac = t1 === t0 ? 1 : (now - t0) / (t1 - t0);
    const glideNow = startNW + (snapshot.goal.net_worth_target - startNW) * frac;
    return round(snapshot.net_worth - glideNow);
}
function nwChange30d(snapshot: Snapshot, history: History): number | null {
    if (!history.length)
        return null;
    const now = +new Date(snapshot.generated_at);
    const target = now - 30 * 24 * 60 * 60 * 1000;
    let best = history[0];
    let bestDist = Math.abs(+new Date(best.date) - target);
    for (const h of history) {
        const dist = Math.abs(+new Date(h.date) - target);
        if (dist < bestDist) {
            best = h;
            bestDist = dist;
        }
    }
    return round(snapshot.net_worth - best.net_worth);
}
export async function GET(req: NextRequest) {
    const secret = process.env.SUMMARY_SECRET;
    if (!secret) {
        return NextResponse.json({ error: "Summary automation is not configured." }, { status: 503 });
    }
    const provided = req.headers.get("x-summary-secret");
    if (provided !== secret) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const [snapshot, analysis, receipts, history, tasks] = await Promise.all([
        getSnapshot(),
        getAnalysis(),
        getReceipts(),
        getHistory(),
        getTasks(),
    ]);
    if (!snapshot) {
        return NextResponse.json({ error: "No financial data yet. Import a snapshot or run setup:demo." }, { status: 503 });
    }
    const s = snapshot;
    const topPatterns: SummaryPattern[] = [...(s.patterns ?? [])]
        .sort((a, b) => b.dollars_annual - a.dollars_annual)
        .slice(0, PATTERN_CAP)
        .map((p) => ({
        title: p.title,
        dollars_annual: round(p.dollars_annual),
        action: p.action,
    }));
    const moneyMoves: SummaryMoneyMove[] = (analysis?.money_moves ?? [])
        .slice(0, MOVE_CAP)
        .map((m) => ({ title: m.title, est_annual_dollars: round(m.est_annual_dollars) }));
    const openTasks = tasks.filter((t) => t.status === "todo").length;
    const receiptsAlerts = receipts?.alerts?.length
        ? receipts.alerts.slice(0, MAX_LIST).map((a) => ({
            ...a,
            amount: round(a.amount),
        }))
        : undefined;
    const now = new Date(s.generated_at);
    const windowEnd = new Date(now.getTime() + RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const merchantsWithDate = (receipts?.merchants ?? []) as (ReceiptMerchant & {
        est_next_date?: string;
    })[];
    const upcomingRenewals: SummaryUpcomingRenewal[] | undefined = merchantsWithDate
        .filter((m) => m.est_next_date)
        .map((m) => ({ merchant: m.merchant, est_next_date: m.est_next_date as string, amount: round(m.last_amount) }))
        .filter((r) => {
        const d = new Date(r.est_next_date);
        return !isNaN(d.getTime()) && d >= now && d <= windowEnd;
    })
        .slice(0, MAX_LIST);
    const householdLatest: SummaryHouseholdLatest | undefined = s.household?.months?.length
        ? (() => {
            const last = s.household!.months[s.household!.months.length - 1];
            return { month: last.month, total: round(last.total), per_person: round(last.per_person) };
        })()
        : undefined;
    const totalCost = Object.values(s.venture_costs).reduce((sum, v) => sum + v.total, 0);
    const revenueEntries = Object.values(s.venture_revenue ?? {});
    let ventures: SummaryVentures | undefined;
    if (totalCost > 0 || revenueEntries.length) {
        ventures = { total_cost: round(totalCost) };
        if (revenueEntries.length) {
            const totalRevenue = revenueEntries.reduce((sum, v) => sum + v.total, 0);
            ventures.total_revenue = round(totalRevenue);
            ventures.total_net = round(totalRevenue - totalCost);
        }
    }
    const coverage: SummaryCoverage | undefined = s.coverage
        ? { categorized_pct: round(100 - s.coverage.overall_pct), worst_month: s.coverage.worst_month }
        : undefined;
    const needsReviewCount = s.needs_review?.length ? s.needs_review.length : undefined;
    const categorize: SummaryCategorize | undefined = s.categorize
        ? { needs_review: s.categorize.counts.needs_review, written: s.categorize.counts.written }
        : undefined;
    const trips: SummaryTrip[] | undefined = s.trips?.length
        ? s.trips.slice(0, TRIP_CAP).map((t) => ({ start: t.start, end: t.end, total: round(t.total) }))
        : undefined;
    const pace: SummaryPace | undefined = s.pace
        ? { delta_pct: s.pace.delta_pct, on_pace: s.pace.on_pace }
        : undefined;
    const forecastDigest: SummaryForecastDigest | undefined = s.forecast
        ? {
            min_balance: round(s.forecast.min_balance),
            min_date: s.forecast.min_date,
            below_threshold_date: s.forecast.below_threshold_date,
        }
        : undefined;
    const allRecs = buildRecommendations({ snapshot: s, analysis, tasks, receipts });
    const pricedRecs = allRecs.filter((r) => r.dollars_annual != null);
    const recommendations: SummaryRecommendations | undefined = allRecs.length
        ? {
            total_annual: round(pricedRecs.reduce((sum, r) => sum + (r.dollars_annual ?? 0), 0)),
            priced_count: pricedRecs.length,
            unpriced_count: allRecs.length - pricedRecs.length,
            ...(allRecs[0] ? { top_title: allRecs[0].title } : {}),
        }
        : undefined;
    const alertsStatus: SummaryAlertsStatus | undefined = s.alerts_status
        ? {
            pending_total: s.alerts_status.pending_total,
            pending_urgent: s.alerts_status.pending_urgent,
            oldest_pending_date: s.alerts_status.oldest_pending_date,
        }
        : undefined;
    const customization = await getCustomization();
    const body: SummaryResponse = {
        goals: listedGoals(customization, s).map(g => ({ name: g.name, deadline: g.deadline, ...goalProgress(g, s) })),
        generated_at: s.generated_at,
        ...(s.freshness?.newest_txn_date
            ? {
                freshness: {
                    data_through: s.freshness.newest_txn_date,
                    days_old: s.freshness.days_since_newest_txn ?? 0,
                    stale: (s.freshness.days_since_newest_txn ?? 0) > 4,
                },
            }
            : {}),
        hero: {
            net_worth: round(s.net_worth),
            goal: {
                label: s.goal.label,
                target: round(s.goal.net_worth_target),
                target_date: s.goal.target_date,
                months_left: s.goal.months_left,
                delta_vs_glide: glideDelta(s, history),
            },
            income_this_month: round(s.income_this_month),
            income_goal_monthly: round(s.income_goal_monthly),
            avg_burn: round(s.avg_burn),
            burn_this_month: round(s.burn_this_month),
            liquid: round(s.liquid),
            runway_months: s.runway_months,
        },
        nw_change_30d: nwChange30d(s, history),
        top_patterns: topPatterns,
        money_moves: moneyMoves,
        ...(tasks.length ? { open_tasks: openTasks } : {}),
        ...(receiptsAlerts ? { receipts_alerts: receiptsAlerts } : {}),
        ...(upcomingRenewals?.length ? { upcoming_renewals: upcomingRenewals } : {}),
        ...(householdLatest ? { household_latest: householdLatest } : {}),
        ...(ventures ? { ventures } : {}),
        ...(coverage ? { coverage } : {}),
        ...(needsReviewCount != null ? { needs_review_count: needsReviewCount } : {}),
        ...(categorize ? { categorize } : {}),
        ...(trips ? { trips } : {}),
        ...(pace ? { pace } : {}),
        ...(forecastDigest ? { forecast: forecastDigest } : {}),
        ...(recommendations ? { recommendations } : {}),
        ...(alertsStatus ? { alerts_status: alertsStatus } : {}),
    };
    return NextResponse.json(body);
}
