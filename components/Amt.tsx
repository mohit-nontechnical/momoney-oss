import type { ReactNode } from "react";
const DOTS_SHORT = "••••";
const DOTS_LONG = "•••• •••• ••• •••••• ••••";
export function Amt({ children }: {
    children: ReactNode;
}) {
    return (<span className="amt" data-mask={DOTS_SHORT}>
      {children}
    </span>);
}
export function AmtText({ children }: {
    children: ReactNode;
}) {
    return (<span className="amt" data-mask={DOTS_LONG}>
      {children}
    </span>);
}
