import type { Txn } from "@/lib/types";
import { Amt } from "./Amt";
import { fmt$$ } from "@/lib/format";
export default function TagTrends({ transactions }: {
    transactions: Txn[];
}) {
    const tags = new Map<string, {
        total: number;
        count: number;
        months: Map<string, number>;
    }>();
    for (const t of transactions) {
        if (t.amount >= 0 ||
            ["Credit Card Payments", "Starting Balances"].includes(t.category || ""))
            continue;
        for (const tag of t.tags || []) {
            const r = tags.get(tag) || { total: 0, count: 0, months: new Map() };
            r.total -= t.amount;
            r.count++;
            const m = t.date.slice(0, 7);
            r.months.set(m, (r.months.get(m) || 0) - t.amount);
            tags.set(tag, r);
        }
    }
    return (<section>
      <h2>Trends you name</h2>
      {tags.size ? (<div className="tag-trends">
          {[...tags.entries()]
                .sort((a, b) => b[1].total - a[1].total)
                .map(([tag, r]) => (<div key={tag}>
                <h3>{tag}</h3>
                <strong className="amt-block">
                  <Amt>{fmt$$(r.total)}</Amt>
                </strong>
                <p className="fn">
                  {r.count} purchase{r.count === 1 ? "" : "s"} in the visible
                  transaction window
                </p>
                {[...r.months.entries()].sort().map(([m, n]) => (<p key={m} className="amt-block">
                    {m}: <Amt>{fmt$$(n)}</Amt>
                  </p>))}
              </div>))}
        </div>) : (<p>
          Add tags such as “NYC trip” or “work” to transactions. Their spending
          will appear here across categories.
        </p>)}
      <p className="fn">
        A purchase can have several tags, so tag totals can overlap.
      </p>
    </section>);
}
