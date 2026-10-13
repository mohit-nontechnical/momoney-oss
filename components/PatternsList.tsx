import { fmt$ } from "@/lib/format";
import { Amt, AmtText } from "@/components/Amt";
import type { Pattern } from "@/lib/types";
export default function PatternsList({ patterns }: {
    patterns?: Pattern[];
}) {
    const top = (patterns ?? []).slice(0, 6);
    if (!top.length) {
        return (<section className="empty">
        <h2>Patterns</h2>
        <p className="fn">
          No patterns detected yet — this fills in once the pattern detectors
          ship in the pipeline.
        </p>
      </section>);
    }
    return (<section>
      <h2>Patterns</h2>
      <div className="topopt-list">
        {top.map((p) => (<div key={p.id} className="topopt-row" data-tip={p.detail}>
            <span className="topopt-title"><AmtText>{p.title}</AmtText></span>
            <span className="topopt-amt">
              {p.dollars_annual ? <><Amt>{fmt$(p.dollars_annual)}</Amt>/yr</> : "—"}
            </span>
          </div>))}
      </div>
    </section>);
}
