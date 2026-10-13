import { AmtText } from "./Amt";
import Link from "next/link";
import type { Snapshot, Analysis } from "@/lib/types";
import { Money, Panel, PageHeading, Track } from "./Design";
import AccountSummary from "./AccountSummary";
import { BudgetList } from "./BudgetsClient";
import { reporting, cardMetrics } from "@/lib/dashboard-metrics";
import AlertsStatusPanel from "./AlertsStatusPanel";
export default function Overview({ snapshot: s, analysis, }: {
    snapshot: Snapshot;
    analysis: Analysis | null;
}) {
    const r = reporting(s), p = s.pace, cards = cardMetrics(s), owed = cards.filter((c) => c.owed != null).reduce((n, c) => n + c.owed!, 0);
    const months = s.months.slice(-4), max = Math.max(1, ...months.flatMap((m) => [s.by_month[m].income, s.by_month[m].burn]));
    const goal = s.goal;
    const pct = goal.net_worth_target > 0 ? (s.net_worth / goal.net_worth_target) * 100 : 0;
    const fees = s.fees_90d.reduce((n, f) => n + Math.abs(f.amount), 0);
    const moves = analysis?.money_moves || [];
    return (<div className="rd">
      <PageHeading eyebrow={`${r.label} overview · updated ${s.generated_at.slice(0, 10)}`} description={s.freshness?.newest_txn_date
            ? `Latest posted transaction ${s.freshness.newest_txn_date}. Account freshness varies.`
            : undefined}>
        {p?.delta_pct != null
            ? `${r.label} spending is ${Math.abs(p.delta_pct).toFixed(0)}% ${p.delta_pct > 0 ? "above" : "below"} its usual pace.`
            : "Your money, in one place."}
      </PageHeading>
      <div className="rd-overview">
        <AccountSummary snapshot={s}/>
        <div className="rd-overview-main">
          <div className="rd-alerts">
            <Panel className="rd-alert">
              <div className="rd-label">Cash outlook</div>
              <h3>
                {s.forecast?.below_threshold_date ? (<>
                    Below <Money value={s.forecast.threshold}/> on{" "}
                    {s.forecast.below_threshold_date}
                  </>) : s.runway_months != null ? (`${s.runway_months.toFixed(1)} months of runway`) : ("Forecast unavailable")}
              </h3>
              <p>
                {s.forecast ? (<>
                    Projected low <Money value={s.forecast.min_balance}/> on{" "}
                    {s.forecast.min_date}.
                  </>) : ("Connect account data to see a forecast.")}{" "}
                <Link href="/networth">View forecast assumptions</Link>
              </p>
              {s.forecast?.assumptions.some((a) => /No income modeled/i.test(a)) && (<p className="rd-small">
                  Projection assumes no future income. Fees without known dates
                  are excluded.
                </p>)}
            </Panel>
            <Panel className="rd-alert">
              <div className="rd-label">Cards</div>
              <h3>
                <Money value={owed}/> owed on linked cards
              </h3>
              <p>
                Payment dates and autopay need your confirmation.{" "}
                <Link href="/bills">Review card details</Link>
              </p>
            </Panel>
            <Panel>
              <div className="rd-label">Fees & interest</div>
              <h3>
                <Money value={fees}/> in the last 90 days
              </h3>
              <p>
                Review posted charges and upcoming annual fees.{" "}
                <Link href="/cards">See cards</Link>
              </p>
            </Panel>
          </div>
          {s.alerts_status && s.alerts_status.pending_total > 0 ? (<AlertsStatusPanel alerts={s.alerts_status}/>) : (<p className="rd-small rd-alert-status">
              {s.alerts_status
                ? `No pending alerts. ${s.alerts_status.delivery_configured ? "Alert delivery is enabled." : "Check here for new alerts."}`
                : "Alert status is unavailable."}
            </p>)}
          <div className="rd-overview-pair">
            <Panel title={`${r.label} pace · day ${r.day}`} className="rd-pace">
              {p ? (<>
                  <div className="rd-number">
                    <Money value={p.mtd_spend}/>
                    <span className={p.delta_pct != null && p.delta_pct > 0 ? "over" : "good"}>
                      {p.delta_pct != null
                ? `${p.delta_pct > 0 ? "+" : ""}${p.delta_pct.toFixed(0)}% vs usual`
                : "Not enough history"}
                    </span>
                  </div>
                  <Track percent={p.projected_month_end
                ? (100 * p.mtd_spend) / p.projected_month_end
                : 0} marker={p.avg_same_day != null && p.projected_month_end
                ? (100 * p.avg_same_day) / p.projected_month_end
                : undefined} tone={p.on_pace === false ? "over" : "good"} label="Current spend and usual spend by this point in the month"/>
                  <div className="rd-line rd-small">
                    <span>
                      Usual by today <Money value={p.avg_same_day}/>
                    </span>
                    <span>
                      Month end <Money value={p.projected_month_end}/>
                    </span>
                  </div>
                  <p className="rd-small">
                    Projection follows spending so far; it is not a spending
                    limit.
                  </p>
                </>) : (<p>Spending pace is not available yet.</p>)}
            </Panel>
            <Panel title="Top budgets" action={<Link href="/budgets">View all</Link>} className="rd-top-budgets">
              <BudgetList snapshot={s} limit={3}/>
            </Panel>
            <Panel title="Income vs. burn" className="rd-income">
              <div className="rd-legend">
                <span className="good">Income</span>
                <span className="over">Burn</span>
              </div>
              {months.map((m) => {
            const b = s.by_month[m];
            return (<div className="rd-income-row" key={m}>
                    <span>
                      {new Date(m + "-15").toLocaleString("en-US", {
                    month: "short",
                    timeZone: "UTC",
                })}
                      {m === r.month && <small> MTD</small>}
                    </span>
                    <div>
                      <div className="rd-income-bar good" style={{
                    width: `${(Math.max(0, b.income) / max) * 100}%`,
                }}/>
                      <div className="rd-income-bar over" style={{
                    width: `${(Math.max(0, b.burn) / max) * 100}%`,
                }}/>
                    </div>
                    <span className={b.income - b.burn < 0 ? "over" : "good"}>
                      <Money value={b.income - b.burn}/>
                    </span>
                  </div>);
        })}
              <p className="rd-small">
                Average burn <Money value={s.avg_burn}/> / month. Income
                includes one-time receipts; it is not an earnings forecast. Burn
                excludes business and card payments and includes fixed costs.
              </p>
            </Panel>
          </div>
          <div className="rd-two">
            <Panel title="Coming up" action={<Link href="/bills">Bills</Link>}>
              {s.fixed_costs_monthly.map((f) => (<div className="rd-line" key={f.name}>
                  <span>
                    {f.name}
                    <small>Monthly fixed cost</small>
                  </span>
                  <Money value={f.amount}/>
                </div>))}
              <div className="rd-line">
                <span>
                  Detected recurring charges
                  <small>Monthly estimate · not confirmed due dates</small>
                </span>
                <Money value={s.recurring.reduce((n, x) => n + x.monthly, 0)}/>
              </div>
              <div className="rd-line">
                <span>
                  Card balances<small>Payment dates need confirmation</small>
                </span>
                <Money value={owed}/>
              </div>
            </Panel>
            <Panel title={`Goal · ${goal.label}`} action={<Link href="/goals">All goals</Link>}>
              <div className="rd-number">
                <Money value={s.net_worth}/>
              </div>
              <Track percent={pct} label={`${pct.toFixed(1)}% of net worth goal`}/>
              <p>
                {pct.toFixed(1)}% of <Money value={goal.net_worth_target}/>
              </p>
              <p className="rd-small">
                Requires <Money value={goal.required_monthly_gain}/> / month of
                net-worth growth for {goal.months_left} months, to{" "}
                {goal.target_date}.
              </p>
            </Panel>
          </div>
          <Panel title="Money moves" action={<Link href="/recommendations">Review all</Link>}>
            {moves.length ? (moves.slice(0, 4).map((m, i) => (<div className="rd-line" key={i}>
                  <span>
                    <AmtText>{m.title}</AmtText>
                    <small>
                      <AmtText>{m.rationale}</AmtText>
                    </small>
                  </span>
                  <span className="good">
                    <Money value={m.est_annual_dollars}/>
                    <small>estimated / year</small>
                  </span>
                </div>))) : (<p>No money moves in the latest analysis.</p>)}
          </Panel>
        </div>
      </div>
    </div>);
}
