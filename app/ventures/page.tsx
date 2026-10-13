import { getSnapshot } from "@/lib/data";
import { fmt$, fmt$$ } from "@/lib/format";
import { Amt, AmtText } from "@/components/Amt";
import EmptyState from "@/components/EmptyState";
export const dynamic = "force-dynamic";
interface VentureRow {
    id: string;
    name: string;
    cost: number;
    costByMonth: Record<string, number>;
    hasRevenue: boolean;
    revenue: number;
}
export default async function VenturesPage() {
    const snapshot = await getSnapshot();
    if (!snapshot)
        return <EmptyState />;
    const s = snapshot;
    const vName = Object.fromEntries(s.ventures.map((v) => [v.id, v.name]));
    const vRevenue = s.venture_revenue ?? {};
    const trackedIds = Array.from(new Set([...Object.keys(s.venture_costs), ...Object.keys(vRevenue)]));
    const rows: VentureRow[] = trackedIds.map((id) => {
        const costEntry = s.venture_costs[id];
        const revEntry = vRevenue[id];
        return {
            id,
            name: vName[id] || id,
            cost: costEntry?.total ?? 0,
            costByMonth: costEntry?.byMonth ?? {},
            hasRevenue: !!revEntry,
            revenue: revEntry?.total ?? 0,
        };
    });
    rows.sort((a, b) => a.revenue - a.cost - (b.revenue - b.cost));
    const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
    const anyRevenueTracked = rows.some((r) => r.hasRevenue);
    const totalRevenue = rows.reduce((sum, r) => sum + (r.hasRevenue ? r.revenue : 0), 0);
    const totalNet = anyRevenueTracked ? totalRevenue - totalCost : null;
    const untracked = s.ventures.filter((v) => !trackedIds.includes(v.id));
    const hobbyPatterns = (s.patterns ?? []).filter((p) => p.type === "hobby_venture");
    if (!rows.length && !s.ventures.length) {
        return (<>
        <div className="page-head">
          <div className="page-head-main">
            <div className="page-kicker">Ventures</div>
            <div className="page-title">No venture data yet</div>
          </div>
        </div>
        <section className="empty">
          <h2>Waiting on venture tracking</h2>
          <p className="fn">
            No ventures or venture costs in this snapshot yet — this fills in once cost
            attribution ships in the pipeline.
          </p>
        </section>
      </>);
    }
    return (<>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-kicker">Ventures · business or hobby?</div>
          <div className="page-title">Every venture earns its keep, or says why not.</div>
        </div>
        <div className="page-stats">
          <div className="page-stat">
            <span className="n rust"><Amt>{fmt$(totalCost)}</Amt></span>
            <span className="l">tracked venture costs</span>
          </div>
          {anyRevenueTracked ? (<>
              <div className="page-stat">
                <span className="n"><Amt>{fmt$(totalRevenue)}</Amt></span>
                <span className="l">tracked venture revenue</span>
              </div>
              <div className="page-stat">
                <span className={`n ${(totalNet ?? 0) >= 0 ? "" : "rust"}`}>
                  <Amt>{fmt$(totalNet ?? 0)}</Amt>
                </span>
                <span className="l">net, revenue-tracked ventures</span>
              </div>
            </>) : (<div className="page-stat">
              <span className="n"><Amt>{fmt$(s.biz_income_this_month)}</Amt></span>
              <span className="l">tracked business income, this month</span>
            </div>)}
        </div>
      </div>

      <section>
        <h2>Venture ledger</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Venture</th>
                <th className="num">Cost</th>
                <th className="num">Revenue</th>
                <th className="num">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (<tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="num"><Amt>{fmt$$(r.cost)}</Amt></td>
                  <td className="num">
                    {r.hasRevenue ? (<Amt>{fmt$$(r.revenue)}</Amt>) : (<span className="chip chip-faint">no revenue tracked</span>)}
                  </td>
                  <td className="num">
                    {r.hasRevenue ? (<span className={r.revenue - r.cost >= 0 ? "pos" : "neg"}>
                        <Amt>{fmt$$(r.revenue - r.cost)}</Amt>
                      </span>) : (<span className="fn">— cost only</span>)}
                  </td>
                </tr>))}
              {untracked.map((v) => (<tr key={v.id}>
                  <td>{v.name}</td>
                  <td className="num fn">—</td>
                  <td>
                    <span className="chip chip-faint">Nothing tracked</span>
                  </td>
                  <td className="num fn">—</td>
                </tr>))}
            </tbody>
          </table>
        </div>
        <p className="fn">
          Tracked business income this month: <b><Amt>{fmt$$(s.biz_income_this_month)}</Amt></b>.
          {anyRevenueTracked
            ? " Revenue shown per-venture is direct venture attribution, not this figure."
            : " Revenue connectors land in Phase 2."}
        </p>
      </section>

      <div className="mini-cards">
        {rows.map((r) => {
            const costMonths = Object.entries(r.costByMonth).sort(([a], [b]) => a.localeCompare(b));
            const net = r.revenue - r.cost;
            return (<div key={r.id} className="mini-card">
              <div className="mini-card-top">
                <span className="mini-card-name">{r.name}</span>
                {r.hasRevenue && net < 0 && <span className="chip chip-rust">Net-negative</span>}
              </div>
              {r.hasRevenue ? (<div className="mini-card-amt">
                  <span className={net >= 0 ? "pos" : "neg"}><Amt>{fmt$$(net)}</Amt></span>
                </div>) : (<div className="mini-card-amt fn" style={{ fontSize: 13 }}>
                  net unknown — no revenue tracked
                </div>)}
              <div className="mini-card-sub">
                cost <Amt>{fmt$$(r.cost)}</Amt>
                {" · "}
                revenue{" "}
                {r.hasRevenue ? (<Amt>{fmt$$(r.revenue)}</Amt>) : (<span className="chip chip-faint">no revenue tracked</span>)}
              </div>
              <div className="mini-card-sub">
                {costMonths.length ? (costMonths.map(([m, amt], i) => (<span key={m}>
                      {i > 0 ? " · " : ""}
                      {m}: <Amt>{fmt$$(amt)}</Amt>
                    </span>))) : ("tracked cost, monthly breakdown not shipped yet")}
              </div>
            </div>);
        })}
      </div>

      {hobbyPatterns.length > 0 && (<section>
          <h2>Hobby vs. business</h2>
          <div className="topopt-list">
            {hobbyPatterns.map((p) => (<div key={p.id} className="topopt-row" data-tip={p.detail}>
                <span className="topopt-title"><AmtText>{p.title}</AmtText></span>
                <span className="topopt-amt">{p.dollars_annual ? <><Amt>{fmt$(p.dollars_annual)}</Amt>/yr</> : "—"}</span>
              </div>))}
          </div>
        </section>)}

      <div className="callout rust">
        <div className="callout-title">The weekly verdict</div>
        <div className="callout-body">
          Every ventured cost above without a matching revenue line stays a cost pool until
          it isn&apos;t. Attach revenue, or call it a hobby on purpose.
        </div>
      </div>
    </>);
}
