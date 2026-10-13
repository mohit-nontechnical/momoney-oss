import { fmt$$ } from "@/lib/format";
import { Amt } from "@/components/Amt";
import type { Budgets } from "@/lib/types";
export default function BudgetBars({ budgets }: {
    budgets?: Budgets;
}) {
    const entries = Object.entries(budgets ?? {});
    if (!entries.length) {
        return (<section className="empty">
        <h2>Budget vs actual</h2>
        <p className="fn">
          No budget data in this snapshot yet — this fills in once budgets
          ship in the pipeline.
        </p>
      </section>);
    }
    const sorted = entries.sort((a, b) => b[1].actual - a[1].actual);
    const max = Math.max(...sorted.map(([, v]) => Math.max(v.budgeted, v.actual)), 1);
    return (<section>
      <h2>Budget vs actual · this month</h2>
      <p className="fn">
        bar = actual spend · <span className="tickkey"/> = budgeted
      </p>
      {sorted.map(([cat, v]) => {
            const over = v.budgeted > 0 && v.actual > v.budgeted;
            const w = Math.max(0.5, (100 * v.actual) / max);
            const budgetMark = v.budgeted ? Math.min(99.5, (100 * v.budgeted) / max) : null;
            return (<div key={cat} className="bar" data-tip={`${cat}: ${fmt$$(v.actual)} actual of ${fmt$$(v.budgeted)} budgeted`}>
            <span className="bl">{cat}</span>
            <div className="bt">
              {budgetMark != null && (<div className="avgtick" style={{ left: `${budgetMark.toFixed(1)}%` }}/>)}
              <div className={`bf${over ? " bf-over" : ""}`} style={{ width: `${w.toFixed(1)}%` }}/>
            </div>
            <span className={`bv${over ? " feewarn" : ""}`}>
              {over && "⚠ "}
              <Amt>{fmt$$(v.actual)}</Amt>
            </span>
          </div>);
        })}
    </section>);
}
