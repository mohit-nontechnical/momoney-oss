import { NextRequest, NextResponse } from "next/server";
import { setTaskStatus } from "@/lib/data";
import type { TaskStatus } from "@/lib/types";
export const dynamic = "force-dynamic";
const VALID_STATUSES: TaskStatus[] = ["todo", "done", "dismissed"];
export async function POST(req: NextRequest) {
    let body: {
        id?: string;
        status?: string;
    };
    try {
        body = await req.json();
    }
    catch {
        return NextResponse.json({ error: "invalid json body" }, { status: 400 });
    }
    const { id, status } = body;
    if (!id || typeof id !== "string") {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (!status || !VALID_STATUSES.includes(status as TaskStatus)) {
        return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }
    const updated = await setTaskStatus(id, status as TaskStatus);
    if (!updated) {
        return NextResponse.json({ error: "task not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, task: updated });
}
