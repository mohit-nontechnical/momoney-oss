"use client";
import { useMemo, useState } from "react";
import { fmt$, fmt$$ } from "@/lib/format";
import { Amt } from "@/components/Amt";
import type { Snapshot } from "@/lib/types";
export default function ScenariosClient({ snapshot: s }: {
    snapshot: Snapshot;
}) {
    const [burnCutPct, setBurnCutPct] = useState(0);
    const [monthlyContribution, setMonthlyContribution] = useState(0);
    const [payoffPct, setPayoffPct] = useState(0);
    const baseBurn = s.avg_burn;
    const revolvingDebt = s.balances.filter((b) => b.balance < 0).reduce((sum, b) => sum + -b.balance, 0);
    const interestDragAnnual = (s.patterns ?? [])
        .filter((p) => p.type === "interest_drag")
        .reduce((sum, p) => sum + p.dollars_annual, 0);
    const cutBurn = baseBurn * (1 - burnCutPct / 100);
    const cutRunway = cutBurn > 0 ? s.liquid / cutBurn : null;
    const remaining = s.goal.net_worth_target - s.net_worth;
    const monthsToGoal = monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : null;
    const glideMonths = s.goal.months_left;
    const paidAmount = revolvingDebt * (payoffPct / 100);
    const interestSaved = interestDragAnnual * (payoffPct / 100);
    const liquidAfterPayoff = s.liquid - paidAmount;
    const runwayAfterPayoff = baseBurn > 0 && liquidAfterPayoff >= 0 ? liquidAfterPayoff / baseBurn : null;
    const maxContribution = useMemo(() => Math.max(s.goal.required_monthly_gain * 2, 1000), [s.goal.required_monthly_gain]);
    return (<>
      <div className="scenario-row">
        <div className="scenario-top">
          <div>
            <div className="scenario-title">Burn-cut slider</div>
            <div className="scenario-note">
              cut the <Amt>{fmt$(baseBurn)}</Amt> 3-mo average burn by {burnCutPct}%
            </div>
          </div>
          <div className="scenario-result">
            {cutRunway != null ? cutRunway.toFixed(1) : "—"} <span className="unit">mo runway</span>
          </div>
        </div>
        <input className="slider" type="range" min={0} max={50} step={1} value={burnCutPct} onChange={(e) => setBurnCutPct(Number(e.target.value))}/>
        <div className="scenario-track">
          <div className={`scenario-fill${burnCutPct >= 25 ? " green" : burnCutPct >= 10 ? " amber" : ""}`} style={{ width: `${Math.min(100, burnCutPct * 2)}%` }}/>
        </div>
        <div className="fn">
          adjusted burn: <Amt>{fmt$$(cutBurn)}</Amt>/mo · <Amt>{fmt$$(s.liquid)}</Amt> liquid ÷ adjusted burn
        </div>
      </div>

      <div className="scenario-row">
        <div className="scenario-top">
          <div>
            <div className="scenario-title">Income-level slider vs. the glide path</div>
            <div className="scenario-note">
              assume <Amt>{fmt$(monthlyContribution)}</Amt>/mo net toward net worth (glide path needs{" "}
              <Amt>{fmt$(s.goal.required_monthly_gain)}</Amt>/mo)
            </div>
          </div>
          <div className="scenario-result">
            {monthsToGoal != null ? monthsToGoal.toLocaleString() : "—"}{" "}
            <span className="unit">mo to {s.goal.label}</span>
          </div>
        </div>
        <input className="slider" type="range" min={0} max={maxContribution} step={100} value={monthlyContribution} onChange={(e) => setMonthlyContribution(Number(e.target.value))}/>
        <div className="scenario-track">
          <div className={`scenario-fill${monthlyContribution >= s.goal.required_monthly_gain
            ? " green"
            : monthlyContribution > 0
                ? " amber"
                : ""}`} style={{ width: `${Math.min(100, (100 * monthlyContribution) / maxContribution)}%` }}/>
        </div>
        <div className="fn">
          {monthsToGoal != null && monthsToGoal <= glideMonths
            ? `beats the glide path's ${glideMonths}-month timeline`
            : `glide path targets ${glideMonths} months · ${s.goal.target_date}`}
        </div>
      </div>

      <div className="scenario-row">
        <div className="scenario-top">
          <div>
            <div className="scenario-title">Pay off the revolvers</div>
            <div className="scenario-note">
              pay down {payoffPct}% of <Amt>{fmt$(revolvingDebt)}</Amt> in card balances
            </div>
          </div>
          <div className="scenario-result">
            {runwayAfterPayoff != null ? runwayAfterPayoff.toFixed(1) : "—"}{" "}
            <span className="unit">mo runway</span>
          </div>
        </div>
        <input className="slider" type="range" min={0} max={100} step={5} value={payoffPct} onChange={(e) => setPayoffPct(Number(e.target.value))} disabled={revolvingDebt <= 0}/>
        <div className="scenario-track">
          <div className="scenario-fill" style={{ width: `${payoffPct}%` }}/>
        </div>
        <div className="fn">
          {revolvingDebt > 0 ? (<>
              pays down <Amt>{fmt$$(paidAmount)}</Amt>, leaves <Amt>{fmt$$(liquidAfterPayoff)}</Amt> liquid
              {interestDragAnnual > 0 ? <> · saves ~<Amt>{fmt$$(interestSaved)}</Amt>/yr in interest drag</> : ""}
            </>) : ("no card balances in this snapshot")}
        </div>
      </div>
    </>);
}
