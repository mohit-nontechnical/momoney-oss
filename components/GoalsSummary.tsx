import Link from "next/link";
import { listedGoals, goalProgress } from "@/lib/customization";
import { getCustomization } from "@/lib/data";
import type { Snapshot } from "@/lib/types";
import { Amt } from "./Amt";
import { fmt$$ } from "@/lib/format";
export default async function GoalsSummary({ snapshot: s, }: {
    snapshot: Snapshot;
}) {
    const c = await getCustomization(), goals = listedGoals(c, s);
    return (<section>
      <div className="goal-card-head">
        <h2>Your goals</h2>
        <Link href="/goals">Manage goals</Link>
      </div>
      <div className="goal-grid">
        {goals.slice(0, 3).map((g) => {
            const p = goalProgress(g, s);
            return (<div key={g.id}>
              <h3>{g.name}</h3>
              {p.available ? (<>
                  <progress value={p.percent} max={100} aria-label={`${g.name} progress`}/>
                  <p className="amt-block">
                    <Amt>{fmt$$(p.current)}</Amt> of{" "}
                    <Amt>{fmt$$(p.target)}</Amt> · {p.percent.toFixed(0)}%
                  </p>
                </>) : (<p>Progress unavailable until card balances are refreshed.</p>)}
            </div>);
        })}
      </div>
      {goals.length < 2 && (<p>
          Set targets for a cash cushion, card payoff or travel alongside your
          net-worth goal.
        </p>)}
    </section>);
}
