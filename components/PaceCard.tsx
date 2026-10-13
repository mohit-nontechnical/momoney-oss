import { fmt$ } from "@/lib/format";
import { Amt } from "@/components/Amt";
import type { Pace } from "@/lib/types";
export default function PaceCard({ pace }: {
    pace?: Pace;
}) {
    if (!pace) {
        return (<section className="empty">
        <h2>Spending pace</h2>
        <p className="fn">
          No spending pace calculation was included in the imported snapshot.
        </p>
      </section>);
    }
    const noHistory = pace.avg_same_day == null || pace.prior_months.length === 0;
    if (noHistory) {
        return (<section>
        <h2>Spending pace · {pace.month}</h2>
        <div className="v" style={{ fontFamily: "var(--font-serif)", fontSize: 25 }}>
          <Amt>{fmt$(pace.mtd_spend)}</Amt>
        </div>
        <p className="fn">
          {pace.day_of_month} days in. Not enough history yet to compare against prior months.
        </p>
      </section>);
    }
    const over = pace.delta_pct != null && pace.delta_pct > 5;
    const under = pace.delta_pct != null && pace.delta_pct < -5;
    const tone = over ? "rust" : under ? "" : "";
    return (<section>
      <h2>Spending pace · {pace.month}, day {pace.day_of_month}</h2>
      <div className="page-stats" style={{ marginTop: 4 }}>
        <div className="page-stat">
          <span className="n"><Amt>{fmt$(pace.mtd_spend)}</Amt></span>
          <span className="l">spent month-to-date</span>
        </div>
        <div className="page-stat">
          <span className={`n${tone ? " " + tone : ""}`}>
            {pace.delta_pct != null ? (<>
                {pace.delta_pct >= 0 ? "+" : ""}
                {pace.delta_pct.toFixed(0)}%
              </>) : ("—")}
          </span>
          <span className="l">vs avg same-day-of-month, prior {pace.prior_months.length} mo</span>
        </div>
        <div className="page-stat">
          <span className="n">
            {pace.projected_month_end != null ? <Amt>{fmt$(pace.projected_month_end)}</Amt> : "—"}
          </span>
          <span className="l">projected month end</span>
        </div>
      </div>
      <p className="fn" style={{ marginTop: 10 }}>
        Avg same-day spend across prior months:{" "}
        {pace.avg_same_day != null ? <Amt>{fmt$(pace.avg_same_day)}</Amt> : "—"}.{" "}
        {over && "Running hot this month."}
        {under && "Running under pace this month."}
        {!over && !under && "Roughly on pace."}
      </p>
    </section>);
}
