import { fmt$, compact } from "@/lib/format";
import { Amt, AmtText } from "@/components/Amt";
import type { Forecast } from "@/lib/types";
export default function ForecastChart({ forecast }: {
    forecast?: Forecast;
}) {
    if (!forecast || !forecast.daily.length) {
        return (<section className="empty">
        <h2>Cash forecast</h2>
        <p className="fn">
          No cash forecast was included in the imported snapshot.
        </p>
      </section>);
    }
    const { daily, min_balance, min_date, below_threshold_date, threshold, assumptions } = forecast;
    const W = 920;
    const H = 220;
    const P = { l: 56, r: 20, t: 18, b: 28 };
    const values = daily.map((d) => d.projected);
    const yMax = Math.max(...values, forecast.starting_liquid, threshold) * 1.08;
    const yMin = Math.min(0, ...values) * 1.08;
    const t0 = +new Date(daily[0].date);
    const t1 = +new Date(daily[daily.length - 1].date);
    const x = (t: number) => P.l + ((W - P.l - P.r) * (t - t0)) / Math.max(1, t1 - t0);
    const y = (v: number) => H - P.b - ((H - P.t - P.b) * (v - yMin)) / Math.max(1, yMax - yMin);
    const line = daily.map((d) => `${x(+new Date(d.date)).toFixed(1)},${y(d.projected).toFixed(1)}`).join(" ");
    const gridCandidates = Array.from(new Set([0, threshold, forecast.starting_liquid])).sort((a, b) => a - b);
    const gridLines = gridCandidates.filter((v, i) => i === 0 || (y(gridCandidates[i - 1]) - y(v)) / (H - P.t - P.b) > 0.08);
    const belowThreshold = min_balance < threshold;
    const minX = x(+new Date(min_date));
    const minY = y(min_balance);
    return (<section>
      <h2>Cash forecast · next {forecast.horizon_days} days</h2>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Projected liquid balance over the next ${forecast.horizon_days} days`}>
        {gridLines.map((v) => (<g key={v}>
            <line x1={P.l} y1={y(v)} x2={W - P.r} y2={y(v)} className="grid"/>
            <text x={P.l - 8} y={y(v) + 4} className="ax amt-svg" textAnchor="end">
              {compact(v)}
            </text>
          </g>))}
        <line x1={P.l} y1={y(threshold)} x2={W - P.r} y2={y(threshold)} className="glide"/>
        {line && <polyline points={line} className="nwline"/>}
        <circle cx={minX.toFixed(1)} cy={minY.toFixed(1)} r={4} className={`nwdot ring${belowThreshold ? " rust" : ""}`}/>
      </svg>

      <div className={`callout${belowThreshold ? " rust" : ""}`}>
        <div className="callout-title">
          Low point: <Amt>{fmt$(min_balance)}</Amt> on {min_date}
        </div>
        <div className="callout-body">
          <AmtText>
            {below_threshold_date
            ? `Projected to drop below your ${fmt$(threshold)} buffer on ${below_threshold_date}.`
            : `Stays above the ${fmt$(threshold)} buffer through the full ${forecast.horizon_days}-day window.`}
          </AmtText>
        </div>
      </div>

      <p className="fn" style={{ marginTop: 4, marginBottom: 4 }}>
        Assumptions behind this projection:
      </p>
      <ul style={{ margin: "0 0 4px", paddingLeft: 20 }}>
        {assumptions.map((a, i) => (<li key={i} className="fn" style={{ margin: "4px 0" }}>
            <AmtText>{a}</AmtText>
          </li>))}
      </ul>
    </section>);
}
