import { fmt$$, pct } from "@/lib/format";
import { Amt } from "@/components/Amt";
import type { NeedsReviewItem } from "@/lib/types";
export default function NeedsReview({ items, limit, }: {
    items?: NeedsReviewItem[];
    limit?: number;
}) {
    const all = items ?? [];
    if (!all.length)
        return null;
    const rows = limit ? all.slice(0, limit) : all;
    const more = all.length - rows.length;
    return (<section>
      <h2>Needs review · {all.length} suggestion{all.length === 1 ? "" : "s"}</h2>
      <p className="fn">
        These category suggestions need your review. Find the purchase in the transaction list below and choose Edit to correct it.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Payee</th>
              <th>Suggested</th>
              <th className="num">Confidence</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (<tr key={r.id} data-tip={r.reason}>
                <td>{r.date}</td>
                <td>{r.payee}</td>
                <td>{r.suggested}</td>
                <td className="num">{pct(r.confidence * 100)}</td>
                <td className="num"><Amt>{fmt$$(r.amount)}</Amt></td>
              </tr>))}
          </tbody>
        </table>
      </div>
      {more > 0 && <p className="fn">+{more} more, not shown here.</p>}
    </section>);
}
