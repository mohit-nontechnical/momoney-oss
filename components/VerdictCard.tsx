import { AmtText } from "@/components/Amt";
import type { Analysis } from "@/lib/types";
export default function VerdictCard({ analysis }: {
    analysis: Analysis | null;
}) {
    if (!analysis) {
        return (<section className="verdict">
        <h2>The verdict</h2>
        <p className="fn">
          No analysis has been imported yet.
        </p>
      </section>);
    }
    return (<section className="verdict">
      <h2>
        The verdict <span className="fn">· {(analysis.generated_at || "").slice(0, 10)}</span>
      </h2>
      <p className="vtext">
        <AmtText>{analysis.verdict}</AmtText>
      </p>
      <ul>
        {(analysis.highlights || []).map((h, i) => (<li key={i}>
            <AmtText>{h}</AmtText>
          </li>))}
      </ul>
      {analysis.venture_note && (<p className="vnote">
          <AmtText>{analysis.venture_note}</AmtText>
        </p>)}
      {(analysis.actions || []).length > 0 && (<div className="actions">
          {analysis.actions.map((a, i) => (<div key={i} className="action">
              → <AmtText>{a}</AmtText>
            </div>))}
        </div>)}
    </section>);
}
