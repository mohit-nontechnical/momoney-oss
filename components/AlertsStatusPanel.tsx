import { fmt$ } from "@/lib/format";
import { Amt, AmtText } from "@/components/Amt";
import type { AlertsStatus } from "@/lib/types";
export default function AlertsStatusPanel({ alerts }: {
    alerts?: AlertsStatus;
}) {
    if (!alerts)
        return null;
    const urgent = alerts.pending_urgent > 0;
    const urgentItems = alerts.pending;
    return (<section>
      <h2>Pending alerts</h2>
      <div className="page-stats">
        <div className="page-stat">
          <span className={`n${urgent ? " rust" : ""}`}>{alerts.pending_total}</span>
          <span className="l">pending</span>
        </div>
        <div className="page-stat">
          <span className={`n${urgent ? " rust" : ""}`}>{alerts.pending_urgent}</span>
          <span className="l">urgent</span>
        </div>
        <div className="page-stat">
          <span className={`n${urgent ? " rust" : ""}`} style={{ fontSize: 16 }}>
            {alerts.oldest_pending_date ?? "—"}
          </span>
          <span className="l">oldest pending since</span>
        </div>
      </div>

      <div className={`callout${urgent ? " rust" : ""}`} style={{ marginTop: 10 }}>
        <div className="callout-title">
          {urgent
            ? `${alerts.pending_urgent} urgent alert${alerts.pending_urgent === 1 ? "" : "s"} — needs a look`
            : "Nothing urgent right now"}
        </div>
        <div className="callout-body">
          {!alerts.delivery_configured &&
            "External alert delivery is not configured. "}
          This dashboard doesn&apos;t push notifications; check back here to see new ones.
        </div>
        {urgentItems.length > 0 && (<ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {urgentItems.map((p) => (<li key={p.id} className="fn" style={{ margin: "3px 0" }}>
                <AmtText>{p.title}</AmtText>
                {p.amount != null && (<>
                    {" — "}
                    <Amt>{fmt$(p.amount)}</Amt>
                  </>)}
                {" "}
                (pending since {p.since_date})
              </li>))}
          </ul>)}
      </div>
    </section>);
}
