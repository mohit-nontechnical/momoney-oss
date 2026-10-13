import { fmt$ } from "@/lib/format";
import { Amt } from "@/components/Amt";
import type { Snapshot } from "@/lib/types";
export default function StatTiles({ snapshot: s }: {
    snapshot: Snapshot;
}) {
    const pace = Math.max(0, Math.min(100, (100 * s.income_this_month) / s.income_goal_monthly));
    const prevBurn = s.months.length > 1 ? s.by_month[s.months[s.months.length - 2]]?.burn : null;
    return (<div className="cards">
      <div className="card">
        <div className="k">Income pace · this month</div>
        <div className="v"><Amt>{fmt$(s.income_this_month)}</Amt></div>
        <div className="meter">
          <div className="mfill" style={{ width: `${pace.toFixed(1)}%` }}/>
        </div>
        <div className="sub">
          of <Amt>{fmt$(s.income_goal_monthly)}</Amt>/mo ({pace.toFixed(1)}%)
        </div>
      </div>
      <div className="card">
        <div className="k">Burn · 3-mo avg</div>
        <div className="v"><Amt>{fmt$(s.avg_burn)}</Amt></div>
        <div className="sub">
          this month so far <Amt>{fmt$(s.burn_this_month)}</Amt>
          {prevBurn ? <> · prev month <Amt>{fmt$(prevBurn)}</Amt></> : ""}
        </div>
      </div>
      <div className="card">
        <div className="k">Runway</div>
        <div className="v">
          {s.runway_months ?? "—"}
          <span className="unit"> mo</span>
        </div>
        <div className="sub"><Amt>{fmt$(s.liquid)}</Amt> liquid ÷ avg burn</div>
      </div>
      <div className="card">
        <div className="k">Required NW gain</div>
        <div className="v">
          <Amt>{fmt$(s.goal.required_monthly_gain)}</Amt>
          <span className="unit">/mo</span>
        </div>
        <div className="sub">
          {s.goal.months_left} months to {s.goal.target_date}
        </div>
      </div>
    </div>);
}
