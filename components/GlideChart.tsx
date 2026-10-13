import { fmt$, compact } from "@/lib/format";
import type { History, Snapshot } from "@/lib/types";
export default function GlideChart({ snapshot: s, history: hist, }: {
    snapshot: Snapshot;
    history: History;
}) {
    const W = 920;
    const H = 280;
    const P = { l: 56, r: 20, t: 18, b: 34 };
    const t0 = +new Date(hist[0]?.date || s.generated_at);
    const t1 = +new Date(s.goal.target_date);
    const yMax = Math.max(1, s.goal.net_worth_target, s.net_worth, ...hist.map(h => h.net_worth)) * 1.06;
    const x = (t: number) => P.l + ((W - P.l - P.r) * (t - t0)) / (t1 - t0);
    const y = (v: number) => H - P.b - ((H - P.t - P.b) * v) / yMax;
    const gridLines = Array.from({ length: 5 }, (_, i) => (yMax / 1.06) * i / 4);
    const years: number[] = [];
    for (let yr = new Date(t0).getFullYear() + 1; yr <= new Date(t1).getFullYear(); yr++) {
        years.push(yr);
    }
    const startNW = hist[0]?.net_worth ?? s.net_worth;
    const pts = hist.map((h) => ({
        cx: x(+new Date(h.date)),
        cy: y(h.net_worth),
        ...h,
    }));
    const line = pts.map((p) => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(" ");
    const nowX = x(+new Date(s.generated_at));
    return (<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Net worth versus the glide path to ${s.goal.label}`}>
      {gridLines.map((v) => (<g key={v}>
          <line x1={P.l} y1={y(v)} x2={W - P.r} y2={y(v)} className="grid"/>
          <text x={P.l - 8} y={y(v) + 4} className="ax amt-svg" textAnchor="end">
            {compact(v)}
          </text>
        </g>))}
      {years.map((yr) => {
            const tx = x(+new Date(`${yr}-01-01`));
            if (tx <= P.l + 10 || tx >= W - P.r - 10)
                return null;
            return (<text key={yr} x={tx} y={H - 10} className="ax" textAnchor="middle">
            {yr}
          </text>);
        })}
      <path d={`M ${x(t0)} ${y(startNW)} L ${x(t1)} ${y(s.goal.net_worth_target)}`} className="glide"/>
      <text x={W - P.r - 6} y={y(s.goal.net_worth_target) - 10} className="ax" textAnchor="end">
        glide path → <tspan className="amt-svg">{compact(s.goal.net_worth_target)}</tspan> · {s.goal.target_date.slice(0, 7)}
      </text>
      {line && <polyline points={line} className="nwline"/>}
      {pts.map((p, i) => (<circle key={i} cx={p.cx.toFixed(1)} cy={p.cy.toFixed(1)} r={4} className="nwdot ring" data-tip={`${p.date} · ${fmt$(p.net_worth)}`}/>))}
      <circle cx={nowX.toFixed(1)} cy={y(s.net_worth).toFixed(1)} r={5} className="nwdot ring" data-tip={`today · ${fmt$(s.net_worth)}`}/>
      <text x={Math.min(nowX + 10, W - 170)} y={Math.max(y(s.net_worth) - 12, 14)} className="lbl">
        <tspan className="amt-svg">{fmt$(s.net_worth)}</tspan> today
      </text>
    </svg>);
}
