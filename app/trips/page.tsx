import { getSnapshot } from "@/lib/data";
import { fmt$, fmt$$, pct } from "@/lib/format";
import { Amt } from "@/components/Amt";
import EmptyState from "@/components/EmptyState";
import type { Trip } from "@/lib/types";
export const dynamic = "force-dynamic";
function TripCard({ trip }: {
    trip: Trip;
}) {
    const cats = Object.entries(trip.by_category).sort((a, b) => b[1] - a[1]);
    const maxCat = Math.max(...cats.map(([, v]) => v), 1);
    return (<section>
      <h2>
        {trip.anchor_payee || "Trip"} · {trip.start} – {trip.end}
      </h2>
      <div className="page-stats" style={{ marginBottom: 14 }}>
        <div className="page-stat">
          <span className="n"><Amt>{fmt$(trip.total)}</Amt></span>
          <span className="l">total, {trip.days} days</span>
        </div>
        <div className="page-stat">
          <span className="n"><Amt>{fmt$(trip.per_day)}</Amt></span>
          <span className="l">per day</span>
        </div>
        <div className="page-stat">
          <span className="n">{trip.n_txns}</span>
          <span className="l">transactions</span>
        </div>
      </div>

      {cats.length > 0 && (<>
          {cats.map(([cat, amt]) => {
                const w = Math.max(0.5, (100 * amt) / maxCat);
                return (<div key={cat} className="bar" data-tip={`${cat}: ${fmt$$(amt)}`}>
                <span className="bl">{cat}</span>
                <div className="bt">
                  <div className="bf" style={{ width: `${w.toFixed(1)}%` }}/>
                </div>
                <span className="bv"><Amt>{fmt$$(amt)}</Amt></span>
              </div>);
            })}
        </>)}

      {trip.top_merchants.length > 0 && (<div className="mini-cards" style={{ marginTop: 14 }}>
          {trip.top_merchants.map((m) => (<div key={m.payee} className="mini-card">
              <div className="mini-card-top">
                <span className="mini-card-name">{m.payee}</span>
              </div>
              <div className="mini-card-amt"><Amt>{fmt$$(m.total)}</Amt></div>
            </div>))}
        </div>)}

      <p className="fn" style={{ marginTop: 10 }}>
        {pct(trip.new_merchant_share * 100)} of this window&apos;s spend was at merchants never
        seen before it started.
      </p>
    </section>);
}
export default async function TripsPage() {
    const snapshot = await getSnapshot();
    if (!snapshot)
        return <EmptyState />;
    const trips = snapshot.trips ?? [];
    return (<>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-kicker">Trips · detected, not guessed</div>
          <div className="page-title">
            {trips.length ? `${trips.length} trip${trips.length === 1 ? "" : "s"} detected.` : "No trips detected yet."}
          </div>
          <div className="page-sub">
            A trip is a run of days where spending is dominated by merchants never seen
            before that window. Named by anchor merchant and dates — never a city, since
            the data has no geo field to confirm one.
          </div>
        </div>
      </div>

      {trips.length === 0 ? (<section className="empty">
          <h2>No trips in this window</h2>
          <p className="fn">
            No trip analysis was included in the imported snapshot.
          </p>
        </section>) : (trips.map((t) => <TripCard key={t.id} trip={t}/>))}
    </>);
}
