import { getSnapshot } from "@/lib/data";
import EmptyState from "@/components/EmptyState";
import BudgetsClient from "@/components/BudgetsClient";
export const dynamic = "force-dynamic";
export default async function Page() {
    const s = await getSnapshot();
    return s ? <BudgetsClient snapshot={s}/> : <EmptyState />;
}
