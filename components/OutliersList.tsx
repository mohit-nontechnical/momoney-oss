"use client";
import { useEffect, useState } from "react";
import { fmt$$ } from "@/lib/format";
import { Amt, AmtText } from "@/components/Amt";
import type { Outlier } from "@/lib/types";
const LS_KEY = "momoney_dismissed_outliers";
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
        localStorage.setItem(LS_KEY, JSON.stringify(ids.slice(-200)));
    }
    catch {
    }
}
export default function OutliersList({ outliers }: {
    outliers?: Outlier[];
}) {
    const all = outliers ?? [];
    const [dismissed, setDismissed] = useState<string[] | null>(null);
    useEffect(() => setDismissed(readDismissed()), []);
    if (outliers === undefined) {
        return (<section className="empty">
        <h2>Outliers</h2>
        <p className="fn">No outlier data in this snapshot yet — ships with the next pipeline run.</p>
      </section>);
    }
    const hidden = new Set(dismissed ?? []);
    const visible = all.filter((o) => !hidden.has(o.id));
    const dismissedCount = all.length - visible.length;
    const dismiss = (id: string) => {
        const next = [...(dismissed ?? []), id];
        setDismissed(next);
        writeDismissed(next);
    };
    const reset = () => {
        setDismissed([]);
        writeDismissed([]);
    };
    return (<section className={visible.length ? "" : "empty"}>
      <h2>Outliers</h2>
      {visible.length === 0 ? (<p className="fn">
          {all.length === 0
                ? "Nothing unusual — every category and merchant is tracking its own baseline."
                : "All outliers dismissed."}
          {dismissedCount > 0 && (<>
              {" "}
              <button type="button" className="linklike" onClick={reset}>
                show {dismissedCount} dismissed
              </button>
            </>)}
        </p>) : (<>
          <div className="topopt-list">
            {visible.map((o) => (<div key={o.id} className="topopt-row" data-tip={o.detail}>
                <span className="topopt-title">
                  <AmtText>{o.title}</AmtText>
                </span>
                <span className="topopt-amt">
                  <Amt>{fmt$$(o.amount)}</Amt>
                  {" "}
                  <span className="fn">
                    vs <Amt>{fmt$$(o.baseline)}</Amt>
                  </span>
                  <button type="button" className="linklike" title="Not an outlier — hide this" aria-label={`Dismiss outlier: ${o.title}`} onClick={() => dismiss(o.id)} style={{ marginLeft: 8 }}>
                    ✕
                  </button>
                </span>
              </div>))}
          </div>
          <p className="fn">
            Baselines are each category&apos;s / merchant&apos;s own median (Mint-style), computed on the
            data source — dismissing hides an outlier on this device only.
            {dismissedCount > 0 && (<>
                {" "}
                <button type="button" className="linklike" onClick={reset}>
                  show {dismissedCount} dismissed
                </button>
              </>)}
          </p>
        </>)}
    </section>);
}
