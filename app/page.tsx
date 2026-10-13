import { getSnapshot, getAnalysis } from "@/lib/data";
import EmptyState from "@/components/EmptyState";
import Overview from "@/components/Overview";
export const dynamic = "force-dynamic";
export default async function Page() {
    const [s, a] = await Promise.all([getSnapshot(), getAnalysis()]);
    return s ? <Overview snapshot={s} analysis={a}/> : <EmptyState />;
}
