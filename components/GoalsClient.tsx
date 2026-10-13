"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cardDebt, goalProgress, type MoneyGoal } from "@/lib/customization";
import type { Snapshot } from "@/lib/types";
import { Amt } from "./Amt";
import { fmt$$ } from "@/lib/format";
import useDialog from "./useDialog";
export default function GoalsClient({ goals, snapshot: s, }: {
    goals: MoneyGoal[];
    snapshot: Snapshot;
}) {
    const router = useRouter(), [editing, setEditing] = useState<MoneyGoal | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const dialog = useDialog(Boolean(editing), () => setEditing(null));
    const templates = [
        { name: "Cash cushion", source: "liquid" as const },
        { name: "Pay off cards", source: "debt" as const },
        { name: "Travel savings", source: "manual" as const },
    ];
    function create(name = "New goal", source: MoneyGoal["source"] = "manual") {
        const debt = cardDebt(s);
        setEditing({
            id: crypto.randomUUID(),
            name,
            source,
            target: source === "debt" ? debt : 0,
            current: 0,
            baseline: source === "debt" ? debt : 0,
            deadline: "",
            tag: "",
            updated_at: "",
        });
        setError("");
    }
    async function save() {
        if (!editing)
            return;
        setBusy(true);
        setError("");
        try {
            const r = await fetch("/api/customization", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action: "goal", goal: editing }),
            });
            const b = await r.json();
            if (!r.ok)
                throw new Error(b.error);
            setEditing(null);
            router.refresh();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Could not save.");
        }
        finally {
            setBusy(false);
        }
    }
    async function remove(id: string) {
        setBusy(true);
        try {
            const r = await fetch("/api/customization", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action: "remove_goal", id }),
            });
            if (!r.ok)
                throw new Error("Could not remove goal.");
            router.refresh();
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setBusy(false);
        }
    }
    return (<>
      <div className="goal-intro">
        <p>Put a deadline next to the things you want your money to do.</p>
        <button className="btn" onClick={() => create()}>
          Add goal
        </button>
      </div>
      <div className="goal-grid">
        {goals.map((g) => {
            const p = goalProgress(g, s), tagged = (s.transactions_90d || [])
                .filter((t) => t.tags?.includes(g.tag) &&
                t.amount < 0 &&
                !["Credit Card Payments", "Starting Balances"].includes(t.category || ""))
                .reduce((sum, t) => sum - t.amount, 0);
            return (<section className="goal-card" key={g.id}>
              <div className="goal-card-head">
                <h2>{g.name}</h2>
                {g.id === "net-worth" ? (<Link href="/networth">View net worth</Link>) : (<button onClick={() => {
                        setEditing(g);
                        setError("");
                    }}>
                    Edit
                  </button>)}
              </div>
              {p.available ? (<>
                  <div className="goal-amount">
                    <Amt>{fmt$$(p.current)}</Amt>
                    <span>
                      {" "}
                      of <Amt>{fmt$$(p.target)}</Amt>
                    </span>
                  </div>
                  <progress value={p.percent} max={100} aria-label={`${g.name} progress`}/>
                  <p>
                    {p.percent.toFixed(0)}%{" "}
                    {g.source === "debt" ? "paid off" : "of target"} · by{" "}
                    {g.deadline}
                  </p>
                  <p className="goal-monthly amt-block">
                    {p.remaining === 0
                        ? "Target reached"
                        : p.overdue
                            ? `${fmt$$(p.remaining)} remains after the deadline`
                            : p.monthly === null
                                ? `${fmt$$(p.remaining)} remains; due today`
                                : `${fmt$$(p.monthly)} per month needed`}
                  </p>
                </>) : (<p>
                  Card balances are unavailable. Refresh your accounts to
                  measure progress.
                </p>)}
              <p className="fn">
                {g.source === "manual"
                    ? "Progress you record"
                    : g.source === "debt"
                        ? "Based on connected card balances"
                        : g.source === "liquid"
                            ? "Based on tracked liquid cash"
                            : "Based on tracked net worth"}
              </p>
              {g.tag && (<p className="amt-block">
                  Tagged “{g.tag}”: {fmt$$(tagged)} spent in the visible
                  transaction window. This is spending, not savings progress.
                </p>)}
              {g.id !== "net-worth" && (<button className="goal-remove" disabled={busy} onClick={() => remove(g.id)}>
                  Remove goal
                </button>)}
            </section>);
        })}
      </div>
      <section>
        <h2>What else are you working toward?</h2>
        <div className="goal-templates">
          {templates
            .filter((t) => !goals.some((g) => g.name === t.name))
            .map((t) => (<button key={t.name} onClick={() => create(t.name, t.source)}>
                {t.name}
                <span>Set a target</span>
              </button>))}
        </div>
        <p className="fn">
          Goals track progress. They do not move or reserve money. Two goals
          linked to cash can refer to the same balance.
        </p>
      </section>
      {editing && (<div className="money-modal-backdrop">
          <section ref={dialog} className="money-modal" role="dialog" aria-modal="true" aria-labelledby="goal-title">
            <button className="money-modal-close" onClick={() => setEditing(null)} aria-label="Close goal editor">
              ×
            </button>
            <h2 id="goal-title">
              {editing.updated_at ? "Edit goal" : "Create goal"}
            </h2>
            <label>
              Name
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}/>
            </label>
            <label>
              Track progress using
              <select value={editing.source} onChange={(e) => {
                const source = e.target.value as MoneyGoal["source"];
                setEditing({
                    ...editing,
                    source,
                    baseline: source === "debt" ? cardDebt(s) : 0,
                    target: source === "debt" ? cardDebt(s) : editing.target,
                });
            }}>
                <option value="manual">Savings I record</option>
                <option value="liquid">Tracked liquid cash</option>
                <option value="net_worth">Tracked net worth</option>
                <option value="debt">Connected card debt paid off</option>
              </select>
            </label>
            {editing.source !== "debt" && (<label>
                Target amount
                <input type="number" min="0.01" step="0.01" value={editing.target || ""} onChange={(e) => setEditing({ ...editing, target: Number(e.target.value) })}/>
              </label>)}
            {editing.source === "manual" && (<label>
                Saved so far
                <input type="number" min="0" step="0.01" value={editing.current || ""} onChange={(e) => setEditing({ ...editing, current: Number(e.target.value) })}/>
              </label>)}
            <label>
              Deadline
              <input type="date" value={editing.deadline} onChange={(e) => setEditing({ ...editing, deadline: e.target.value })}/>
            </label>
            <label>
              Related spending tag (optional)
              <input value={editing.tag} onChange={(e) => setEditing({ ...editing, tag: e.target.value })} placeholder="NYC trip"/>
            </label>
            {error && (<p role="alert" className="ask-error">
                {error}
              </p>)}
            <div className="money-actions">
              <button onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn" disabled={busy} onClick={save}>
                {busy ? "Saving…" : "Save goal"}
              </button>
            </div>
          </section>
        </div>)}
      {error && !editing && <p role="alert">{error}</p>}
    </>);
}
