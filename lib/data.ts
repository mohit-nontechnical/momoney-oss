import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { applyCustomization, EMPTY_CUSTOMIZATION, type Customization, } from "./customization";
import type { Analysis, History, IngestBody, Receipts, Snapshot, TaskState, TasksFile, } from "./types";
const FIXTURES_DIR = path.resolve(process.env.MOMONEY_DATA_DIR || path.join(process.cwd(), ".data"));
function hasBlob(): boolean {
    return !!process.env.BLOB_READ_WRITE_TOKEN;
}
function blobPrefix(): string {
    const p = process.env.BLOB_PREFIX;
    if (!p) {
        throw new Error("BLOB_PREFIX env var is required when BLOB_READ_WRITE_TOKEN is set (use a long random string)");
    }
    return p.replace(/\/+$/, "");
}
async function readFixture<T>(name: string): Promise<T | null> {
    try {
        const raw = await fs.readFile(path.join(FIXTURES_DIR, name), "utf8");
        return JSON.parse(raw) as T;
    }
    catch {
        return null;
    }
}
async function writeFixture(name: string, data: unknown): Promise<void> {
    await fs.mkdir(FIXTURES_DIR, { recursive: true });
    await fs.writeFile(path.join(FIXTURES_DIR, name), JSON.stringify(data, null, 2) + "\n", "utf8");
}
async function readBlobJson<T>(filename: string): Promise<T | null> {
    const { get } = await import("@vercel/blob");
    const pathname = `${blobPrefix()}/${filename}`;
    try {
        const res = await get(pathname, {
            access: "private",
            useCache: false,
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        if (!res || res.statusCode !== 200 || !res.stream)
            return null;
        const text = await new Response(res.stream as ReadableStream).text();
        return JSON.parse(text) as T;
    }
    catch {
        return null;
    }
}
async function writeBlobJson(filename: string, data: unknown): Promise<void> {
    const { put } = await import("@vercel/blob");
    const pathname = `${blobPrefix()}/${filename}`;
    await put(pathname, JSON.stringify(data, null, 2), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
    });
}
export async function getSnapshot(): Promise<Snapshot | null> {
    const snapshot: Snapshot | null = hasBlob()
        ? await readBlobJson<Snapshot>("snapshot.json")
        : await readFixture<Snapshot>("snapshot.json");
    if (!snapshot)
        return null;
    const custom = await getCustomization();
    const result = applyCustomization(snapshot, custom);
    result.cards = result.cards?.map((card) => {
        const saved = custom.card_details?.[card.name];
        return saved
            ? {
                ...card,
                fee_month: saved.fee_month == null ? null : String(saved.fee_month),
            }
            : card;
    });
    return result;
}
export async function getRawSnapshot(): Promise<Snapshot | null> {
    return hasBlob()
        ? readBlobJson<Snapshot>("snapshot.json")
        : readFixture<Snapshot>("snapshot.json");
}
export async function saveCustomRecord(kind: "annotation" | "rule" | "goal" | "meta" | "receipt" | "card", key: string, value: unknown) {
    const filename = `customization/${kind}-${createHash("sha256").update(key).digest("hex")}.json`;
    if (hasBlob())
        await writeBlobJson(filename, { kind, key, value });
    else {
        await fs.mkdir(path.join(FIXTURES_DIR, "customization"), {
            recursive: true,
        });
        await writeFixture(filename, { kind, key, value });
    }
}
export async function getCustomization(): Promise<Customization> {
    const c = structuredClone(EMPTY_CUSTOMIZATION);
    const records: {
        kind: string;
        key: string;
        value: any;
    }[] = [];
    if (hasBlob()) {
        const { list } = await import("@vercel/blob");
        let cursor: string | undefined;
        do {
            const page = await list({
                prefix: `${blobPrefix()}/customization/`,
                cursor,
                token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            const values = await Promise.all(page.blobs.map((b) => readBlobJson<{
                kind: string;
                key: string;
                value: any;
            }>(b.pathname.slice(blobPrefix().length + 1))));
            for (const value of values)
                if (value)
                    records.push(value);
            cursor = page.hasMore ? page.cursor : undefined;
        } while (cursor);
    }
    else {
        let files: string[] = [];
        try {
            files = await fs.readdir(path.join(FIXTURES_DIR, "customization"));
        }
        catch { }
        const values = await Promise.all(files.map((file) => readFixture<{
            kind: string;
            key: string;
            value: any;
        }>(`customization/${file}`)));
        for (const value of values)
            if (value)
                records.push(value);
    }
    for (const r of records) {
        if (r.kind === "card") {
            (c.card_details ||= {})[r.key] = r.value;
        }
        else if (r.kind === "annotation")
            c.annotations[r.key] = r.value;
        else if (r.kind === "rule")
            c.rules.push(r.value);
        else if (r.kind === "goal" && r.value)
            c.goals.push(r.value);
        else if (r.kind === "meta")
            c.goals_configured = true;
    }
    for (const r of records) {
        if (r.kind === "receipt") {
            const a = c.annotations[r.key];
            if (a && a.updated_at === r.value.updated_at) {
                a.ledger_status = r.value.status;
                a.ledger_note = r.value.note;
            }
        }
    }
    return c;
}
export async function getHistory(): Promise<History> {
    const h = hasBlob()
        ? await readBlobJson<History>("history.json")
        : await readFixture<History>("history.json");
    return h ?? [];
}
export async function getAnalysis(): Promise<Analysis | null> {
    return hasBlob()
        ? readBlobJson<Analysis>("analysis.json")
        : readFixture<Analysis>("analysis.json");
}
export async function getReceipts(): Promise<Receipts | null> {
    return hasBlob()
        ? readBlobJson<Receipts>("receipts.json")
        : readFixture<Receipts>("receipts.json");
}
export async function getTasks(): Promise<TasksFile> {
    const t = hasBlob()
        ? await readBlobJson<TasksFile>("tasks.json")
        : await readFixture<TasksFile>("tasks.json");
    return t ?? [];
}
export async function setTaskStatus(id: string, status: TaskState["status"]): Promise<TaskState | null> {
    const tasks = await getTasks();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1)
        return null;
    tasks[idx] = { ...tasks[idx], status, updated_at: new Date().toISOString() };
    if (hasBlob()) {
        await writeBlobJson("tasks.json", tasks);
    }
    else {
        await writeFixture("tasks.json", tasks);
    }
    return tasks[idx];
}
export interface IngestResult {
    added: number;
    updated: number;
    total: number;
}
export async function ingest(body: IngestBody): Promise<IngestResult> {
    const { snapshot, history, analysis, receipts } = body;
    const existing = await getTasks();
    const now = new Date().toISOString();
    const byId = new Map<string, TaskState>(existing.map((t) => [t.id, t]));
    let added = 0;
    let updated = 0;
    for (const t of analysis.tasks ?? []) {
        const cur = byId.get(t.id);
        if (cur) {
            byId.set(t.id, {
                ...cur,
                title: t.title,
                impact_annual: t.impact_annual,
                category: t.category,
                how: t.how,
                delegate: t.delegate,
                updated_at: now,
            });
            updated++;
        }
        else {
            byId.set(t.id, {
                ...t,
                status: "todo",
                created_at: now,
                updated_at: now,
            });
            added++;
        }
    }
    const merged = Array.from(byId.values());
    if (hasBlob()) {
        await Promise.all([
            writeBlobJson("snapshot.json", snapshot),
            writeBlobJson("history.json", history),
            writeBlobJson("analysis.json", analysis),
            writeBlobJson("tasks.json", merged),
            ...(receipts ? [writeBlobJson("receipts.json", receipts)] : []),
        ]);
    }
    else {
        await Promise.all([
            writeFixture("snapshot.json", snapshot),
            writeFixture("history.json", history),
            writeFixture("analysis.json", analysis),
            writeFixture("tasks.json", merged),
            ...(receipts ? [writeFixture("receipts.json", receipts)] : []),
        ]);
    }
    return { added, updated, total: merged.length };
}
