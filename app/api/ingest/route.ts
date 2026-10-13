import { NextRequest, NextResponse } from "next/server";
import { ingest } from "@/lib/data";
import type { IngestBody } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
    const secret = process.env.INGEST_SECRET;
    const provided = req.headers.get("x-ingest-secret");
    if (!secret || provided !== secret) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    let body: IngestBody;
    try {
        body = (await req.json()) as IngestBody;
    }
    catch {
        return NextResponse.json({ error: "invalid json body" }, { status: 400 });
    }
    if (!body?.snapshot || !body?.history || !body?.analysis) {
        return NextResponse.json({ error: "body must include snapshot, history, and analysis" }, { status: 400 });
    }
    try {
        const result = await ingest(body);
        return NextResponse.json({ ok: true, ...result });
    }
    catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "ingest failed" }, { status: 500 });
    }
}
