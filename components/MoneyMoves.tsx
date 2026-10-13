import { fmt$ } from "@/lib/format";
import { Amt, AmtText } from "@/components/Amt";
import type { MoneyMove } from "@/lib/types";
export default function MoneyMoves({ moves }: {
    moves?: MoneyMove[];
}) {
    const list = moves ?? [];
    if (!list.length) {
        return (<section className="verdict">
        <h2>Money moves</h2>
        <p className="fn">
          No money moves yet — these land after the weekly deep review runs.
        </p>
      </section>);
    }
    return (<section className="verdict">
      <h2>Money moves</h2>
      <div className="actions">
        {list.map((m, i) => (<div key={i} className="action mm">
            <div className="mm-top">
              <span className="mm-title"><AmtText>{m.title}</AmtText></span>
              <span className="mm-amt"><Amt>{fmt$(m.est_annual_dollars)}</Amt>/yr</span>
            </div>
            <p className="mm-rationale"><AmtText>{m.rationale}</AmtText></p>
            <p className="mm-step">First step: <AmtText>{m.first_step}</AmtText></p>
          </div>))}
      </div>
    </section>);
}
