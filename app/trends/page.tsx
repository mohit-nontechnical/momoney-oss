import { getHistory, getSnapshot } from "@/lib/data";
import GlideChart from "@/components/GlideChart";
import IncomeVsBurn from "@/components/IncomeVsBurn";
import CategoryTrend from "@/components/CategoryTrend";
import BudgetBars from "@/components/BudgetBars";
import OutliersList from "@/components/OutliersList";
import EmptyState from "@/components/EmptyState";
import TagTrends from '@/components/TagTrends';
export const dynamic = "force-dynamic";
export default async function TrendsPage() {
    const [snapshot, history] = await Promise.all([getSnapshot(), getHistory()]);
    if (!snapshot) {
        return <EmptyState />;
    }
    const s = snapshot;
    return (<>
      <div className="meta" style={{ marginBottom: 10 }}>
        {s.generated_at.slice(0, 16).replace("T", " ")} · trends
      </div>

      <section>
        <h2>Net worth history</h2>
        <GlideChart snapshot={s} history={history}/>
      </section>

      <IncomeVsBurn snapshot={s} months={s.months}/>

      <CategoryTrend snapshot={s}/>
      <TagTrends transactions={s.transactions_90d || []}/>

      <OutliersList outliers={s.outliers}/>

      <BudgetBars budgets={s.budgets}/>
    </>);
}
