export interface CardDetails {
    due_date: string | null;
    minimum: number | null;
    autopay: "unknown" | "on" | "off";
    limit: number | null;
    fee_month: number | null;
    updated_at: string;
}
export function validateCardDetails(raw: unknown): Omit<CardDetails, "updated_at"> {
    if (!raw || typeof raw !== "object")
        throw Error("Enter your card details.");
    const b = raw as Record<string, unknown>;
    if (!["unknown", "on", "off"].includes(String(b.autopay)))
        throw Error("Choose an autopay status.");
    const date = b.due_date;
    if (date !== null &&
        (typeof date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            !Number.isFinite(Date.parse(date)) ||
            new Date(date).toISOString().slice(0, 10) !== date))
        throw Error("Choose a valid due date.");
    for (const key of ["minimum", "limit"]) {
        const n = b[key];
        if (n !== null &&
            (typeof n !== "number" ||
                !Number.isFinite(n) ||
                n < 0 ||
                n > 100000000 ||
                Math.abs(n * 100 - Math.round(n * 100)) > 0.00001 ||
                (key === "limit" && n === 0)))
            throw Error("Enter valid dollar amounts; a credit limit must be positive.");
    }
    if (b.fee_month !== null &&
        (typeof b.fee_month !== "number" ||
            !Number.isInteger(b.fee_month) ||
            b.fee_month < 1 ||
            b.fee_month > 12))
        throw Error("Choose a renewal month.");
    return {
        due_date: date as string | null,
        minimum: b.minimum as number | null,
        limit: b.limit as number | null,
        autopay: b.autopay as CardDetails["autopay"],
        fee_month: b.fee_month as number | null,
    };
}
