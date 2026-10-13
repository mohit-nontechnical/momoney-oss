"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Snapshot, CardInfo } from "@/lib/types";
import type { CardDetails } from "@/lib/card-details";
import { cardMetrics } from "@/lib/dashboard-metrics";
import { Money, Metric, Panel, PageHeading } from "./Design";
import CardDetailsEditor from "./CardDetailsEditor";
export default function BillsClient({ snapshot: s, details, }: {
    snapshot: Snapshot;
    details: Record<string, CardDetails>;
}) {
    const [editing, setEditing] = useState<CardInfo | null>(null), [more, setMore] = useState(false), [notice, setNotice] = useState("");
    const router = useRouter(), cards = cardMetrics(s), known = cards.filter((c) => c.owed != null), owed = known.reduce((n, c) => n + c.owed!, 0), fees = s.fees_90d.reduce((n, f) => n + Math.abs(f.amount), 0), recurring = s.recurring.reduce((n, c) => n + c.monthly, 0);
    const utilization = (c: (typeof cards)[number]) => details[c.name]?.limit && c.owed != null
        ? `${((100 * c.owed) / details[c.name].limit!).toFixed(1)}%`
        : "Unknown";
    const date = (d?: CardDetails) => d?.due_date
        ? d.due_date < s.generated_at.slice(0, 10)
            ? `${d.due_date} · past due date`
            : d.due_date
        : "Not set";
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
    return (<div className="rd rd-bills">
      <PageHeading eyebrow={`Bills & credit · updated ${s.generated_at.slice(0, 10)}`} description="Card balances come from the feed. Add statement details to track payment dates, limits and autopay.">
        {known.length ? (<>
            <Money value={owed}/> owed. Keep the next payment in view.
          </>) : ("Add your card details to see what is due.")}
      </PageHeading>
      <div className="rd-metrics">
        <Metric label="Card balances" value={<Money value={known.length ? owed : null}/>} note={`${known.length} of ${cards.length} balances available`}/>
        <Metric label="Due dates recorded" value={`${cards.filter((c) => details[c.name]?.due_date).length} / ${cards.length}`} note="Confirm the next statement date"/>
        <Metric label="Recurring / month" value={<Money value={recurring}/>} note="Detected estimate"/>
        <Metric label="Fees & interest · 90d" value={<Money value={fees}/>} tone="alert"/>
      </div>
      {notice && <p role="status">{notice}</p>}
      {editing && (<CardDetailsEditor card={editing} details={details[editing.name]} onClose={() => setEditing(null)} onSaved={() => {
                setEditing(null);
                setNotice("Card details saved.");
                router.refresh();
            }}/>)}
      <Panel title="Card payments" action={<span className="rd-small">Details entered by you</span>}>
        <div className="rd-desktop rd-table-wrap">
          <table className="rd-table">
            <thead>
              <tr>
                {[
            "Card",
            "Balance owed",
            "Due date",
            "Minimum",
            "Autopay",
            "Limit",
            "Utilization",
            "Details",
        ].map((t) => (<th key={t}>{t}</th>))}
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => {
            const d = details[c.name];
            return (<tr key={c.name}>
                    <td>{c.name}</td>
                    <td>
                      <Money value={c.owed} exact/>
                    </td>
                    <td>{date(d)}</td>
                    <td>
                      <Money value={d?.minimum}/>
                    </td>
                    <td>
                      {d?.autopay && d.autopay !== "unknown"
                    ? d.autopay
                    : "Unknown"}
                    </td>
                    <td>
                      <Money value={d?.limit}/>
                    </td>
                    <td>{utilization(c)}</td>
                    <td>
                      <button className="rd-text-button" onClick={() => setEditing(c)}>
                        {d ? "Edit" : "Add"}
                      </button>
                    </td>
                  </tr>);
        })}
            </tbody>
          </table>
        </div>
        <div className="rd-mobile">
          {cards.map((c) => {
            const d = details[c.name];
            return (<article className="rd-card-tile" key={c.name}>
                <div className="rd-line">
                  <strong>{c.name}</strong>
                  <Money value={c.owed} exact/>
                </div>
                <div className="rd-two">
                  <div>
                    <small>Due date</small>
                    {date(d)}
                  </div>
                  <div>
                    <small>Minimum</small>
                    <Money value={d?.minimum}/>
                  </div>
                  <div>
                    <small>Autopay</small>
                    {d?.autopay && d.autopay !== "unknown"
                    ? d.autopay
                    : "Not confirmed"}
                  </div>
                  <div>
                    <small>Utilization</small>
                    {utilization(c)}
                  </div>
                </div>
                <button className="rd-pill" onClick={() => setEditing(c)}>
                  {d ? "Edit details" : "Add payment details"}
                </button>
              </article>);
        })}
        </div>
        <p className="rd-small">
          A recorded due date does not confirm that a payment is outstanding or
          completed. Update it after each statement. Autopay status is your
          record, not a live bank setting.
        </p>
      </Panel>
      <div className="rd-two">
        <Panel title="Fees & interest log">
          {s.fees_90d.length ? (s.fees_90d.map((f, i) => (<div className="rd-line" key={i}>
                <span>
                  <strong>{f.payee}</strong>
                  <small>
                    {f.date} · {f.account}
                  </small>
                </span>
                <span className="over">
                  <Money value={Math.abs(f.amount)} exact/>
                </span>
              </div>))) : (<p>No fees reported in this window.</p>)}
        </Panel>
        <Panel title="Recurring bills" action={<span className="rd-small">Detected, not scheduled</span>}>
          {s.recurring.map((b, i) => (<div className={`rd-line ${!more && i >= 4 ? "rd-recurring-extra" : ""}`} key={b.payee}>
              <span>
                {b.payee}
                <small>{b.category || "Uncategorized"}</small>
              </span>
              <span>
                <Money value={b.monthly} exact/>
                <small>/ month</small>
              </span>
            </div>))}
          {s.recurring.length > 4 && (<button className="rd-text-button rd-mobile" aria-expanded={more} onClick={() => setMore(!more)}>
              {more ? "Show less" : `Show more (${s.recurring.length - 4})`}
            </button>)}
          <p className="rd-small">
            Estimated from posted transactions; verify amounts and billing dates
            with each provider.
          </p>
        </Panel>
      </div>
    </div>);
}
