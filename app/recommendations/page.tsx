import { getAnalysis, getReceipts, getSnapshot, getTasks } from "@/lib/data";
import { buildRecommendations } from "@/lib/recommendations";
import RecommendationsList from "@/components/RecommendationsList";
import EmptyState from "@/components/EmptyState";
export const dynamic = "force-dynamic";
export default async function RecommendationsPage() {
    const [snapshot, analysis, tasks, receipts] = await Promise.all([
        getSnapshot(),
        getAnalysis(),
        getTasks(),
        getReceipts(),
    ]);
    if (!snapshot)
        return <EmptyState />;
    const recommendations = buildRecommendations({ snapshot, analysis, tasks, receipts });
    return (<>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-kicker">Recommendations · what to actually do</div>
          <div className="page-title">One list, ranked by what it&apos;s worth.</div>
          <div className="page-sub">
            Pulled from the backlog, patterns, card verdicts, recurring charges, email
            receipts, venture costs, the categorization coverage guard, and the cash
            forecast — reconciled so nothing shows up twice. Read-only: nothing here writes
            back to your source financial records.
          </div>
        </div>
      </div>

      <RecommendationsList recommendations={recommendations}/>
    </>);
}
