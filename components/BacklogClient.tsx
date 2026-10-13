"use client";
import { useMemo, useState } from "react";
import { fmt$ } from "@/lib/format";
import { Amt, AmtText } from "@/components/Amt";
import type { TaskState, TaskStatus } from "@/lib/types";
const CATEGORY_LABEL: Record<TaskState["category"], string> = {
    cancel: "Cancel",
    negotiate: "Negotiate",
    automate: "Automate",
    review: "Review",
};
const GROUPS: {
    status: TaskStatus;
    label: string;
}[] = [
    { status: "todo", label: "To do" },
    { status: "done", label: "Done" },
    { status: "dismissed", label: "Dismissed" },
];
export default function BacklogClient({ initialTasks }: {
    initialTasks: TaskState[];
}) {
    const [tasks, setTasks] = useState<TaskState[]>(initialTasks);
    const [pending, setPending] = useState<Record<string, boolean>>({});
    const openImpact = useMemo(() => tasks
        .filter((t) => t.status === "todo")
        .reduce((sum, t) => sum + (t.impact_annual ?? 0), 0), [tasks]);
    const openCount = useMemo(() => tasks.filter((t) => t.status === "todo").length, [tasks]);
    async function updateStatus(id: string, status: TaskStatus) {
        const prev = tasks;
        setPending((p) => ({ ...p, [id]: true }));
        setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, status } : t)));
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ id, status }),
            });
            if (!res.ok)
                throw new Error(await res.text());
        }
        catch {
            setTasks(prev);
        }
        finally {
            setPending((p) => ({ ...p, [id]: false }));
        }
    }
    if (!tasks.length) {
        return (<section className="empty">
        <h2>No tasks yet</h2>
        <p className="fn">
          The backlog fills in from an optional analysis import (<code>POST /api/ingest</code>). Nothing
          to work on yet.
        </p>
      </section>);
    }
    return (<>
      <p className="backlog-sum">
        On the table: <b><Amt>{fmt$(openImpact)}</Amt></b>/yr across {openCount} open task
        {openCount === 1 ? "" : "s"}
      </p>

      {GROUPS.map(({ status, label }) => {
            const group = tasks
                .filter((t) => t.status === status)
                .sort((a, b) => (b.impact_annual ?? 0) - (a.impact_annual ?? 0));
            if (!group.length)
                return null;
            return (<div className="backlog-group" key={status}>
            <h2>
              {label} <span className="count">{group.length}</span>
            </h2>
            <div className="task-list">
              {group.map((t) => (<TaskCard key={t.id} task={t} busy={!!pending[t.id]} onUpdate={(s) => updateStatus(t.id, s)}/>))}
            </div>
          </div>);
        })}
    </>);
}
function TaskCard({ task, busy, onUpdate, }: {
    task: TaskState;
    busy: boolean;
    onUpdate: (status: TaskStatus) => void;
}) {
    return (<div className="task-card">
      <div className="task-top">
        <span className="task-title"><AmtText>{task.title}</AmtText></span>
        <span className="task-impact">
          {task.impact_annual != null ? <><Amt>{fmt$(task.impact_annual)}</Amt>/yr</> : "impact unknown"}
        </span>
      </div>
      <div className="task-meta">
        <span className={`badge badge-${task.category}`}>{CATEGORY_LABEL[task.category]}</span>
        {task.delegate && <span className="badge badge-delegate">🤖 delegate</span>}
        <span className="badge badge-status">{task.status}</span>
      </div>
      {task.how && (<details className="task-how">
          <summary>How to execute</summary>
          <p><AmtText>{task.how}</AmtText></p>
        </details>)}
      <div className="task-actions">
        {task.status !== "done" && (<button className="btn btn-done" disabled={busy} onClick={() => onUpdate("done")}>
            Done
          </button>)}
        {task.status !== "dismissed" && (<button className="btn btn-dismiss" disabled={busy} onClick={() => onUpdate("dismissed")}>
            Dismiss
          </button>)}
        {task.status !== "todo" && (<button className="btn btn-reopen" disabled={busy} onClick={() => onUpdate("todo")}>
            Reopen
          </button>)}
      </div>
    </div>);
}
