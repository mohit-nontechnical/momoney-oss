"use client";
import { useState } from "react";
import type { CardDetails } from "@/lib/card-details";
import type { CardInfo } from "@/lib/types";
import useDialog from "./useDialog";
export default function CardDetailsEditor({ card, details, onClose, onSaved, }: {
    card: CardInfo;
    details?: CardDetails;
    onClose: () => void;
    onSaved: () => void;
}) {
    const ref = useDialog(true, onClose);
    const [due, setDue] = useState(details?.due_date || ""), [minimum, setMinimum] = useState(details?.minimum?.toString() || ""), [limit, setLimit] = useState(details?.limit?.toString() || ""), [autopay, setAutopay] = useState(details?.autopay || "unknown"), [month, setMonth] = useState(details ? details.fee_month?.toString() || "" : card.fee_month || ""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    async function save(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            const r = await fetch("/api/card-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: card.name,
                    expected_updated_at: details?.updated_at ?? null,
                    details: {
                        due_date: due || null,
                        minimum: minimum === "" ? null : Number(minimum),
                        limit: limit === "" ? null : Number(limit),
                        autopay,
                        fee_month: month === "" ? null : Number(month),
                    },
                }),
            });
            const b = await r.json();
            if (!r.ok)
                throw Error(b.error || "Could not save.");
            onSaved();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Could not save.");
        }
        finally {
            setBusy(false);
        }
    }
    return (<div className="money-modal-backdrop">
      <section ref={ref} className="money-modal" role="dialog" aria-modal="true" aria-labelledby="card-edit-title">
        <button className="money-modal-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2 id="card-edit-title">{card.name}</h2>
        <p>
          Record details from your statement. This does not make a payment or
          change autopay with your bank.
        </p>
        <form onSubmit={save}>
          <label>
            Next payment due
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)}/>
          </label>
          <label>
            Minimum payment ($)
            <input type="number" min="0" step="0.01" value={minimum} onChange={(e) => setMinimum(e.target.value)}/>
          </label>
          <label>
            Credit limit ($)
            <input type="number" min="0.01" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)}/>
          </label>
          <label>
            Autopay status
            <select value={autopay} onChange={(e) => setAutopay(e.target.value as CardDetails["autopay"])}>
              <option value="unknown">Not confirmed</option>
              <option value="on">On — confirmed with issuer</option>
              <option value="off">Off — confirmed with issuer</option>
            </select>
          </label>
          <label>
            Annual fee month
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">Unknown</option>
              {Array.from({ length: 12 }, (_, i) => (<option value={i + 1} key={i}>
                  {new Date(2026, i, 15).toLocaleString("en-US", {
                month: "long",
            })}
                </option>))}
            </select>
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="money-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn" disabled={busy}>
              {busy ? "Saving…" : "Save details"}
            </button>
          </div>
        </form>
      </section>
    </div>);
}
