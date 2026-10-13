import { getSnapshot } from "@/lib/data";
import { fmt$$ } from "@/lib/format";
import { Amt, AmtText } from "@/components/Amt";
import EmptyState from "@/components/EmptyState";
export const dynamic = "force-dynamic";
export default async function HouseholdPage() {
    const snapshot = await getSnapshot();
    if (!snapshot)
        return <EmptyState />;
    const s = snapshot;
    const h = s.household;
    if (!h || !h.months.length) {
        return (<>
        <div className="page-head">
          <div className="page-head-main">
            <div className="page-kicker">Household</div>
            <div className="page-title">No household data yet</div>
          </div>
        </div>
        <section className="empty">
          <h2>Waiting on the household split</h2>
          <p className="fn">
            The imported snapshot does not include household splits.
          </p>
        </section>
      </>);
    }
    const roommateLabels = h.roommates.length > 0
        ? h.roommates
        : Array.from({ length: Math.max(0, h.split_ways - 1) }, (_, i) => `[Roommate ${i + 1}]`);
    const payees = Array.from(new Set(h.months.flatMap((m) => Object.keys(m.utilities)))).sort();
    const lastMonth = h.months[h.months.length - 1];
    return (<>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-kicker">Household · {h.split_ways} people</div>
          <div className="page-title">Utilities, split {h.split_ways} ways.</div>
        </div>
        <div className="page-stats">
          <div className="page-stat">
            <span className="n"><Amt>{fmt$$(lastMonth.total)}</Amt></span>
            <span className="l">{lastMonth.month} total</span>
          </div>
          <div className="page-stat">
            <span className="n"><Amt>{fmt$$(lastMonth.per_person)}</Amt></span>
            <span className="l">per person, {lastMonth.month}</span>
          </div>
        </div>
      </div>

      <section>
        <h2>Bills by month</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bill</th>
                {h.months.map((m) => (<th key={m.month} className="num">
                    {m.month}
                  </th>))}
              </tr>
            </thead>
            <tbody>
              {payees.map((p) => (<tr key={p}>
                  <td>{p}</td>
                  {h.months.map((m) => (<td key={m.month} className="num">
                      {p in m.utilities ? <Amt>{fmt$$(m.utilities[p])}</Amt> : <span className="fn">no bill seen</span>}
                    </td>))}
                </tr>))}
              <tr>
                <td>
                  <b>Total seen</b>
                </td>
                {h.months.map((m) => (<td key={m.month} className="num">
                    <b><Amt>{fmt$$(m.total)}</Amt></b>
                  </td>))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>
          {lastMonth.month} settle-up · <Amt>{fmt$$(lastMonth.total)}</Amt> ÷ {h.split_ways}
        </h2>
        <div className="mini-cards">
          <div className="mini-card">
            <div className="mini-card-top">
              <span className="mini-card-name">You</span>
            </div>
            <div className="mini-card-sub">paid the bills</div>
            <div className="mini-card-amt" style={{ fontSize: 18 }}>
              is owed <Amt>{fmt$$(lastMonth.total - lastMonth.per_person)}</Amt>
            </div>
          </div>
          {roommateLabels.map((name) => (<div key={name} className="mini-card">
              <div className="mini-card-top">
                <span className="mini-card-name">{name}</span>
              </div>
              <div className="mini-card-sub">share of {lastMonth.month}</div>
              <div className="mini-card-amt" style={{ fontSize: 18 }}>
                <Amt>{fmt$$(lastMonth.per_person)}</Amt>
              </div>
            </div>))}
        </div>
      </section>

      <div className="callout">
        <div className="callout-title">Rent, tracked separately</div>
        <div className="callout-body"><AmtText>{h.rent_note}</AmtText></div>
      </div>
    </>);
}
