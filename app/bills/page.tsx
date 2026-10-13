import { getSnapshot, getCustomization } from "@/lib/data";
import EmptyState from "@/components/EmptyState";
import BillsClient from "@/components/BillsClient";
export const dynamic = "force-dynamic";
export default async function Page() {
    const [s, c] = await Promise.all([getSnapshot(), getCustomization()]);
    return s ? (<BillsClient snapshot={s} details={c.card_details || {}}/>) : (<EmptyState />);
}
