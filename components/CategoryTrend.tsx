import { fmt$$ } from "@/lib/format";
import { Amt } from "@/components/Amt";
import type { Snapshot } from "@/lib/types";
const EXCLUDE = new Set(["Credit Card Payments", "Starting Balances"]);
export default function CategoryTrend({ snapshot: s }: {
    snapshot: Snapshot;
}) {
    const months = s.months;
    const rankMonths = months.slice(-3);
    const totals: Record<string, number> = {};
    for (const m of rankMonths) {
        for (const [c, v] of Object.entries(s.by_month[m]?.spendByCat ?? {})) {
            if (EXCLUDE.has(c))
                continue;
            totals[c] = (totals[c] || 0) + v;
        }
    }
    const topCats = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([c]) => c);
    if (!topCats.length) {
        return (<section className="empty">
        <h2>Category trend</h2>
        <p className="fn">No categorized spend yet.</p>
      </section>);
    }
    return (<section>
      <h2>
        Category trend · top {topCats.length}, last {rankMonths.length}-mo spend
      </h2>
      <p className="fn">each bar = one month, left → right, oldest → newest</p>
      {topCats.map((c) => {
            const vals = months.map((m) => s.by_month[m]?.spendByCat[c] ?? 0);
            const max = Math.max(...vals, 1);
            return (<div key={c} className="cattrend-row">
            <span className="bl">{c}</span>
            <div className="cattrend-bars">
              {vals.map((v, i) => (<div key={months[i]} className="cattrend-bar" style={{ height: `${Math.max(4, (100 * v) / max).toFixed(1)}%` }} data-tip={`${months[i]} · ${c}: ${fmt$$(v)}`}/>))}
            </div>
            <span className="bv"><Amt>{fmt$$(totals[c])}</Amt></span>
          </div>);
        })}
    </section>);
}
