import { compact, fmt$$ } from "@/lib/format";
import type { Snapshot } from "@/lib/types";
function roundedCol(x: number, y: number, w: number, h: number): string {
    const r = Math.min(4, w / 2, h);
    if (h <= 0)
        return `M ${x} ${y + h} h ${w} v 0 h ${-w} Z`;
    return `M ${x} ${y + h} v ${-(h - r)} q 0 ${-r} ${r} ${-r} h ${w - 2 * r} q ${r} 0 ${r} ${r} v ${h - r} Z`;
}
export default function IncomeVsBurn({ snapshot: s, months, }: {
    snapshot: Snapshot;
    months?: string[];
}) {
    const ms = months ?? s.months.slice(-4);
    const W = 920;
    const H = 240;
    const P = { l: 56, r: 16, t: 16, b: 30 };
    const max = Math.max(...ms.flatMap((m) => [s.by_month[m].income, s.by_month[m].burn]), s.income_goal_monthly * 0.05) * 1.15 || 1;
    const y = (v: number) => H - P.b - ((H - P.t - P.b) * v) / max;
    const band = (W - P.l - P.r) / ms.length;
    const bw = Math.min(24, band * 0.22);
    const gridLines = [0, max / 2, max];
    return (<section>
      <h2>Income vs burn</h2>
      <div className="legend">
        <span>
          <i className="sw c1bg"/>
          Income
        </span>
        <span>
          <i className="sw c2bg"/>
          Burn
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Income versus burn by month">
        {gridLines.map((v) => (<g key={v}>
            <line x1={P.l} y1={y(v)} x2={W - P.r} y2={y(v)} className="grid"/>
            <text x={P.l - 8} y={y(v) + 4} className="ax amt-svg" textAnchor="end">
              {compact(Math.round(v))}
            </text>
          </g>))}
        {ms.map((m, i) => {
            const cx = P.l + band * (i + 0.5);
            const inc = s.by_month[m].income;
            const burn = s.by_month[m].burn;
            const isLast = i === ms.length - 1;
            return (<g key={m}>
              <path d={roundedCol(cx - bw - 1, y(inc), bw, H - P.b - y(inc))} className="c1" data-tip={`${m} income: ${fmt$$(inc)}`}/>
              <path d={roundedCol(cx + 1, y(burn), bw, H - P.b - y(burn))} className="c2" data-tip={`${m} burn: ${fmt$$(burn)}`}/>
              <text x={cx} y={H - 10} className="ax" textAnchor="middle">
                {m}
              </text>
              {isLast && (<>
                  <text x={cx - bw / 2 - 1} y={y(inc) - 6} className="vlbl amt-svg" textAnchor="middle">
                    {compact(inc)}
                  </text>
                  <text x={cx + bw / 2 + 1} y={y(burn) - 6} className="vlbl amt-svg" textAnchor="middle">
                    {compact(burn)}
                  </text>
                </>)}
            </g>);
        })}
      </svg>
    </section>);
}
