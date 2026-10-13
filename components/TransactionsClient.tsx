"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EMPTY_CUSTOMIZATION, txnKey, type Customization, } from "@/lib/customization";
import type { Snapshot, Txn } from "@/lib/types";
import TransactionEditor from "./TransactionEditor";
import { needsReview } from "@/lib/dashboard-metrics";
import { Money, Panel, PageHeading, Track } from "./Design";
export default function TransactionsClient({ snapshot: s, }: {
    snapshot: Snapshot;
}) {
    const txns = s.transactions_90d || [];
    const [visible, setVisible] = useState(80);
    const [search, setSearch] = useState(""), [category, setCategory] = useState("all"), [account, setAccount] = useState("all"), [from, setFrom] = useState(""), [to, setTo] = useState(""), [mode, setMode] = useState("All"), [tag, setTag] = useState("all"), [editing, setEditing] = useState<Txn | null>(null), [customization, setCustomization] = useState<Customization>(EMPTY_CUSTOMIZATION), [notice, setNotice] = useState(""), [ready, setReady] = useState(false);
    const router = useRouter();
    async function refresh() {
        try {
            const r = await fetch("/api/customization");
            if (!r.ok)
                throw Error();
            setCustomization(await r.json());
            setReady(true);
        }
        catch {
            setNotice("Saved edits could not be loaded. Refresh to try again.");
        }
    }
    useEffect(() => {
        refresh();
        if (new URLSearchParams(window.location.search).get("review") === "1")
            setMode("Needs fix");
    }, []);
    const review = (t: Txn) => needsReview(t, s.needs_review);
    const reviews = txns.filter(review);
    const filtered = useMemo(() => txns.filter((t) => (!search ||
        [t.payee, ...(t.tags || [])]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (category === "all" ||
            (t.category || "Uncategorized") === category) &&
        (account === "all" || t.account === account) &&
        (tag === "all" || t.tags?.includes(tag)) &&
        (!from || t.date >= from) &&
        (!to || t.date <= to) &&
        (mode === "All" ||
            (mode === "Needs fix"
                ? needsReview(t, s.needs_review)
                : mode === "Dining"
                    ? t.category === "Dining & Drinks"
                    : t.category === "Transport"))), [txns, search, category, account, tag, from, to, mode, s.needs_review]);
    const groups = Object.entries([...filtered]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, visible)
        .reduce<Record<string, Txn[]>>((a, t) => {
        (a[t.date] ||= []).push(t);
        return a;
    }, {}));
    const charges = Object.entries(txns
        .filter((t) => t.amount < 0 &&
        !["Credit Card Payments", "Starting Balances"].includes(t.category || ""))
        .reduce<Record<string, number>>((a, t) => {
        a[t.account] = (a[t.account] || 0) - t.amount;
        return a;
    }, {})).sort((a, b) => b[1] - a[1]);
    const total = charges.reduce((n, [, v]) => n + v, 0);
    function reset() {
        setVisible(80);
        setSearch("");
        setCategory("all");
        setAccount("all");
        setTag("all");
        setFrom("");
        setTo("");
        setMode("All");
    }
    return (<div className="rd">
      <PageHeading eyebrow={`Activity · ${txns.length} transactions · updated ${s.generated_at.slice(0, 10)}`} description="Search the available 90-day feed. Edits, tags and splits stay available from every transaction.">
        {reviews.length
            ? `${reviews.length} ${reviews.length === 1 ? "transaction needs" : "transactions need"} a closer look.`
            : "Your recent transactions, in order."}
      </PageHeading>
      {reviews.length > 0 && (<div className="rd-fix">
          <div>
            <strong>{reviews.length} {reviews.length === 1 ? "transaction needs" : "transactions need"} review</strong>
            <p>
              Uncategorized or flagged by the latest categorization review.
              Confirm the merchant before changing a category.
            </p>
          </div>
          <button onClick={() => {
                reset();
                setMode("Needs fix");
            }}>
            Review
          </button>
        </div>)}
      <div className="rd-activity-layout">
        <div>
          <div className="rd-filters">
            <label className="rd-search">
              <span className="sr-only">Search transactions</span>
              <input placeholder="Search transactions…" value={search} onChange={(e) => setSearch(e.target.value)}/>
            </label>
            <label>
              <span className="sr-only">Account</span>
              <select value={account} onChange={(e) => setAccount(e.target.value)}>
                <option value="all">All accounts</option>
                {Array.from(new Set(txns.map((t) => t.account)))
            .sort()
            .map((a) => (<option key={a}>{a}</option>))}
              </select>
            </label>
            <label>
              <span className="sr-only">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">All categories</option>
                {Array.from(new Set(txns.map((t) => t.category || "Uncategorized")))
            .sort()
            .map((c) => (<option key={c}>{c}</option>))}
              </select>
            </label>
            <label>
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}/>
            </label>
            <label>
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}/>
            </label>
            {txns.some((t) => t.tags?.length) && (<label>
                Tag
                <select value={tag} onChange={(e) => setTag(e.target.value)}>
                  <option value="all">All tags</option>
                  {Array.from(new Set(txns.flatMap((t) => t.tags || []))).map((t) => (<option key={t}>{t}</option>))}
                </select>
              </label>)}
          </div>
          <div className="rd-segments" aria-label="Activity filters">
            {["All", "Needs fix", "Dining", "Transport"].map((f) => (<button key={f} aria-pressed={mode === f} onClick={() => setMode(f)}>
                {f}
              </button>))}
            <button onClick={reset}>Reset filters</button>
          </div>
          {notice && <p role="status">{notice}</p>}
          {editing && (<TransactionEditor transaction={editing} customization={customization} onClose={() => setEditing(null)} onSaved={() => {
                setEditing(null);
                setNotice("Saved in MoMoney.");
                refresh();
                router.refresh();
            }}/>)}
          <Panel title={`${filtered.length} transactions`}>
            {groups.map(([date, rows]) => (<div key={date}>
                <h3 className="rd-day">
                  {new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
            })}
                </h3>
                {rows?.map((t, i) => (<div className="rd-txn" key={txnKey(t) + "-" + i}>
                    <div>
                      <strong>{t.payee}</strong>
                      <small>{t.account}</small>
                      {t.tags?.length ? (<div className="txn-tags">
                          {t.tags.map((tag) => (<span key={tag}>{tag}</span>))}
                        </div>) : null}
                    </div>
                    <span className={`rd-category ${review(t) ? "needs-fix" : ""}`}>
                      {t.splits?.length
                    ? `${t.splits.length} categories`
                    : t.category || "Uncategorized"}
                    </span>
                    <div className={t.amount < 0 ? "" : "good"}>
                      <Money value={t.amount} exact/>
                    </div>
                    <button className="rd-text-button" disabled={!ready || t.category === "Starting Balances"} onClick={() => setEditing(t)} aria-label={`Edit ${t.payee} on ${t.date}`}>
                      Edit
                    </button>
                  </div>))}
              </div>))}
            {!filtered.length && (<p>
                No transactions match these filters.{" "}
                <button className="rd-text-button" onClick={reset}>
                  Reset filters
                </button>
              </p>)}
            {filtered.length > visible && (<button className="rd-pill" onClick={() => setVisible((v) => v + 80)}>
                Show more transactions ({filtered.length - visible} remaining)
              </button>)}
          </Panel>
          <p className="rd-small">
            Category corrections, tags and splits are saved in this workspace. They do not change your bank records.
          </p>
        </div>
        <aside className="rd-activity-aside">
          <Panel title="Charges by account">
            {charges.map(([name, value]) => (<div key={name} className="rd-account-charge">
                <div className="rd-line">
                  <span>{name}</span>
                  <Money value={value}/>
                </div>
                <Track percent={total ? (value / total) * 100 : 0} tone="blue" label={`${name} share of gross charges`}/>
              </div>))}
            <p className="rd-small">
              Gross charges in the available feed; excludes payments and opening
              balances.
            </p>
          </Panel>
          <Panel title="Large charges · 30 days">
            {s.large_30d.slice(0, 5).map((t, i) => (<div className="rd-line" key={i}>
                <span>
                  {t.payee}
                  <small>{t.date}</small>
                </span>
                <Money value={Math.abs(t.amount)}/>
              </div>))}
            {!s.large_30d.length && <p>No large charges reported.</p>}
          </Panel>
          <Panel title="Needs review">
            <p>
              {reviews.length} transactions in this feed need a category check.
            </p>
            <button className="rd-text-button" onClick={() => {
            reset();
            setMode("Needs fix");
        }}>
              Show transactions
            </button>
          </Panel>
        </aside>
      </div>
    </div>);
}
