"use client";
import { useState } from "react";
import { CATEGORIES, txnKey, txnFingerprint, type Customization, type Split, } from "@/lib/customization";
import type { Txn } from "@/lib/types";
import useDialog from "./useDialog";
export default function TransactionEditor({ transaction: t, customization: c, onClose, onSaved, }: {
    transaction: Txn;
    customization: Customization;
    onClose: () => void;
    onSaved: () => void;
}) {
    const a = c.annotations[txnKey(t)] || c.annotations[txnFingerprint(t)];
    const dialog = useDialog(true, onClose);
    const [category, setCategory] = useState(a?.category || t.category || "Groceries"), [tags, setTags] = useState((a?.tags || []).join(", ")), [remember, setRemember] = useState(false), [splits, setSplits] = useState<Split[]>(a?.splits || []), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const total = splits.reduce((s, p) => s + Number(p.amount || 0), 0), remaining = Math.round((Math.abs(t.amount) - total) * 100) / 100;
    async function save() {
        setBusy(true);
        setError("");
        try {
            const r = await fetch("/api/customization", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    action: "transaction",
                    key: txnKey(t),
                    category,
                    tags: tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    splits,
                    remember,
                    expected_updated_at: a?.updated_at ?? null,
                }),
            });
            const b = await r.json();
            if (!r.ok)
                throw new Error(b.error);
            onSaved();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Could not save.");
        }
        finally {
            setBusy(false);
        }
    }
    const options = CATEGORIES.filter((c) => t.amount >= 0 ||
        c === t.category ||
        ![
            "Income",
            "Business Income",
            "Rewards & Interest",
            "Credit Card Payments",
        ].includes(c));
    return (<div className="money-modal-backdrop">
      <section ref={dialog} className="money-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <button className="money-modal-close" onClick={onClose} aria-label="Close transaction editor">
          ×
        </button>
        <h2 id="edit-title">{t.payee}</h2>
        <p className="amt-block">
          {t.date} · {t.account} · ${Math.abs(t.amount).toFixed(2)}
        </p>
        <label>
          Category
          <select disabled={t.category === "Credit Card Payments"} value={category} onChange={(e) => setCategory(e.target.value)}>
            {options.map((c) => (<option key={c}>{c}</option>))}
          </select>
        </label>
        <label>
          Tags
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="NYC trip, work, recurring"/>
        </label>
        <p className="fn">
          Separate tags with commas. Tags group purchases across categories.
        </p>
        {t.amount < 0 && t.category !== "Credit Card Payments" && (<div className="split-editor">
            <button type="button" onClick={() => setSplits((s) => s.length
                ? []
                : [
                    { category, amount: 0 },
                    { category, amount: 0 },
                ])}>
              {splits.length ? "Remove split" : "Split this purchase"}
            </button>
            {splits.map((p, i) => (<div className="split-row" key={i}>
                <select aria-label={`Split ${i + 1} category`} value={p.category} onChange={(e) => setSplits((s) => s.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}>
                  {options.map((c) => (<option key={c}>{c}</option>))}
                </select>
                <input aria-label={`Split ${i + 1} amount`} type="number" step="0.01" min="0.01" value={p.amount || ""} onChange={(e) => setSplits((s) => s.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))}/>
              </div>))}
            {!!splits.length && (<>
                <p className="amt-block">
                  ${remaining.toFixed(2)} left to allocate
                </p>
                <button type="button" onClick={() => setSplits((s) => [...s, { category, amount: 0 }])}>
                  Add another part
                </button>
              </>)}
          </div>)}
        {!splits.length && (<label className="check-row">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}/>
            Use this category for this merchant going forward
          </label>)}
        {error && (<p role="alert" className="ask-error">
            {error}
          </p>)}
        <div className="money-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={busy ||
            (!!splits.length &&
                (remaining !== 0 || splits.some((p) => p.amount <= 0)))} onClick={save}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>
    </div>);
}
