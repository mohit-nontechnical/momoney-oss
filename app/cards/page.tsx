import { getSnapshot } from "@/lib/data";
import EmptyState from "@/components/EmptyState";
import CardsClient from "@/components/CardsClient";
export const dynamic = "force-dynamic";
export default async function Page() {
    const s = await getSnapshot();
    return s ? <CardsClient snapshot={s}/> : <EmptyState />;
}
