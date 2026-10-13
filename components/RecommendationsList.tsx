"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fmt$ } from "@/lib/format";
import { Amt, AmtText } from "@/components/Amt";
import type { Recommendation } from "@/lib/recommendations";
const LS_KEY = "momoney_dismissed_recommendations";
const CATEGORY_LABEL: Record<Recommendation["category"], string> = {
    cancel: "Cancel",
    negotiate: "Negotiate",
    automate: "Automate",
    review: "Review",
};
function readDismissed(): string[] {
    try {
        const raw = localStorage.getItem(LS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    }
    catch {
        return [];
    }
}
function writeDismissed(ids: string[]) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(ids.slice(-300)));
    }
    catch {
    }
}
function severityChipClass(severity: Recommendation["severity"]): string {
    if (severity === "rust")
        return "chip chip-rust";
    if (severity === "amber")
        return "chip chip-amber";
    return "chip chip-faint";
}
function Row({ rec, onDismiss }: {
    rec: Recommendation;
    onDismiss: (id: string) => void;
}) {
    return (<div className="task-card" data-tip={rec.reason}>
      <div className="task-top">
        <span className="task-title">
          <AmtText>{rec.title}</AmtText>
        </span>
        <span className="task-impact">
          {rec.dollars_annual != null ? (<>
              <Amt>{fmt$(rec.dollars_annual)}</Amt>/yr
            </>) : ("no figure yet")}
        </span>
      </div>
      <div className="task-meta">
        <span className={`badge badge-${rec.category}`}>{CATEGORY_LABEL[rec.category]}</span>
        <span className={severityChipClass(rec.severity)}>
          {rec.severity === "rust" ? "urgent" : rec.severity === "amber" ? "worth a look" : "minor"}
        </span>
        <span className="badge badge-status">via {rec.source}</span>
      </div>
      <p className="fn" style={{ marginTop: 8, marginBottom: 0 }}>
        <AmtText>{rec.reason}</AmtText>
      </p>
      <div className="task-actions">
        {rec.taskId ? (<Link href="/backlog" className="btn">
            Open in backlog
          </Link>) : rec.href ? (<Link href={rec.href} className="btn">
            See evidence
          </Link>) : null}
        <button type="button" className="btn btn-dismiss" title="Not worth doing — hide this" aria-label={`Dismiss recommendation: ${rec.title}`} onClick={() => onDismiss(rec.id)}>
          Dismiss
        </button>
      </div>
    </div>);
}
export default function RecommendationsList({ recommendations, }: {
    recommendations: Recommendation[];
}) {
    const [dismissed, setDismissed] = useState<string[] | null>(null);
    useEffect(() => setDismissed(readDismissed()), []);
    const hidden = new Set(dismissed ?? []);
    const visible = recommendations.filter((r) => !hidden.has(r.id));
    const dismissedCount = recommendations.length - visible.length;
    const dismiss = (id: string) => {
        const next = [...(dismissed ?? []), id];
        setDismissed(next);
        writeDismissed(next);
    };
    const reset = () => {
        setDismissed([]);
        writeDismissed([]);
    };
    const priced = visible.filter((r) => r.dollars_annual != null);
    const unpriced = visible.filter((r) => r.dollars_annual == null);
    const totalAnnual = priced.reduce((sum, r) => sum + (r.dollars_annual ?? 0), 0);
    if (!recommendations.length) {
        return (<section className="empty">
        <h2>Nothing to recommend right now</h2>
        <p className="fn">
          No open backlog tasks, patterns, card verdicts, recurring charges, or other
          flagged signals in this snapshot. Check back after the next pipeline run.
        </p>
      </section>);
    }
    return (<>
      <p className="backlog-sum">
        <b>
          <Amt>{fmt$(totalAnnual)}</Amt>
        </b>
        /yr in recommendations with a known dollar figure, across {priced.length} item
        {priced.length === 1 ? "" : "s"}
        {unpriced.length > 0 && (<> · {unpriced.length} more with no derivable figure, below</>)}
        {dismissedCount > 0 && (<>
            {" · "}
            <button type="button" className="linklike" onClick={reset}>
              show {dismissedCount} dismissed
            </button>
          </>)}
      </p>

      {priced.length > 0 && (<div className="backlog-group">
          <h2>
            Ranked by annual impact <span className="count">{priced.length}</span>
          </h2>
          <div className="task-list">
            {priced.map((r) => (<Row key={r.id} rec={r} onDismiss={dismiss}/>))}
          </div>
        </div>)}

      {unpriced.length > 0 && (<div className="backlog-group">
          <h2>
            No dollar figure yet <span className="count">{unpriced.length}</span>
          </h2>
          <p className="fn">
            Real signals without a derivable annual number — showing one here instead of
            guessing would be worse than showing none.
          </p>
          <div className="task-list">
            {unpriced.map((r) => (<Row key={r.id} rec={r} onDismiss={dismiss}/>))}
          </div>
        </div>)}

      {visible.length === 0 && (<section className="empty">
          <h2>All caught up</h2>
          <p className="fn">
            Every recommendation is dismissed.{" "}
            {dismissedCount > 0 && (<button type="button" className="linklike" onClick={reset}>
                show {dismissedCount} dismissed
              </button>)}
          </p>
        </section>)}
    </>);
}
