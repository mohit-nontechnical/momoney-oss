"use client";
import { useState } from "react";
import { Money, Panel } from "./Design";
import type { Snapshot } from "@/lib/types";
import { accountGroups } from "@/lib/dashboard-metrics";
export default function AccountSummary({ snapshot: s, }: {
    snapshot: Snapshot;
}) {
    const [show, setShow] = useState(false), groups = accountGroups(s);
    return (<Panel className="rd-accounts">
      <div className="rd-label">Net worth</div>
      <div className="rd-networth">
        <Money value={s.net_worth}/>
      </div>
      <div className="rd-account-grid">
        {groups.map((g) => (<div key={g.name}>
            <span className="rd-label">{g.name}</span>
            <strong>
              <Money value={g.total}/>
            </strong>
          </div>))}
      </div>
      <button className="rd-text-button rd-mobile" aria-expanded={show} onClick={() => setShow(!show)}>
        {show ? "Hide accounts" : "Show accounts"}
      </button>
      <div className={`rd-account-list ${show ? "is-open" : ""}`}>
        {groups.map((g) => (<div key={g.name}>
            <h3 className="rd-label">{g.name}</h3>
            {g.items.map((i) => (<div className="rd-line" key={i.name}>
                <span>{i.name}</span>
                <Money value={i.value}/>
              </div>))}
          </div>))}
      </div>
      <p className="rd-small">
        Includes manual assets at their recorded values.
      </p>
    </Panel>);
}
