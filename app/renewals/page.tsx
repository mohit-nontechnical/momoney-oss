import { getReceipts, getSnapshot } from "@/lib/data";
import { fmt$$ } from "@/lib/format";
import { AmtText } from "@/components/Amt";
import EmptyState from "@/components/EmptyState";
import { buildRenewalGroups } from "@/lib/renewals";
export const dynamic = "force-dynamic";
export default async function RenewalsPage() {
    const [snapshot, receipts] = await Promise.all([getSnapshot(), getReceipts()]);
    if (!snapshot)
        return <EmptyState />;
    const s = snapshot;
    const groups = buildRenewalGroups(s, receipts);
    const hasAnySource = s.recurring.length || (s.cards ?? []).some((c) => c.annual_fee) || receipts;
    return (<>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-kicker">Renewals · nothing bills unseen</div>
          <div className="page-title">What&apos;s about to charge you.</div>
          <div className="page-sub">
            Bank feeds{receipts ? " + email receipts, merged" : " only — email receipts not connected yet"}.
          </div>
        </div>
      </div>

      {!hasAnySource ? (<section className="empty">
          <h2>No renewal data yet</h2>
          <p className="fn">
            No recurring charges, card fees, or receipts in this snapshot yet — this fills
            in as the pipeline ships each source.
          </p>
        </section>) : (groups.map((g) => (<div key={g.month} className="timeline-group">
            <div className="timeline-month">
              <span className="name" style={{ color: g.month === "Unknown" ? "var(--muted)" : undefined }}>
                {g.month}
              </span>
              <span className="note">
                {g.entries.length} item{g.entries.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="timeline-chips">
              {g.entries.map((e) => (<span key={e.key} className={`timeline-chip${e.severity === "amber" ? " amber" : ""}${e.severity === "rust" ? " rust" : ""}`} data-tip={e.detail}>
                  
                  <AmtText>
                    {e.name}
                    {e.amount != null ? ` ${fmt$$(e.amount)}` : ""}
                  </AmtText>
                </span>))}
            </div>
          </div>)))}

      <div className="fn" style={{ marginTop: 8 }}>
        Rust = act before it bills or flagged by the email scan · amber = a fee decision is
        due · items without a known date sit in Unknown.
      </div>
    </>);
}
