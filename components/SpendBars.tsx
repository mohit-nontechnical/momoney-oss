import { fmt$$ } from "@/lib/format";
import { Amt } from "@/components/Amt";
import type { Snapshot } from "@/lib/types";
export default function SpendBars({ snapshot: s }: {
    snapshot: Snapshot;
}) {
    const m = s.months[s.months.length - 1];
    const cur = s.by_month[m]?.spendByCat || {};
    const prior = s.months.slice(-4, -1);
    const avg: Record<string, number> = {};
    for (const pm of prior) {
        for (const [c, v] of Object.entries(s.by_month[pm]?.spendByCat ?? {})) {
            avg[c] = (avg[c] || 0) + v / prior.length;
        }
    }
    const cats = Object.entries(cur)
        .filter(([c]) => c !== "Credit Card Payments")
        .sort((a, b) => b[1] - a[1]);
    if (!cats.length)
        return null;
    const max = Math.max(cats[0][1], ...cats.map(([c]) => avg[c] || 0)) || 1;
    return (<section>
      <h2>Spending · {m}</h2>
      <p className="fn">
        bar = this month · <span className="tickkey"/> = 3-month average
      </p>
      {cats.map(([c, v]) => {
            const w = Math.max(0.5, (100 * v) / max);
            const a = avg[c] ? Math.min(99.5, (100 * avg[c]) / max) : null;
            return (<div key={c} className="bar" data-tip={`${c}: ${fmt$$(v)} this month${avg[c] ? ` · 3-mo avg ${fmt$$(Math.round(avg[c]))}` : ""}`}>
            <span className="bl">{c}</span>
            <div className="bt">
              {a != null && <div className="avgtick" style={{ left: `${a.toFixed(1)}%` }}/>}
              <div className="bf" style={{ width: `${w.toFixed(1)}%` }}/>
            </div>
            <span className="bv"><Amt>{fmt$$(v)}</Amt></span>
          </div>);
        })}
    </section>);
}
