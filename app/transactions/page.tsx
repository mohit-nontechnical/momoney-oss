import { getSnapshot } from "@/lib/data";
import EmptyState from "@/components/EmptyState";
import TransactionsClient from "@/components/TransactionsClient";
export const dynamic = "force-dynamic";
export default async function Page() {
    const s = await getSnapshot();
    return s ? <TransactionsClient snapshot={s}/> : <EmptyState />;
}
