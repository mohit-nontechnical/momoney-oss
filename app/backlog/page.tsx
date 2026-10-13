import { getTasks } from "@/lib/data";
import BacklogClient from "@/components/BacklogClient";
export const dynamic = "force-dynamic";
export default async function BacklogPage() {
    const tasks = await getTasks();
    return <BacklogClient initialTasks={tasks}/>;
}
