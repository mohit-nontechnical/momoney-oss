import Link from "next/link";
import { fmt$ } from "@/lib/format";
import { Amt, AmtText } from "@/components/Amt";
import type { TaskState } from "@/lib/types";
export default function TopOptimizations({ tasks }: {
    tasks: TaskState[];
}) {
    const top = tasks
        .filter((t) => t.status === "todo")
        .sort((a, b) => (b.impact_annual ?? 0) - (a.impact_annual ?? 0))
        .slice(0, 3);
    if (!top.length)
        return null;
    return (<section>
      <h2>Top optimizations</h2>
      <div className="topopt-list">
        {top.map((t) => (<Link key={t.id} href="/backlog" className="topopt-row">
            <span className="topopt-title"><AmtText>{t.title}</AmtText></span>
            <span className="topopt-amt">
              {t.impact_annual != null ? <><Amt>{fmt$(t.impact_annual)}</Amt>/yr</> : "—"}
            </span>
          </Link>))}
      </div>
      <p className="topopt-cta">
        <Link href="/backlog">See the full backlog →</Link>
      </p>
    </section>);
}
