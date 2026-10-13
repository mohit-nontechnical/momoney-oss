import { getSnapshot } from "@/lib/data";
import { fmt$ } from "@/lib/format";
import { pct } from "@/lib/format";
import { Amt } from "@/components/Amt";
import EmptyState from "@/components/EmptyState";
export const dynamic = "force-dynamic";
export default async function IncomePage() {
    const snapshot = await getSnapshot();
    if (!snapshot)
        return <EmptyState />;
    const s = snapshot;
    const pace = s.income_goal_monthly > 0 ? (100 * s.income_this_month) / s.income_goal_monthly : 0;
    return (<>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-kicker">Income · goal #1</div>
          <div className="page-title">The only page that gets you to {s.goal.label}.</div>
          <div className="page-sub">
            Tracked income this month: <strong style={{ color: "var(--ink)" }}><Amt>{fmt$(s.income_this_month)}</Amt></strong>{" "}
            against the <Amt>{fmt$(s.income_goal_monthly)}</Amt>/mo milestone pace.
          </div>
        </div>
      </div>

      <section>
        <h2>Pace</h2>
        <div className="meter">
          <div className={`mfill${pace < 25 ? " rust" : ""}`} style={{ width: `${Math.min(100, pace).toFixed(1)}%` }}/>
        </div>
        <p className="fn">
          <Amt>{fmt$(s.income_this_month)}</Amt> · {pct(pace, 1)} of pace — <Amt>{fmt$(s.income_goal_monthly)}</Amt>/mo is the
          $1M-year milestone, not the operating target.
        </p>
      </section>

      <div className="callout rust">
        <div className="callout-title">Your income is undercounted</div>
        <div className="callout-body">
          Income totals only reflect the imported transactions classified as income. Include every income-receiving account and check categories and signs in your CSV.
        </div>
        <div className="callout-step">First step: confirm the import includes all income.</div>
      </div>

      <div className="callout">
        <div className="callout-title">What unlocks the per-stream breakdown</div>
        <div className="callout-body">
          Per-stream income needs additional snapshot fields from your own data adapter. The CSV importer supplies monthly totals. No payment-provider integration is included.
        </div>
      </div>
    </>);
}
