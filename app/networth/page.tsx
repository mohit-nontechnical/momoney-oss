import { getHistory, getSnapshot } from "@/lib/data";
import { fmt$, fmt$$ } from "@/lib/format";
import { Amt } from "@/components/Amt";
import EmptyState from "@/components/EmptyState";
import GlideChart from "@/components/GlideChart";
import ForecastChart from "@/components/ForecastChart";
import type { Balance } from "@/lib/types";
export const dynamic = "force-dynamic";
type Bucket = "cash" | "investments" | "cards";
function classify(name: string, cardMatches: string[]): Bucket {
    const n = name.toUpperCase();
    if (n.includes("CARD") || cardMatches.some((m) => n.includes(m.toUpperCase())))
        return "cards";
    if (/401\(?K\)?|IRA|BROKERAGE|ROBINHOOD|INVESTMENT/.test(n))
        return "investments";
    return "cash";
}
const BUCKET_LABEL: Record<Bucket, string> = {
    cash: "Cash",
    investments: "Investments & retirement",
    cards: "Card balances",
};
export default async function NetWorthPage() {
    const [snapshot, history] = await Promise.all([getSnapshot(), getHistory()]);
    if (!snapshot)
        return <EmptyState />;
    const s = snapshot;
    const cardMatches = (s.cards ?? []).map((c) => c.account_match).filter((m): m is string => !!m);
    const buckets: Record<Bucket, Balance[]> = { cash: [], investments: [], cards: [] };
    for (const b of s.balances) {
        buckets[classify(b.name, cardMatches)].push(b);
    }
    const assetsTotal = s.balances.filter((b) => b.balance > 0).reduce((sum, b) => sum + b.balance, 0) +
        s.manual_assets.reduce((sum, a) => sum + a.value, 0);
    const cardBalanceTotal = buckets.cards.reduce((sum, b) => sum + b.balance, 0);
    const maxAbs = Math.max(...s.balances.map((b) => Math.abs(b.balance)), 1);
    return (<>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-kicker">Net worth · what the <Amt>{fmt$(s.net_worth)}</Amt> is made of</div>
          <div className="page-title">The stack, by account.</div>
        </div>
        <div className="page-stats">
          <div className="page-stat">
            <span className="n"><Amt>{fmt$(assetsTotal)}</Amt></span>
            <span className="l">assets</span>
          </div>
          <div className="page-stat">
            <span className="n rust"><Amt>{fmt$(cardBalanceTotal)}</Amt></span>
            <span className="l">card balances</span>
          </div>
        </div>
      </div>

      <section>
        <h2>Net worth history</h2>
        <GlideChart snapshot={s} history={history}/>
      </section>

      <ForecastChart forecast={s.forecast}/>

      {(["investments", "cash", "cards"] as Bucket[]).map((bucket) => buckets[bucket].length ? (<section key={bucket}>
            <h2>{BUCKET_LABEL[bucket]}</h2>
            {buckets[bucket]
                .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
                .map((b) => {
                const w = Math.max(0.5, (100 * Math.abs(b.balance)) / maxAbs);
                return (<div key={b.name} className="bar" data-tip={`${b.name}: ${fmt$$(b.balance)}`}>
                    <span className="bl">{b.name}</span>
                    <div className="bt">
                      <div className={`bf${b.balance < 0 ? " rust" : ""}`} style={{ width: `${w.toFixed(1)}%` }}/>
                    </div>
                    <span className={`bv${b.balance < 0 ? " neg" : ""}`}><Amt>{fmt$$(b.balance)}</Amt></span>
                  </div>);
            })}
          </section>) : null)}

      {s.manual_assets.length > 0 && (<section>
          <h2>Manual assets</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th className="num">Value</th>
                  <th>As of</th>
                </tr>
              </thead>
              <tbody>
                {s.manual_assets.map((a) => (<tr key={a.name}>
                    <td>
                      {a.name}
                      {a.note && <div className="fn">{a.note}</div>}
                    </td>
                    <td className="num"><Amt>{fmt$$(a.value)}</Amt></td>
                    <td>{a.as_of}</td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </section>)}

      <p className="fn">
        Grouping is a naming heuristic over synced account names — 401(k)/IRA/brokerage/Robinhood
        read as investments, anything with &quot;card&quot; reads as a card balance, everything
        else reads as cash.
      </p>
    </>);
}
