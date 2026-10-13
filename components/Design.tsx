import type { ReactNode } from "react";
import { Amt } from "./Amt";
import { fmt$, fmt$$ } from "@/lib/format";
export function Money({ value, exact = false, }: {
    value: number | null | undefined;
    exact?: boolean;
}) {
    return value == null ? (<span className="rd-muted" title="Not available" aria-label="Not available">
      —
    </span>) : (<Amt>{exact ? fmt$$(value) : fmt$(value)}</Amt>);
}
export function PageHeading({ eyebrow, children, description, }: {
    eyebrow: string;
    children: ReactNode;
    description?: ReactNode;
}) {
    return (<header className="rd-heading">
      <div className="rd-label">{eyebrow}</div>
      <h1>{children}</h1>
      {description && <p>{description}</p>}
    </header>);
}
export function Panel({ title, children, action, className = "", }: {
    title?: string;
    children: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (<section className={`rd-panel ${className}`}>
      {title && (<div className="rd-panel-head">
          <h2>{title}</h2>
          {action}
        </div>)}
      {children}
    </section>);
}
export function Metric({ label, value, note, tone = "", }: {
    label: string;
    value: ReactNode;
    note?: ReactNode;
    tone?: string;
}) {
    return (<div className={`rd-metric ${tone}`}>
      <div className="rd-label">{label}</div>
      <div className="rd-number">{value}</div>
      {note && <p>{note}</p>}
    </div>);
}
export function Track({ percent, marker, tone = "good", label, }: {
    percent: number;
    marker?: number;
    tone?: string;
    label: string;
}) {
    return (<div className="rd-track" role="img" aria-label={label}>
      <span className={tone} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}/>
      {marker != null && (<i style={{ left: `${Math.max(0, Math.min(100, marker))}%` }}/>)}
    </div>);
}
export function Icon({ name }: {
    name: string;
}) {
    const paths: Record<string, string> = {
        home: "M3 10 12 3l9 7M5 9v12h14V9",
        activity: "M4 6h16M4 12h16M4 18h10",
        budgets: "M12 3a9 9 0 1 0 9 9h-9V3Zm3 0v6h6a9 9 0 0 0-6-6Z",
        bills: "M5 5h14v16H5zM8 3v4m8-4v4M5 10h14",
        cards: "M3 5h18v14H3zM3 10h18M6 15h4",
        eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
        more: "M5 5h4v4H5zM15 5h4v4h-4zM5 15h4v4H5zM15 15h4v4h-4z",
    };
    return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] || paths.cards}/>
    </svg>);
}
