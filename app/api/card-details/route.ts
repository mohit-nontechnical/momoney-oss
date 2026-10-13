import { NextRequest, NextResponse } from "next/server";
import { getCustomization, getRawSnapshot, saveCustomRecord } from "@/lib/data";
import { validateCardDetails } from "@/lib/card-details";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
let writes = Promise.resolve();
export async function POST(req: NextRequest) {
    if (req.headers.get("origin") &&
        new URL(req.headers.get("origin")!).host !== req.headers.get("host"))
        return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403, headers });
    let body: any;
    try {
        body = await req.json();
    }
    catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400, headers });
    }
    let response: NextResponse = NextResponse.json({ error: "Save failed." }, { status: 500, headers });
    const op = writes.then(async () => {
        try {
            const [s, c] = await Promise.all([getRawSnapshot(), getCustomization()]);
            if (!s?.cards?.some((x) => x.name === body.name))
                throw Error("Card not found.");
            const valid = validateCardDetails(body.details), previous = c.card_details?.[body.name];
            if (body.expected_updated_at !== (previous?.updated_at ?? null)) {
                response = NextResponse.json({ error: "These details changed. Refresh before saving." }, { status: 409, headers });
                return;
            }
            const details = { ...valid, updated_at: new Date().toISOString() };
            await saveCustomRecord("card", body.name, details);
            response = NextResponse.json({ details }, { headers });
        }
        catch (e) {
            response = NextResponse.json({ error: e instanceof Error ? e.message : "Save failed." }, { status: 400, headers });
        }
    });
    writes = op.then(() => { }, () => { });
    await op;
    return response;
}
