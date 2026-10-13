"use client";
import { useState } from "react";
import type { Snapshot } from "@/lib/types";
import { budgetRows, reporting } from "@/lib/dashboard-metrics";
import { Money, Metric, Panel, Track, PageHeading } from "./Design";
export function BudgetList({ snapshot: s, limit, }: {
    snapshot: Snapshot;
    limit?: number;
}) {
    const r = reporting(s), rows = budgetRows(s).slice(0, limit);
    return (<>
      {rows.map((b) => (<div className="rd-budget-row" key={b.name}>
          <strong>{b.name}</strong>
          <Track percent={b.percent} marker={b.budgeted > 0 ? r.elapsed * 100 : undefined} tone={b.status} label={`${b.name}: ${b.percent.toFixed(0)}% used; ${Math.round(r.elapsed * 100)}% of month elapsed`}/>
          <div>
            <Money value={b.actual} exact/>{" "}
            <span className="rd-muted">
              of{" "}
              {b.budgeted > 0 ? (<Money value={b.budgeted}/>) : (<span>no target</span>)}
            </span>
            <small className={b.status}>
              {b.status === "unset" ? ("Set a monthly target") : (<>
                  <Money value={Math.abs(b.budgeted - b.actual)}/>{" "}
                  {b.status === "over"
                    ? "over"
                    : `left · ${b.status === "watch" ? "ahead of pace" : "on track"}`}
                </>)}
            </small>
          </div>
        </div>))}
      {!rows.length && <p>No categories to show.</p>}
    </>);
}
export default function BudgetsClient({ snapshot: s }: {
    snapshot: Snapshot;
}) {
    const [filter, setFilter] = useState("All"), r = reporting(s), rows = budgetRows(s), budget = rows.reduce((n, b) => n + b.budgeted, 0), spent = rows.reduce((n, b) => n + b.actual, 0), over = rows.filter((b) => b.status === "over");
    const filtered = rows.filter((b) => filter === "All" ||
        (filter === "Watch"
            ? ["over", "watch"].includes(b.status)
            : b.status === "good"));
    const filteredSnapshot = {
        ...s,
        budgets: Object.fromEntries(filtered.map((b) => [b.name, { budgeted: b.budgeted, actual: b.actual }])),
    };
    return (<div className="rd rd-budgets">
      <PageHeading eyebrow={`${r.label} budgets · day ${r.day} of ${r.days}`} description={budget > 0
            ? "The marker shows how far through the month you are. Spending ahead of it needs a closer look."
            : "Category spending is available. Add monthly targets in your import configuration to compare it with a plan."}>
        {!budget
            ? "Your monthly budget targets are not set."
            : over.length
                ? `${over.length} ${over.length === 1 ? "category is" : "categories are"} over budget.`
                : "Your categories are within their monthly budgets."}
      </PageHeading>
      <div className="rd-metrics">
        <Metric label="Spent" value={<Money value={spent}/>} note={`${rows.length} categories in the feed`}/>
        <Metric label="Monthly budget" value={<Money value={budget > 0 ? budget : null}/>}/>
        <Metric label={!budget || budget >= spent ? "Left to spend" : "Over budget"} value={<Money value={budget > 0 ? Math.abs(budget - spent) : null}/>} note={budget > 0 ? (<>
                <Money value={Math.max(0, budget - spent) /
                Math.max(1, r.days - r.day + 1)}/>{" "}
                / day including today
              </>) : ("Add budgets to your import configuration.")}/>
        <Metric label="Over budget" value={budget > 0 ? over.length : "—"} tone={over.length ? "alert" : ""} note={over.length ? (<>
                <Money value={over.reduce((n, b) => n + b.actual - b.budgeted, 0)}/>{" "}
                above category limits
              </>) : budget > 0 ? ("No category above its limit") : ("No limits configured")}/>
      </div>
      <Panel title="By category">
        {!budget && (<p className="rd-unknown">
            The feed contains spending but no positive budget targets. Set
            monthly targets in your account configuration and reimport.
            Pace and money left are unavailable until then.
          </p>)}
        <div className="rd-segments" aria-label="Budget filters">
          {["All", "Watch", "On track"].map((f) => (<button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}>
              {f}
            </button>))}
        </div>
        <BudgetList snapshot={filteredSnapshot}/>
        {rows.length > 0 && !filtered.length && (<p>No categories match this filter.</p>)}
        <p className="rd-small">
          Today marker: {Math.round(r.elapsed * 100)}% of {r.label}. Green = on
          track · amber = ahead of pace · rust = over budget. Reporting date:{" "}
          {s.generated_at.slice(0, 10)}.
        </p>
      </Panel>
    </div>);
}
