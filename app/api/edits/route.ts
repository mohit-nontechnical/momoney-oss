import { NextRequest, NextResponse } from "next/server";
import { getCustomization, saveCustomRecord } from "@/lib/data";
import { txnFingerprint, type Annotation } from "@/lib/customization";
export const dynamic = "force-dynamic";
const authorized = (r: NextRequest) => Boolean(process.env.INGEST_SECRET) &&
    r.headers.get("x-ingest-secret") === process.env.INGEST_SECRET;
export async function GET(req: NextRequest) {
    if (!authorized(req))
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const c = await getCustomization(), latest = new Map<string, Annotation>();
    for (const a of Object.values(c.annotations)) {
        const key = txnFingerprint(a.transaction), old = latest.get(key);
        if (!old || old.updated_at < a.updated_at)
            latest.set(key, a);
    }
    return NextResponse.json({
        edits: [...latest.values()].filter((a) => a.ledger_status === "pending"),
        rules: c.rules,
    }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: NextRequest) {
    if (!authorized(req))
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    let b;
    try {
        b = await req.json();
    }
    catch {
        return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }
    const c = await getCustomization(), a = c.annotations[b.key];
    if (!a || a.updated_at !== b.updated_at)
        return NextResponse.json({ error: "revision changed" }, { status: 409 });
    if (!["applied", "review"].includes(b.status))
        return NextResponse.json({ error: "invalid status" }, { status: 400 });
    await saveCustomRecord("receipt", b.key, {
        updated_at: b.updated_at,
        status: b.status,
        note: String(b.note || "").slice(0, 160),
    });
    return NextResponse.json({ ok: true });
}
