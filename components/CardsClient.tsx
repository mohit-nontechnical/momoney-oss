"use client";
import { useState } from "react";
import Link from "next/link";
import type { Snapshot } from "@/lib/types";
import { cardMetrics, reporting } from "@/lib/dashboard-metrics";
import { Money, Panel, Metric, PageHeading, Track } from "./Design";
const order = ["cancel", "downgrade", "decide", "payoff", "keep"];
const monthName = (n: number) => new Date(Date.UTC(2026, n - 1, 15)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
});
export default function CardsClient({ snapshot: s }: {
    snapshot: Snapshot;
}) {
    const [filter, setFilter] = useState("Act on");
    const cards = cardMetrics(s), totalFee = cards.reduce((n, c) => n + c.annual_fee, 0), synced = cards.filter((c) => c.spend != null), spend = synced.reduce((n, c) => n + c.spend!, 0), owed = cards.reduce((n, c) => n + (c.owed || 0), 0), fees = s.fees_90d.reduce((n, f) => n + Math.abs(f.amount), 0);
    const cuts = cards
        .filter((c) => c.verdict.toLowerCase() === "cancel")
        .reduce((n, c) => n + c.annual_fee, 0);
    const groups = Array.from(new Set([...order, ...cards.map((c) => c.verdict.toLowerCase())]))
        .map((v) => ({
        verdict: v,
        cards: cards.filter((c) => c.verdict.toLowerCase() === v),
    }))
        .filter((g) => g.cards.length);
    const selected = groups.filter((g) => filter === "All" ||
        (filter === "Act on"
            ? ["cancel", "downgrade", "decide", "payoff"].includes(g.verdict)
            : g.verdict === filter.toLowerCase()));
    const start = Number(reporting(s).month.slice(5, 7));
    const unknown = cards.filter((c) => c.annual_fee > 0 &&
        !(Number(c.fee_month) >= 1 && Number(c.fee_month) <= 12));
    const highDrag = cards
        .filter((c) => c.drag != null && c.annual_fee > 0)
        .sort((a, b) => b.drag! - a.drag!)[0];
    const knownFees = cards.filter((c) => c.annual_fee > 0 && !unknown.includes(c));
    const spendKnown = synced.length > 0;
    if (!cards.length)
        return (<div className="rd">
        <PageHeading eyebrow="Credit cards">
          Your card inventory is not available yet.
        </PageHeading>
        <Panel>
          <p>
            Card balances and annual fees will appear when the finance feed
            includes your inventory.
          </p>
        </Panel>
      </div>);
    return (<div className="rd">
      <PageHeading eyebrow={`Credit cards · ${cards.length} cards · updated ${s.generated_at.slice(0, 10)}`} description="Annual fees, spending and balances in one view. Verdicts come from your card audit; review each before taking action.">
        <Money value={totalFee}/> a year in fees.
        {cuts > 0 && (<>
            {" "}
            <span className="over">
              <Money value={cuts}/> is assigned to Cancel.
            </span>
          </>)}
      </PageHeading>
      <div className="rd-metrics">
        <Metric label="Annual fees" value={<Money value={totalFee}/>} note={`${cards.filter((c) => c.annual_fee > 0).length} cards charge a fee`}/>
        <Metric label="Spend · last 90 days" value={<Money value={spendKnown ? spend : null}/>} note={`${synced.length} cards with available spend`}/>
        <Metric label="Balances owed" value={<Money value={cards.some((c) => c.owed != null) ? owed : null}/>} note="Linked balances; excludes unknown accounts"/>
        <Metric label="Fees & interest · 90d" value={<Money value={fees}/>} tone="alert" note="Posted fees across the feed"/>
      </div>
      <h2 className="rd-label rd-section-label">What stands out</h2>
      <div className="rd-two">
        <Panel>
          <h3>
            {highDrag
            ? `${highDrag.name} has the highest fee drag.`
            : "Fee drag needs a complete spending window."}
          </h3>
          <p>
            {highDrag ? (<>
                <Money value={highDrag.annual_fee}/> annual fee is{" "}
                {highDrag.drag!.toFixed(2)}% of its annualized spend pace.
              </>) : ("Cards without synced spending remain unavailable.")}
          </p>
        </Panel>
        <Panel>
          <h3>
            {unknown.length
            ? `${unknown.length} fee dates still need confirmation.`
            : "Known renewal months are on your calendar."}
          </h3>
          <p>
            {unknown.length
            ? "Add the billing month from your statement before relying on renewal reminders."
            : "Renewal months are estimates of timing, not exact charge dates."}{" "}
            <Link href="/bills">Update card details</Link>
          </p>
        </Panel>
        <Panel>
          <h3>
            <Money value={fees}/> in fees and interest.
          </h3>
          <p>
            Review the posted charges and confirm autopay details with your
            issuer. <Link href="/bills">See fee log</Link>
          </p>
        </Panel>
        <Panel>
          <h3>
            {cards.filter((c) => !c.account).length} cards without linked
            balances.
          </h3>
          <p>
            Unknown balances and spending stay unknown until the card is linked.
            A zero balance is not assumed.
          </p>
        </Panel>
      </div>
      <div className="rd-two">
        <Panel title={`Where the annual fees go`}>
          <div className="rd-stack" aria-label="Annual fees by verdict">
            {groups
            .filter((g) => g.cards.some((c) => c.annual_fee))
            .map((g) => (<span className={g.verdict} key={g.verdict} style={{
                width: `${(g.cards.reduce((n, c) => n + c.annual_fee, 0) / Math.max(1, totalFee)) * 100}%`,
            }}/>))}
          </div>
          {groups.map((g) => (<div className="rd-line" key={g.verdict}>
              <span className={`rd-verdict ${g.verdict}`}>
                {g.verdict} · {g.cards.length}
              </span>
              <Money value={g.cards.reduce((n, c) => n + c.annual_fee, 0)}/>
            </div>))}
          <h3 className="rd-label">If you act</h3>
          <div className="rd-line">
            <span>Today</span>
            <Money value={totalFee}/>
          </div>
          <div className="rd-line">
            <span>After removing Cancel fees</span>
            <Money value={totalFee - cuts}/>
          </div>
          <Track percent={totalFee ? ((totalFee - cuts) / totalFee) * 100 : 0} tone="blue" label="Fees remaining after Cancel verdicts"/>
          <p className="rd-small">
            Conditional annual savings: <Money value={cuts}/>. Downgrade
            savings need a confirmed replacement fee; no fee refunds assumed.
          </p>
        </Panel>
        <Panel title="Where you spend · 90 days">
          {synced
            .sort((a, b) => b.spend! - a.spend!)
            .map((c) => (<div className="rd-spend-row" key={c.name}>
                <span>{c.name}</span>
                <Track percent={spend ? (c.spend! / spend) * 100 : 0} tone="blue" label={`${c.name} spending share`}/>
                <Money value={c.spend}/>
              </div>))}
          {!synced.length && (<p>Spending totals are unavailable for this feed.</p>)}
          <h3 className="rd-label">Fee drag · fee / annualized spend</h3>
          {cards
            .filter((c) => c.annual_fee > 0)
            .map((c) => (<div className="rd-line" key={c.name}>
                <span>{c.name}</span>
                <span className={c.drag != null && c.drag > 2 ? "over" : "watch"}>
                  {c.drag == null ? "Unavailable" : `${c.drag.toFixed(2)}%`}
                </span>
              </div>))}
          <p className="rd-small">
            Gross charges, excluding transfers, opening balances and card
            payments. Annual pace = 90-day spend × 365/90. Refunds are not
            deducted. Missing or capped data is unavailable.
          </p>
        </Panel>
      </div>
      <Panel title="All cards" action={<span className="rd-small">Grouped by verdict</span>}>
        <div className="rd-segments rd-mobile-flex">
          {[
            "Act on",
            "All",
            "Cancel",
            "Downgrade",
            "Decide",
            "Payoff",
            "Keep",
        ].map((f) => (<button aria-pressed={filter === f} key={f} onClick={() => setFilter(f)}>
              {f}
            </button>))}
        </div>
        <div className="rd-desktop rd-table-wrap">
          <table className="rd-table">
            <thead>
              <tr>
                {[
            "Card",
            "Verdict",
            "Fee / yr",
            "90-day spend",
            "Fee drag",
            "Owed",
            "Fee month",
        ].map((x) => (<th key={x}>{x}</th>))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (<CardGroup key={g.verdict} group={g}/>))}
            </tbody>
          </table>
        </div>
        <div className="rd-mobile">
          {selected
            .flatMap((g) => g.cards)
            .map((c) => (<article className="rd-card-tile" key={c.name}>
                <div className="rd-line">
                  <strong>{c.name}</strong>
                  <span className={`rd-verdict ${c.verdict.toLowerCase()}`}>
                    {c.verdict}
                  </span>
                </div>
                <div className="rd-two">
                  <div>
                    <small>Annual fee</small>
                    <Money value={c.annual_fee}/>
                  </div>
                  <div>
                    <small>Balance owed</small>
                    <Money value={c.owed}/>
                  </div>
                  <div>
                    <small>90-day spend</small>
                    <Money value={c.spend}/>
                  </div>
                  <div>
                    <small>Fee drag</small>
                    {c.drag == null ? "Unavailable" : `${c.drag.toFixed(2)}%`}
                  </div>
                </div>
                {c.note && <p className="rd-small">{c.note}</p>}
                <Link href="/bills">Card details</Link>
              </article>))}
          {!selected.length && <p>No cards match this verdict.</p>}
        </div>
      </Panel>
      <Panel title="Fee calendar · next 12 months">
        <div className="rd-calendar rd-desktop">
          {Array.from({ length: 12 }, (_, i) => {
            let m = ((start - 1 + i) % 12) + 1;
            return (<div key={m}>
                <strong>
                  {monthName(m)}
                  {i === 0 ? " · now" : ""}
                </strong>
                {knownFees
                    .filter((c) => Number(c.fee_month) === m)
                    .map((c) => (<p key={c.name}>
                      {c.name}
                      <br />
                      <Money value={c.annual_fee}/>
                    </p>))}
              </div>);
        })}
        </div>
        <div className="rd-mobile">
          {[...knownFees]
            .sort((a, b) => ((Number(a.fee_month) - start + 12) % 12) -
            ((Number(b.fee_month) - start + 12) % 12))
            .map((c) => (<div className="rd-line" key={c.name}>
                <span>
                  {c.name}
                  <small>{monthName(Number(c.fee_month))}</small>
                </span>
                <Money value={c.annual_fee}/>
              </div>))}
        </div>
        {unknown.length > 0 && (<p className="rd-unknown">
            Date unknown: {unknown.map((c) => c.name).join(", ")}.{" "}
            <Link href="/bills">Add dates</Link>
          </p>)}
        <p className="rd-small">
          Months from the card inventory or your saved details. Confirm exact
          dates with the issuer.
        </p>
      </Panel>
    </div>);
}
function CardGroup({ group: g, }: {
    group: {
        verdict: string;
        cards: ReturnType<typeof cardMetrics>;
    };
}) {
    return (<>
      <tr className="rd-group">
        <th colSpan={7}>{g.verdict}</th>
      </tr>
      {g.cards.map((c) => (<tr key={c.name}>
          <td>
            <strong>{c.name}</strong>
            <small>{c.last4 && `··${c.last4}`}</small>
          </td>
          <td>
            <span className={`rd-verdict ${g.verdict}`}>{c.verdict}</span>
          </td>
          <td>
            <Money value={c.annual_fee}/>
          </td>
          <td>
            <Money value={c.spend}/>
          </td>
          <td>{c.drag == null ? "—" : `${c.drag.toFixed(2)}%`}</td>
          <td>
            <Money value={c.owed} exact/>
          </td>
          <td>{c.fee_month ? monthName(Number(c.fee_month)) : "Unknown"}</td>
        </tr>))}
    </>);
}
