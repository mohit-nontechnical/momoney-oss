import { getSnapshot } from "@/lib/data";
import { fmt$ } from "@/lib/format";
import { Amt } from "@/components/Amt";
import EmptyState from "@/components/EmptyState";
import ScenariosClient from "@/components/ScenariosClient";
export const dynamic = "force-dynamic";
export default async function ScenariosPage() {
    const snapshot = await getSnapshot();
    if (!snapshot)
        return <EmptyState />;
    const s = snapshot;
    return (<>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-kicker">
            Scenarios · <Amt>{fmt$(s.liquid)}</Amt> liquid · <Amt>{fmt$(s.avg_burn)}</Amt>/mo average burn
          </div>
          <div className="page-title">Pull a lever, watch the runway.</div>
          <div className="page-sub">
            Pure client-side math on your own numbers — nothing here is sent anywhere.
          </div>
        </div>
      </div>

      <section>
        <ScenariosClient snapshot={s}/>
      </section>

      <div className="callout">
        <div className="callout-title">The honest footnote</div>
        <div className="callout-body">
          Surviving isn&apos;t the goal — {s.goal.label} is. Even at zero burn, the glide path
          wants <strong><Amt>{fmt$(s.goal.required_monthly_gain)}</Amt>/mo</strong>. Cuts buy time; only the
          Income column gets you to the line.
        </div>
      </div>
    </>);
}
