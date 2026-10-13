import { getSnapshot, getCustomization } from "@/lib/data";
import { listedGoals } from "@/lib/customization";
import GoalsClient from "@/components/GoalsClient";
import EmptyState from "@/components/EmptyState";
export const dynamic = "force-dynamic";
export default async function GoalsPage() {
    const [s, c] = await Promise.all([getSnapshot(), getCustomization()]);
    if (!s)
        return <EmptyState />;
    return (<>
      <div className="page-head">
        <div className="page-title">Your goals.</div>
        <p className="fn">Balances updated {s.generated_at.slice(0, 10)}</p>
      </div>
      <GoalsClient snapshot={s} goals={listedGoals(c, s)}/>
    </>);
}
